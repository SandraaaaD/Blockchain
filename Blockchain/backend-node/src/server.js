import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool, initDb, useRealPostgres } from './db.js';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const JWT_SECRET = process.env.JWT_SECRET || 'escrow_dev_secret_change_me';
const PORT = Number(process.env.PORT) || 8081;

try {
  await initDb();
} catch (err) {
  console.error('[DB] Init failed:', err.message);
  if (useRealPostgres) {
    console.error(`
PostgreSQL mode (USE_REAL_POSTGRES=true). Fix backend-node/.env, e.g.:

  PGHOST=127.0.0.1
  PGPORT=5432
  PGUSER=postgres
  PGPASSWORD=your_password
  PGDATABASE=escrow_db

Or remove USE_REAL_POSTGRES to use embedded pg-mem (no PostgreSQL install).
`);
  }
  process.exit(1);
}
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const uploadDisk = multer({ dest: UPLOAD_ROOT });

const app = express();
const isProd = process.env.NODE_ENV === 'production';
app.use(
  cors({
    /** Во dev: рефлектиран Origin (избегнува CORS → axios „Network Error“). */
    origin: isProd
      ? (origin, callback) => {
          if (!origin) return callback(null, true);
          const ok =
            /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
            origin === 'http://localhost:3000';
          callback(null, ok);
        }
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_ROOT));

/** --- Helpers --- */

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url || undefined,
  };
}

async function milestoneWithExtra(milestoneId) {
  const m = (await pool.query(`SELECT * FROM milestones WHERE id = $1`, [milestoneId]))
    .rows[0];
  if (!m) return null;

  const acceptanceCriteria = (
    await pool.query(
      `SELECT description FROM acceptance_criteria WHERE milestone_id = $1 ORDER BY id`,
      [milestoneId]
    )
  ).rows.map((r) => r.description);

  const sub = (
    await pool.query(`SELECT * FROM milestone_submissions WHERE milestone_id = $1`, [
      milestoneId,
    ])
  ).rows[0];

  let submission;
  if (sub) {
    const urls = sub.file_urls;
    submission = {
      id: sub.id,
      githubRepo: sub.github_repo || undefined,
      demoLink: sub.demo_link || undefined,
      notes: sub.notes || undefined,
      fileUrls:
        urls == null
          ? []
          : typeof urls === 'string'
            ? JSON.parse(urls)
            : Array.isArray(urls)
              ? urls
              : urls,
      submittedAt: sub.submitted_at,
    };
  }

  return {
    id: m.id,
    title: m.title,
    description: m.description || undefined,
    amount: Number(m.amount),
    orderIndex: m.order_index,
    status: m.status,
    acceptanceCriteria,
    submission,
    aiFeedback: m.ai_feedback || undefined,
    createdAt: m.created_at,
  };
}

async function buildProjectPayload(projectRow) {
  const devRow = (await pool.query(`SELECT * FROM users WHERE id = $1`, [projectRow.developer_id]))
    .rows[0];
  let clientRow = null;
  if (projectRow.client_id) {
    clientRow = (await pool.query(`SELECT * FROM users WHERE id = $1`, [projectRow.client_id]))
      .rows[0];
  }

  const requirements = (
    await pool.query(`SELECT description FROM requirements WHERE project_id = $1 ORDER BY id`, [
      projectRow.id,
    ])
  ).rows.map((r) => r.description);

  const mIds = (
    await pool.query(
      `SELECT id FROM milestones WHERE project_id = $1 ORDER BY order_index ASC, id ASC`,
      [projectRow.id]
    )
  ).rows;

  const milestones = [];
  for (const { id } of mIds) {
    milestones.push(await milestoneWithExtra(id));
  }

  return {
    id: projectRow.id,
    title: projectRow.title,
    description: projectRow.description || undefined,
    budget: Number(projectRow.budget),
    deadlineDays: projectRow.deadline_days ?? undefined,
    status: projectRow.status,
    developer: mapUser(devRow),
    client: clientRow ? mapUser(clientRow) : undefined,
    clientEmail: projectRow.client_email,
    milestones,
    requirements,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at,
  };
}

function authMiddle(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(hdr.slice(7), JWT_SECRET);
    req.userId = Number(decoded.sub);
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function loadUser(userId) {
  return (await pool.query(`SELECT * FROM users WHERE id = $1`, [userId])).rows[0];
}

function mintToken(userRow) {
  return jwt.sign(
    { email: userRow.email, role: userRow.role },
    JWT_SECRET,
    { subject: String(userRow.id), expiresIn: '7d' }
  );
}

async function setMilestoneStatus(milestoneId, status, aiFeedback = null) {
  await pool.query(
    `UPDATE milestones SET status = $1, ai_feedback = COALESCE($2, ai_feedback), updated_at = NOW() WHERE id = $3`,
    [status, aiFeedback, milestoneId]
  );
}

/** Submit е дозволен само за IN_PROGRESS — вклучи го првиот PENDING кога има работен ред без друг „активен“ milestone. */
async function activateFirstPendingMilestoneIfNeeded(projectId) {
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [projectId])).rows[0];
  if (!p) return;
  if (!['ACTIVE', 'FUNDED', 'IN_PROGRESS'].includes(p.status)) return;

  const blocking = (
    await pool.query(
      `SELECT 1 FROM milestones WHERE project_id = $1 AND status IN (
        'IN_PROGRESS','SUBMITTED','AI_REVIEW','AI_REJECTED','CLIENT_APPROVED','AI_APPROVED'
      ) LIMIT 1`,
      [projectId]
    )
  ).rowCount;

  if (blocking > 0) return;

  await pool.query(
    `UPDATE milestones SET status = 'IN_PROGRESS', updated_at = NOW() WHERE project_id = $1 AND id = (
       SELECT id FROM milestones WHERE project_id = $1 AND status = 'PENDING'
       ORDER BY order_index ASC, id ASC LIMIT 1
     )`,
    [projectId]
  );
}

/** После клиентско / AI одобрување: milestone завршен, активира се следниот или проект COMPLETED */
async function finalizeReleasedMilestone(milestoneId) {
  const row = (await pool.query(`SELECT project_id FROM milestones WHERE id = $1`, [milestoneId]))
    .rows[0];
  if (!row) return;
  const projectId = row.project_id;

  await pool.query(
    `UPDATE milestones SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
    [milestoneId]
  );

  const nextPending = (
    await pool.query(
      `SELECT id FROM milestones WHERE project_id = $1 AND status = 'PENDING' ORDER BY order_index ASC, id ASC LIMIT 1`,
      [projectId]
    )
  ).rows[0];

  if (nextPending) {
    await pool.query(`UPDATE milestones SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`, [
      nextPending.id,
    ]);
    await pool.query(
      `UPDATE projects SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1 AND status IN ('FUNDED','ACTIVE')`,
      [projectId]
    );
  }

  const stillNotDone = (
    await pool.query(
      `SELECT COUNT(*)::int AS c FROM milestones WHERE project_id = $1 AND status <> 'COMPLETED'`,
      [projectId]
    )
  ).rows[0].c;

  if (stillNotDone === 0 && projectId) {
    await pool.query(`UPDATE projects SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`, [
      projectId,
    ]);
    const pr = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [projectId])).rows[0];
    const pname = pr.title || `Project #${projectId}`;
    await notifyUser(pr.developer_id, {
      category: 'PROJECT_COMPLETED',
      title: 'Project completed',
      body: `All milestones are finished. "${pname}" is marked complete.`,
      projectId,
    });
    await notifyUsers(await clientRecipientIds(pr), {
      category: 'PROJECT_COMPLETED',
      title: 'Project completed',
      body: `All milestones are finished. "${pname}" is marked complete.`,
      projectId,
    });
  }
}

function canAccessProject(projectRow, user) {
  if (!user) return false;
  if (projectRow.developer_id === user.id) return true;
  if (projectRow.client_id === user.id) return true;
  if (
    user.role === 'CLIENT' &&
    projectRow.client_email?.toLowerCase() === user.email?.toLowerCase()
  )
    return true;
  return false;
}

async function projectTitle(projectId) {
  const row = (
    await pool.query(`SELECT title FROM projects WHERE id = $1`, [projectId])
  ).rows[0];
  return row?.title || `Project #${projectId}`;
}

async function clientRecipientIds(projectRow) {
  const ids = [];
  if (projectRow.client_id) ids.push(projectRow.client_id);
  else if (projectRow.client_email) {
    const row = (
      await pool.query(`SELECT id FROM users WHERE lower(email) = lower($1)`, [
        projectRow.client_email,
      ])
    ).rows[0];
    if (row) ids.push(row.id);
  }
  return [...new Set(ids)];
}

async function notifyUser(userId, { category, title, body, projectId }) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (user_id, category, title, body, project_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, category, title, body, projectId ?? null]
  );
}

async function notifyUsers(userIds, payload) {
  const seen = new Set();
  for (const uid of userIds) {
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    await notifyUser(uid, payload);
  }
}

/** --- Routes: auth --- */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body || {};
    if (!email || !password || !fullName || !role)
      return res.status(400).json({ message: 'Missing fields' });
    const exists = (
      await pool.query(`SELECT 1 FROM users WHERE lower(email)=lower($1)`, [email])
    ).rows[0];
    if (exists) return res.status(400).json({ message: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const ins = (
      await pool.query(
        `INSERT INTO users (email, password, full_name, role) VALUES ($1,$2,$3,$4) RETURNING *`,
        [email.toLowerCase(), hash, fullName, role]
      )
    ).rows[0];
    const token = mintToken(ins);
    res.json({
      token,
      userId: ins.id,
      email: ins.email,
      fullName: ins.full_name,
      role: ins.role,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    const row = (
      await pool.query(`SELECT * FROM users WHERE lower(email)=lower($1)`, [email])
    ).rows[0];
    if (!row || !(await bcrypt.compare(password, row.password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = mintToken(row);
    res.json({
      token,
      userId: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/me', authMiddle, async (req, res) => {
  const row = await loadUser(req.userId);
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json(mapUser(row));
});

app.post('/api/projects', authMiddle, async (req, res) => {
  try {
    const user = await loadUser(req.userId);
    if (!user || user.role !== 'DEVELOPER')
      return res.status(403).json({ message: 'Developers only' });
    const { title, description, budget, deadlineDays, clientEmail } = req.body || {};
    if (!title || budget == null || !clientEmail)
      return res.status(400).json({ message: 'Missing fields' });
    const clientMatch = (
      await pool.query(`SELECT id FROM users WHERE lower(email)=lower($1)`, [clientEmail])
    ).rows[0];
    const ins = (
      await pool.query(
        `INSERT INTO projects (title,description,budget,deadline_days,status,developer_id,client_id,client_email)
         VALUES ($1,$2,$3,$4,'PENDING_CLIENT',$5,$6,$7) RETURNING *`,
        [
          title,
          description || null,
          budget,
          deadlineDays ?? null,
          user.id,
          clientMatch?.id ?? null,
          clientEmail,
        ]
      )
    ).rows[0];
    if (clientMatch?.id) {
      await notifyUser(clientMatch.id, {
        category: 'PROJECT_INVITE',
        title: 'Project invitation',
        body: `${user.full_name} invited you to "${title}" (${Number(budget).toLocaleString()} USDC). Open the project to accept or decline.`,
        projectId: ins.id,
      });
    }
    res.json(await buildProjectPayload(ins));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/projects', authMiddle, async (req, res) => {
  const user = await loadUser(req.userId);
  let rows = [];
  if (user.role === 'DEVELOPER') {
    rows = (await pool.query(`SELECT * FROM projects WHERE developer_id = $1 ORDER BY id DESC`, [user.id]))
      .rows;
  } else {
    rows = (
      await pool.query(
        `SELECT * FROM projects WHERE client_id = $1 OR lower(client_email) = lower($2) ORDER BY id DESC`,
        [user.id, user.email]
      )
    ).rows;
  }
  const out = [];
  for (const r of rows) out.push(await buildProjectPayload(r));
  res.json(out);
});

app.get('/api/projects/:id', authMiddle, async (req, res) => {
  const pid = Number(req.params.id);
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  const user = await loadUser(req.userId);
  if (!canAccessProject(p, user)) return res.status(403).json({ message: 'Forbidden' });
  if (user.role === 'DEVELOPER' && p.developer_id === user.id)
    await activateFirstPendingMilestoneIfNeeded(pid);
  res.json(await buildProjectPayload(p));
});

app.post('/api/projects/:id/respond', authMiddle, async (req, res) => {
  const accept = String(req.query.accept) === 'true';
  const pid = Number(req.params.id);
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  const user = await loadUser(req.userId);
  if (user.role !== 'CLIENT' || p.client_email?.toLowerCase() !== user.email?.toLowerCase()) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (!accept) {
    const declined = (
      await pool.query(
        `UPDATE projects SET client_id = NULL, status = 'DECLINED', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [pid]
      )
    ).rows[0];
    await notifyUser(declined.developer_id, {
      category: 'PROJECT_DECLINED',
      title: 'Invitation declined',
      body: `${user.full_name} declined the invitation for "${await projectTitle(pid)}".`,
      projectId: pid,
    });
    return res.json(await buildProjectPayload(declined));
  }

  const fresh = (
    await pool.query(
      `UPDATE projects SET client_id = $2, status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [pid, user.id]
    )
  ).rows[0];
  await activateFirstPendingMilestoneIfNeeded(pid);
  await notifyUser(fresh.developer_id, {
    category: 'PROJECT_ACCEPTED',
    title: 'Project accepted',
    body: `${user.full_name} accepted the invitation to "${await projectTitle(pid)}". The project is now active.`,
    projectId: pid,
  });
  res.json(await buildProjectPayload(fresh));
});

app.put('/api/projects/:id/requirements', authMiddle, async (req, res) => {
  const pid = Number(req.params.id);
  const arr = req.body;
  if (!Array.isArray(arr)) return res.status(400).json({ message: 'Body must be string[]' });
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  const user = await loadUser(req.userId);
  if (user.role !== 'DEVELOPER' || p.developer_id !== user.id)
    return res.status(403).json({ message: 'Forbidden' });
  await pool.query(`DELETE FROM requirements WHERE project_id = $1`, [pid]);
  for (const d of arr) {
    await pool.query(`INSERT INTO requirements (project_id, description) VALUES ($1,$2)`, [
      pid,
      String(d),
    ]);
  }
  const row = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  const receivers = await clientRecipientIds(row);
  await notifyUsers(receivers, {
    category: 'REQUIREMENTS_UPDATED',
    title: 'Requirements updated',
    body: `${user.full_name} updated the requirements list on "${await projectTitle(pid)}".`,
    projectId: pid,
  });
  res.json(await buildProjectPayload(row));
});

app.post('/api/projects/:id/milestones', authMiddle, async (req, res) => {
  const pid = Number(req.params.id);
  const body = req.body || {};
  const { title, description, amount, acceptanceCriteria } = body;
  if (!title || amount == null)
    return res.status(400).json({ message: 'title and amount required' });
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  const user = await loadUser(req.userId);
  if (user.role !== 'DEVELOPER' || p.developer_id !== user.id)
    return res.status(403).json({ message: 'Forbidden' });
  const okStatus = ['ACTIVE', 'FUNDED', 'IN_PROGRESS', 'COMPLETED', 'PENDING_CLIENT'];
  if (!okStatus.includes(p.status))
    return res.status(400).json({ message: 'Cannot add milestones in this status' });
  const cnt = (await pool.query(`SELECT COUNT(*)::int AS c FROM milestones WHERE project_id=$1`, [pid]))
    .rows[0].c;
  const orderIndex = cnt + 1;
  const m = (
    await pool.query(
      `INSERT INTO milestones (project_id,title,description,amount,order_index,status)
       VALUES ($1,$2,$3,$4,$5,'PENDING') RETURNING id`,
      [pid, title, description || null, amount, orderIndex]
    )
  ).rows[0];
  const crs = acceptanceCriteria || [];
  for (const desc of crs) {
    await pool.query(
      `INSERT INTO acceptance_criteria (milestone_id, description) VALUES ($1,$2)`,
      [m.id, String(desc)]
    );
  }
  await activateFirstPendingMilestoneIfNeeded(pid);
  const receivers = await clientRecipientIds(p);
  const pname = await projectTitle(pid);
  await notifyUsers(receivers, {
    category: 'MILESTONE_ADDED',
    title: 'New milestone added',
    body: `${user.full_name} added milestone "${title}" ($${Number(amount).toLocaleString()} USDC) on "${pname}".`,
    projectId: pid,
  });
  res.json(await milestoneWithExtra(m.id));
});

/** Submit multipart "data" (JSON Blob) + "files" */
app.post('/api/projects/milestones/:milestoneId/submit', authMiddle, uploadDisk.any(), async (req, res) => {
  try {
    const mid = Number(req.params.milestoneId);
    let data = {};
    const dataPart = req.files?.find((f) => f.fieldname === 'data');
    if (dataPart) {
      const raw = fs.readFileSync(dataPart.path, 'utf8');
      fs.unlinkSync(dataPart.path);
      data = JSON.parse(raw);
    } else if (req.body?.data) {
      data =
        typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    }
    const milestone = (await pool.query(`SELECT * FROM milestones WHERE id = $1`, [mid])).rows[0];
    if (!milestone) return res.status(404).json({ message: 'Not found' });
    const proj = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [milestone.project_id]))
      .rows[0];
    const user = await loadUser(req.userId);
    if (user.role !== 'DEVELOPER' || proj.developer_id !== user.id)
      return res.status(403).json({ message: 'Forbidden' });
    if (!['IN_PROGRESS', 'AI_REJECTED'].includes(milestone.status))
      return res.status(400).json({ message: 'Milestone cannot be submitted in current status' });
    if (!['ACTIVE', 'FUNDED', 'IN_PROGRESS'].includes(proj.status))
      return res.status(400).json({ message: 'Project is not accepting milestone submissions yet' });

    const fileUrls = [];
    for (const f of req.files || []) {
      if (f.fieldname !== 'files') continue;
      const ext = path.extname(f.originalname || '') || '';
      const newName = `f_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const dest = path.join(UPLOAD_ROOT, newName);
      fs.renameSync(f.path, dest);
      fileUrls.push(`/uploads/${newName}`);
    }

    await pool.query(`DELETE FROM milestone_submissions WHERE milestone_id = $1`, [mid]);
    await pool.query(
      `INSERT INTO milestone_submissions (milestone_id, github_repo, demo_link, notes, file_urls)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        mid,
        data.githubRepo || null,
        data.demoLink || null,
        data.notes || null,
        JSON.stringify(fileUrls),
      ]
    );
    await pool.query(`UPDATE milestones SET status = 'SUBMITTED', updated_at = NOW() WHERE id = $1`, [
      mid,
    ]);

    const receivers = await clientRecipientIds(proj);
    const pname = await projectTitle(proj.id);
    await notifyUsers(receivers, {
      category: 'MILESTONE_SUBMITTED',
      title: 'Milestone submitted for review',
      body: `${user.full_name} submitted milestone "${milestone.title}" on "${pname}" for your review.`,
      projectId: proj.id,
    });

    res.json(await milestoneWithExtra(mid));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects/milestones/:milestoneId/review', authMiddle, async (req, res) => {
  const approved = String(req.query.approved) === 'true';
  const feedback = req.query.feedback || '';
  const mid = Number(req.params.milestoneId);
  const milestone = (await pool.query(`SELECT * FROM milestones WHERE id = $1`, [mid])).rows[0];
  if (!milestone) return res.status(404).json({ message: 'Not found' });
  const proj = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [milestone.project_id]))
    .rows[0];
  const user = await loadUser(req.userId);
  if (user.role !== 'CLIENT' || proj.client_id !== user.id)
    return res.status(403).json({ message: 'Forbidden' });

  const pname = await projectTitle(proj.id);

  if (approved) {
    await pool.query(`UPDATE milestones SET status = 'CLIENT_APPROVED', updated_at = NOW() WHERE id = $1`, [
      mid,
    ]);
    await finalizeReleasedMilestone(mid);
    await notifyUser(proj.developer_id, {
      category: 'MILESTONE_CLIENT_APPROVED',
      title: 'Milestone approved by client',
      body: `${user.full_name} approved "${milestone.title}" on "${pname}". The next milestone activates automatically when applicable.`,
      projectId: proj.id,
    });
  } else {
    await setMilestoneStatus(mid, 'AI_REVIEW', feedback || null);
    await notifyUser(proj.developer_id, {
      category: 'MILESTONE_CLIENT_REJECTED',
      title: 'Milestone revision requested',
      body: `${user.full_name} did not approve "${milestone.title}" on "${pname}".${feedback ? ' Note: ' + String(feedback).slice(0, 500) : ''}`,
      projectId: proj.id,
    });
  }
  res.json(await milestoneWithExtra(mid));
});

app.post('/api/projects/milestones/:milestoneId/ai-decision', async (req, res) => {
  const approved = String(req.query.approved) === 'true';
  const feedback = req.query.feedback || '';
  const mid = Number(req.params.milestoneId);
  const milestone = (await pool.query(`SELECT * FROM milestones WHERE id = $1`, [mid])).rows[0];
  if (!milestone) return res.status(404).json({ message: 'Not found' });
  const proj = (
    await pool.query(`SELECT * FROM projects WHERE id = $1`, [milestone.project_id])
  ).rows[0];
  const pname = await projectTitle(proj.id);
  if (approved) {
    await pool.query(`UPDATE milestones SET status = 'AI_APPROVED', updated_at = NOW() WHERE id = $1`, [mid]);
    await finalizeReleasedMilestone(mid);
    await notifyUser(proj.developer_id, {
      category: 'MILESTONE_AI_APPROVED',
      title: 'Milestone verified (automated)',
      body: '"' + milestone.title + '" on "' + pname + '" passed automated verification.',
      projectId: proj.id,
    });
  } else {
    await setMilestoneStatus(mid, 'AI_REJECTED', feedback || '');
    await notifyUser(proj.developer_id, {
      category: 'MILESTONE_AI_REJECTED',
      title: 'Milestone needs resubmission',
      body:
        '"' +
        milestone.title +
        '" on "' +
        pname +
        '" was rejected.' +
        (feedback ? ' Feedback: ' + String(feedback).slice(0, 500) : ''),
      projectId: proj.id,
    });
  }
  res.json(await milestoneWithExtra(mid));
});

app.post('/api/projects/:id/fund', authMiddle, async (req, res) => {
  const pid = Number(req.params.id);
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  const user = await loadUser(req.userId);
  if (user.role !== 'CLIENT' || p.client_id !== user.id)
    return res.status(403).json({ message: 'Forbidden' });
  await pool.query(`UPDATE projects SET status = 'FUNDED', updated_at = NOW() WHERE id = $1`, [pid]);
  await pool.query(
    `UPDATE milestones SET status = 'IN_PROGRESS', updated_at = NOW() WHERE project_id = $1
     AND id = (SELECT id FROM milestones WHERE project_id = $1 ORDER BY order_index ASC, id ASC LIMIT 1)`,
    [pid]
  );
  await activateFirstPendingMilestoneIfNeeded(pid);
  const fresh = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  await notifyUser(p.developer_id, {
    category: 'ESCROW_FUNDED',
    title: 'Escrow funded',
    body: `${user.full_name} marked escrow as funded on "${await projectTitle(pid)}". You can continue milestones.`,
    projectId: pid,
  });
  res.json(await buildProjectPayload(fresh));
});

app.post('/api/projects/:id/reviews', authMiddle, async (req, res) => {
  const pid = Number(req.params.id);
  const { rating, comment } = req.body || {};
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: 'rating 1–5 required' });
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [pid])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  if (p.status !== 'COMPLETED')
    return res.status(400).json({ message: 'Project not completed yet' });
  const user = await loadUser(req.userId);
  if (!(p.developer_id === user.id || p.client_id === user.id))
    return res.status(403).json({ message: 'Forbidden' });
  try {
    await pool.query(
      `INSERT INTO reviews (project_id, reviewer_id, rating, comment) VALUES ($1,$2,$3,$4)`,
      [pid, user.id, rating, comment || null]
    );
  } catch {
    return res.status(400).json({ message: 'Review already submitted' });
  }
  const counterpartId =
    Number(user.id) === Number(p.developer_id) ? p.client_id : p.developer_id;
  if (counterpartId) {
    await notifyUser(counterpartId, {
      category: 'STAR_REVIEW_RECEIVED',
      title: 'New project rating',
      body: `${user.full_name} rated "${await projectTitle(pid)}" ${rating}/5 stars.${comment ? ' Comment: ' + String(comment).slice(0, 400) : ''}`,
      projectId: pid,
    });
  }
  res.json({ message: 'Review submitted' });
});

app.get('/api/projects/:projectId/messages', authMiddle, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [projectId])).rows[0];
  if (!p) return res.status(404).json({ message: 'Not found' });
  const user = await loadUser(req.userId);
  const inviteeOk =
    user.role === 'CLIENT' && p.client_email?.toLowerCase() === user.email?.toLowerCase();
  if (
    !(p.developer_id === user.id || p.client_id === user.id || inviteeOk)
  )
    return res.status(403).json({ message: 'Forbidden' });

  const rows = (
    await pool.query(
      `SELECT m.*, u.id AS uid, u.email, u.full_name, u.role, u.avatar_url
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.project_id = $1 ORDER BY m.created_at ASC`,
      [projectId]
    )
  ).rows;

  res.json(
    rows.map((r) => ({
      id: r.id,
      projectId,
      sender: mapUser({
        id: r.uid,
        email: r.email,
        full_name: r.full_name,
        role: r.role,
        avatar_url: r.avatar_url,
      }),
      content: r.content,
      fileUrl: r.file_url || undefined,
      fileName: r.file_name || undefined,
      createdAt: r.created_at,
    }))
  );
});

app.post('/api/projects/:projectId/messages', authMiddle, uploadDisk.single('file'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const content = req.body?.content ?? '';
    const p = (await pool.query(`SELECT * FROM projects WHERE id = $1`, [projectId])).rows[0];
    if (!p) return res.status(404).json({ message: 'Not found' });
    const user = await loadUser(req.userId);
    const inviteeOk =
      user.role === 'CLIENT' && p.client_email?.toLowerCase() === user.email?.toLowerCase();
    if (!(p.developer_id === user.id || p.client_id === user.id || inviteeOk))
      return res.status(403).json({ message: 'Forbidden' });

    let fileUrl;
    let fileName;
    if (req.file) {
      const ext = path.extname(req.file.originalname || '') || '';
      const newName = `m_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const dest = path.join(UPLOAD_ROOT, newName);
      fs.renameSync(req.file.path, dest);
      fileUrl = `/uploads/${newName}`;
      fileName = req.file.originalname;
    }

    const ins = (
      await pool.query(
        `INSERT INTO messages (project_id, sender_id, content, file_url, file_name)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [projectId, user.id, content, fileUrl || null, fileName || null]
      )
    ).rows[0];

    const receivers = [];
    if (Number(user.id) === Number(p.developer_id))
      receivers.push(...(await clientRecipientIds(p)));
    else receivers.push(p.developer_id);

    const text = String(content || '').trim();
    const preview = text
      ? text.slice(0, 280)
      : fileName
        ? `[File: ${String(fileName).slice(0, 120)}]`
        : fileUrl
          ? '[Attachment]'
          : '[New message]';
    await notifyUsers(
      receivers.filter((rid) => rid != null && Number(rid) !== Number(user.id)),
      {
        category: 'CHAT_MESSAGE',
        title: 'Chat message',
        body: `${user.full_name} in "${await projectTitle(projectId)}": ${preview}`,
        projectId,
      }
    );

    res.json({
      id: ins.id,
      projectId,
      sender: mapUser(user),
      content: ins.content,
      fileUrl: ins.file_url || undefined,
      fileName: ins.file_name || undefined,
      createdAt: ins.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/notifications', authMiddle, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 80, 1), 200);
  const list = (
    await pool.query(
      `SELECT id, category, title, body, project_id AS "projectId",
              read_at AS "readAt", created_at AS "createdAt"
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.userId, limit]
    )
  ).rows;
  const unread = (
    await pool.query(`SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [
      req.userId,
    ])
  ).rows[0].c;
  res.json({
    unreadCount: unread,
    notifications: list.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      body: r.body,
      projectId: r.projectId ?? undefined,
      read: r.readAt != null,
      createdAt: r.createdAt,
    })),
  });
});

app.patch('/api/notifications/:nid/read', authMiddle, async (req, res) => {
  const nid = Number(req.params.nid);
  const updated = (
    await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING id`,
      [nid, req.userId]
    )
  ).rows[0];
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

app.post('/api/notifications/read-all', authMiddle, async (req, res) => {
  await pool.query(`UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`, [
    req.userId,
  ]);
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Escrow API (Node) http://localhost:${PORT} или http://127.0.0.1:${PORT}`);
});
