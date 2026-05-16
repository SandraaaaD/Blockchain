import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { newDb } from 'pg-mem';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function trim(v) {
  if (v == null) return '';
  return String(v).replace(/\r/g, '').trim();
}

/** Set `USE_REAL_POSTGRES=true` only if you run a real PostgreSQL server. */
export const useRealPostgres = trim(process.env.USE_REAL_POSTGRES) === 'true';

const DATABASE_URL_RAW = trim(process.env.DATABASE_URL);
const DATABASE_URL = DATABASE_URL_RAW;

const PGUSER = trim(process.env.PGUSER) || 'postgres';
const PGPASSWORD =
  trim(process.env.PGPASSWORD) !== '' ? trim(process.env.PGPASSWORD) : null;
const PGHOST = trim(process.env.PGHOST) || '127.0.0.1';
const PGPORT = Number(trim(process.env.PGPORT) || '5432');
const PGDATABASE = trim(process.env.PGDATABASE) || 'escrow_db';

const useObjectConfig = PGPASSWORD != null || !DATABASE_URL;

let pool;

if (useRealPostgres) {
  pool = useObjectConfig
    ? new pg.Pool({
        host: PGHOST,
        port: PGPORT,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD ?? 'postgres',
      })
    : new pg.Pool({ connectionString: DATABASE_URL });
  console.log('[DB] PostgreSQL (USE_REAL_POSTGRES=true)');
} else {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  pool = new Pool();
  console.log('[DB] Embedded pg-mem — no install. Data resets when the server stops.');
}

/** NUMERIC instead of DECIMAL(18,2) so pg-mem accepts the schema; PostgreSQL is fine with it too. */
const SCHEMA_SQL = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        budget NUMERIC NOT NULL,
        deadline_days INT,
        status VARCHAR(40) NOT NULL DEFAULT 'PENDING_CLIENT',
        developer_id INT REFERENCES users(id) NOT NULL,
        client_id INT REFERENCES users(id),
        client_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        amount NUMERIC NOT NULL,
        order_index INT,
        status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
        ai_feedback TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS acceptance_criteria (
        id SERIAL PRIMARY KEY,
        milestone_id INT REFERENCES milestones(id) ON DELETE CASCADE,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS requirements (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS milestone_submissions (
        id SERIAL PRIMARY KEY,
        milestone_id INT UNIQUE REFERENCES milestones(id) ON DELETE CASCADE,
        github_repo TEXT,
        demo_link TEXT,
        notes TEXT,
        file_urls JSONB DEFAULT '[]'::jsonb,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        sender_id INT REFERENCES users(id) NOT NULL,
        content TEXT NOT NULL,
        file_url TEXT,
        file_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        reviewer_id INT REFERENCES users(id) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (project_id, reviewer_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(48) NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
`;

const LEGACY_COLUMN_FIX_SQL = `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
        ) THEN
          ALTER TABLE users RENAME COLUMN password_hash TO password;
        END IF;
      END $$;
`;

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    if (useRealPostgres) {
      await client.query(LEGACY_COLUMN_FIX_SQL);
    }
  } finally {
    client.release();
  }
}

export { pool };
