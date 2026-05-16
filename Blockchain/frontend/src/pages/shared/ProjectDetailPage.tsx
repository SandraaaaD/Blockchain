import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getProjectApi, respondToProjectApi, updateRequirementsApi,
  addMilestoneApi, markFundedApi, addReviewApi,
} from '../../api/projects';
import type { Project, Milestone } from '../../types';
import {
  milestonesAwaitingClientReview,
  milestonesInProgress,
  sortMilestonesForDisplay,
} from '../../utils/milestoneFlow';
import Layout from '../../components/Layout';
import { ProjectStatusBadge, MilestoneStatusBadge } from '../../components/StatusBadge';
import ChatPanel from './ChatPanel';
import MilestoneSubmitModal from './MilestoneSubmitModal';
import MilestoneReviewModal from './MilestoneReviewModal';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, CheckCircle, XCircle,
  MessageSquare, ListChecks, Layers, Star, Wallet,
  Send, ClipboardCheck,
} from 'lucide-react';

type Tab = 'overview' | 'chat' | 'requirements' | 'milestones' | 'review';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Requirements state
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newReq, setNewReq] = useState('');
  const [savingReqs, setSavingReqs] = useState(false);

  // Milestone creation
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '', description: '', amount: '', criteria: '' as string,
  });
  const [criteriaList, setCriteriaList] = useState<string[]>([]);

  // Modals
  const [submitMilestone, setSubmitMilestone] = useState<Milestone | null>(null);
  const [reviewMilestone, setReviewMilestone] = useState<Milestone | null>(null);

  // Review
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const projectId = parseInt(id!);
  const isDeveloper = user?.role === 'DEVELOPER';
  const isClient = user?.role === 'CLIENT';

  const loadProject = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const p = await getProjectApi(projectId);
      setProject(p);
      setRequirements(p.requirements || []);
    } catch {
      if (!silent) {
        toast.error('Project not found');
        navigate(-1);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    void loadProject(false);
  }, [id, loadProject]);

  useEffect(() => {
    const iv = window.setInterval(() => void loadProject(true), 15000);
    return () => window.clearInterval(iv);
  }, [loadProject]);

  const handleRespond = async (accept: boolean) => {
    try {
      const updated = await respondToProjectApi(projectId, accept);
      setProject(updated);
      toast.success(accept ? 'Project accepted!' : 'Project declined');
    } catch {
      toast.error('Failed to respond');
    }
  };

  const handleSaveRequirements = async () => {
    setSavingReqs(true);
    try {
      const updated = await updateRequirementsApi(projectId, requirements);
      setProject(updated);
      toast.success('Requirements saved!');
    } catch {
      toast.error('Failed to save requirements');
    } finally {
      setSavingReqs(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMilestoneApi(projectId, {
        title: milestoneForm.title,
        description: milestoneForm.description,
        amount: parseFloat(milestoneForm.amount),
        acceptanceCriteria: criteriaList,
      });
      await loadProject();
      setShowMilestoneForm(false);
      setMilestoneForm({ title: '', description: '', amount: '', criteria: '' });
      setCriteriaList([]);
      toast.success('Milestone added!');
    } catch {
      toast.error('Failed to add milestone');
    }
  };

  const handleFundEscrow = async () => {
    try {
      const updated = await markFundedApi(projectId);
      setProject(updated);
      toast.success('Escrow funded! Developer can now start working.');
    } catch {
      toast.error('Failed to fund escrow');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await addReviewApi(projectId, reviewForm);
      toast.success('Review submitted!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-slate-500">Loading project...</div>
      </Layout>
    );
  }

  if (!project) return null;

  const awaitingClient = milestonesAwaitingClientReview(project);
  const activeForDev = milestonesInProgress(project);
  const sortedMilestones = sortMilestonesForDisplay(project.milestones);

  const completedMilestones = project.milestones.filter(
    (m) => ['COMPLETED', 'CLIENT_APPROVED', 'AI_APPROVED'].includes(m.status)
  ).length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Layers size={16} /> },
    { key: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
    { key: 'requirements', label: 'Requirements', icon: <ListChecks size={16} /> },
    { key: 'milestones', label: 'Milestones', icon: <CheckCircle size={16} /> },
    ...(project.status === 'COMPLETED' ? [{ key: 'review' as Tab, label: 'Review', icon: <Star size={16} /> }] : []),
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-4 text-sm transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">{project.title}</h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p className="text-slate-400">{project.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span>Budget: <strong className="text-slate-200">${project.budget.toLocaleString()} USDC</strong></span>
                {project.deadlineDays && <span>Deadline: <strong className="text-slate-200">{project.deadlineDays} days</strong></span>}
                {isDeveloper && <span>Client: <strong className="text-slate-200">{project.client?.fullName || project.clientEmail}</strong></span>}
                {isClient && <span>Developer: <strong className="text-slate-200">{project.developer.fullName}</strong></span>}
              </div>
            </div>

            {/* Client Invitation Response */}
            {isClient && project.status === 'PENDING_CLIENT' && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleRespond(false)} className="btn-danger flex items-center gap-1.5">
                  <XCircle size={16} /> Decline
                </button>
                <button onClick={() => handleRespond(true)} className="btn-success flex items-center gap-1.5">
                  <CheckCircle size={16} /> Accept
                </button>
              </div>
            )}

            {/* Fund Escrow */}
            {isClient && project.status === 'ACTIVE' && (
              <button onClick={handleFundEscrow} className="btn-primary flex items-center gap-2 shrink-0">
                <Wallet size={16} />
                Fund Escrow
              </button>
            )}
          </div>
        </div>

        {/* Funded banner for developer */}
        {isDeveloper && project.status === 'ACTIVE' && project.milestones.length > 0 && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
            <Wallet size={20} className="text-blue-400 shrink-0" />
            <div>
              <p className="font-medium text-blue-200">The client accepted the invitation — you can start working.</p>
              <p className="text-sm text-blue-300 mt-0.5">
                If you do not see <strong className="whitespace-nowrap">Submit Milestone</strong>, refresh the page or open the Milestones tab. The client can also click{' '}
                Use <strong>Fund Escrow</strong> to mark the project as funded for testing.
              </p>
            </div>
          </div>
        )}

        {isDeveloper && project.status === 'FUNDED' && (
          <div className="bg-green-950/40 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-200">Escrow funded!</p>
              <p className="text-sm text-green-300">The client has deposited the funds. You can start working on the milestones.</p>
            </div>
          </div>
        )}

        {isClient && awaitingClient.length > 0 && (
          <div className="rounded-xl border-2 border-amber-400/60 bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <ClipboardCheck className="text-amber-400 shrink-0" size={28} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-200">
                The developer submitted a deliverable — please approve or request changes
              </p>
              <ul className="mt-2 text-sm text-amber-300 list-disc list-inside space-y-0.5">
                {awaitingClient.map((m) => (
                  <li key={m.id}>{m.title}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-400/80">
                Approval closes the milestone and unlocks the next one when applicable. Decline routes the submission for revision / review per your workflow.
              </p>
            </div>
            <button type="button" onClick={() => setTab('milestones')} className="btn-primary shrink-0 whitespace-nowrap">
              Go to Milestones → Review
            </button>
          </div>
        )}

        {isDeveloper && awaitingClient.length > 0 && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/40 p-4 flex gap-3">
            <Send className="text-sky-400 shrink-0" size={22} />
            <div>
              <p className="font-medium text-sky-200">Submitted — waiting on the client</p>
              <p className="text-sm text-sky-300 mt-0.5">
                {awaitingClient.map((m) => m.title).join(', ')} — status &quot;Submitted&quot;. After the client approves, the next milestone becomes active when applicable.
              </p>
            </div>
          </div>
        )}

        {isDeveloper &&
          activeForDev.length > 0 &&
          awaitingClient.length === 0 &&
          ['ACTIVE', 'FUNDED', 'IN_PROGRESS'].includes(project.status) && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4">
              <p className="font-medium text-indigo-200">
                Active milestone — ship your work when ready
              </p>
              <p className="text-sm text-indigo-300 mt-1">
                {activeForDev.map((m) => m.title).join(', ')} — use{' '}
                <strong className="whitespace-nowrap">Submit Milestone</strong> to send code, demos, notes, or files.
                The client will accept or decline.
              </p>
            </div>
          )}

        {/* Tabs */}
        <div className="border-b border-white/[0.07]">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-escrow-aqua text-escrow-aqua'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {t.icon}
                {t.label}
                {t.key === 'milestones' && isClient && awaitingClient.length > 0 && (
                  <span className="ml-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    !
                  </span>
                )}
                {t.key === 'milestones' && project.milestones.length > 0 && (
                  <span className="ml-1 bg-slate-700/60 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
                    {completedMilestones}/{project.milestones.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Project Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-400">Status</dt>
                  <dd><ProjectStatusBadge status={project.status} /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-400">Budget</dt>
                  <dd className="text-sm font-medium text-slate-200">${project.budget.toLocaleString()} USDC</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-400">Deadline</dt>
                  <dd className="text-sm font-medium text-slate-200">{project.deadlineDays || '—'} days</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-400">Milestones</dt>
                  <dd className="text-sm font-medium text-slate-200">{completedMilestones} / {project.milestones.length} completed</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-400">Requirements</dt>
                  <dd className="text-sm font-medium text-slate-200">{project.requirements.length} items</dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h3 className="font-semibold text-white mb-4">Milestone Progress</h3>
              {project.milestones.length === 0 ? (
                <p className="text-slate-500 text-sm">No milestones defined yet</p>
              ) : (
                <div className="space-y-3">
                  {sortedMilestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        ['COMPLETED', 'CLIENT_APPROVED', 'AI_APPROVED'].includes(m.status)
                          ? 'bg-green-500/20 text-green-400'
                          : m.status === 'IN_PROGRESS' || m.status === 'SUBMITTED'
                          ? 'bg-escrow-sea/20 text-escrow-sea'
                          : 'bg-slate-700/60 text-slate-400'
                      }`}>
                        {m.orderIndex}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{m.title}</p>
                        <p className="text-xs text-slate-500">${m.amount.toLocaleString()}</p>
                      </div>
                      <MilestoneStatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <ChatPanel projectId={projectId} />
        )}

        {tab === 'requirements' && (
          <div className="card max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Project Requirements</h3>
              {isDeveloper && (
                <button onClick={handleSaveRequirements} disabled={savingReqs} className="btn-primary text-sm">
                  {savingReqs ? 'Saving...' : 'Save Requirements'}
                </button>
              )}
            </div>

            {isDeveloper && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Add a requirement..."
                  value={newReq}
                  onChange={(e) => setNewReq(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newReq.trim()) {
                      setRequirements([...requirements, newReq.trim()]);
                      setNewReq('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => { if (newReq.trim()) { setRequirements([...requirements, newReq.trim()]); setNewReq(''); } }}
                  className="btn-primary"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}

            {requirements.length === 0 ? (
              <p className="text-slate-500 text-sm">No requirements defined yet</p>
            ) : (
              <ul className="space-y-2">
                {requirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="w-5 h-5 bg-escrow-sea/20 text-escrow-sea rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-300 flex-1">{req}</span>
                    {isDeveloper && (
                      <button
                        onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'milestones' && (
          <div className="space-y-4 max-w-3xl">
            {sortedMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`card ${
                  isClient && milestone.status === 'SUBMITTED'
                    ? 'ring-2 ring-amber-400/60 bg-amber-500/10'
                    : isDeveloper &&
                        (milestone.status === 'IN_PROGRESS' || milestone.status === 'AI_REJECTED')
                      ? 'ring-1 ring-indigo-400/40'
                      : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-escrow-sea/20 text-escrow-sea rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-1 ring-escrow-sea/30">
                      {milestone.orderIndex}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white">{milestone.title}</h4>
                        <MilestoneStatusBadge status={milestone.status} />
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-400 mt-0.5">{milestone.description}</p>
                      )}
                      <p className="text-sm font-medium text-escrow-aqua mt-1">${milestone.amount.toLocaleString()} USDC</p>

                      {isDeveloper && milestone.status === 'IN_PROGRESS' && (
                        <p className="text-xs text-indigo-300 mt-1.5">
                          When finished, use <strong>Submit Milestone</strong> on the right for code, demos, and files.
                        </p>
                      )}
                      {isDeveloper && milestone.status === 'PENDING' && (
                        <p className="text-xs text-slate-500 mt-1.5">
                          Queued — it becomes active automatically after earlier milestones finish.
                        </p>
                      )}
                      {isClient && milestone.status === 'SUBMITTED' && (
                        <p className="text-xs font-semibold text-amber-300 mt-1.5">
                          Tap <strong>Review</strong> — approve (unlocks next milestone when applicable) or decline.
                        </p>
                      )}

                      {milestone.acceptanceCriteria.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-400 mb-1">Acceptance Criteria:</p>
                          <ul className="space-y-1">
                            {milestone.acceptanceCriteria.map((ac, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-escrow-aqua/50 rounded-full"></span>
                                {ac}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {milestone.submission && (
                        <div className="mt-3 p-3 bg-slate-800/60 rounded-lg">
                          <p className="text-xs font-medium text-slate-300 mb-1">Submission:</p>
                          {milestone.submission.githubRepo && (
                            <a href={milestone.submission.githubRepo} target="_blank" rel="noreferrer"
                              className="text-xs text-escrow-aqua hover:text-escrow-sand hover:underline block transition-colors">
                              GitHub: {milestone.submission.githubRepo}
                            </a>
                          )}
                          {milestone.submission.demoLink && (
                            <a href={milestone.submission.demoLink} target="_blank" rel="noreferrer"
                              className="text-xs text-escrow-aqua hover:text-escrow-sand hover:underline block transition-colors">
                              Demo: {milestone.submission.demoLink}
                            </a>
                          )}
                          {milestone.submission.notes && (
                            <p className="text-xs text-slate-400 mt-1">{milestone.submission.notes}</p>
                          )}
                        </div>
                      )}

                      {milestone.aiFeedback && (
                        <div className="mt-3 p-3 bg-red-950/40 border border-red-500/25 rounded-lg">
                          <p className="text-xs font-medium text-red-300 mb-1">AI Feedback:</p>
                          <p className="text-xs text-red-400">{milestone.aiFeedback}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {isDeveloper && milestone.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => setSubmitMilestone(milestone)}
                        className="btn-primary text-sm"
                      >
                        Submit Milestone
                      </button>
                    )}
                    {isDeveloper && milestone.status === 'AI_REJECTED' && (
                      <button
                        onClick={() => setSubmitMilestone(milestone)}
                        className="btn-secondary text-sm"
                      >
                        Resubmit
                      </button>
                    )}
                    {isClient && milestone.status === 'SUBMITTED' && (
                      <button
                        onClick={() => setReviewMilestone(milestone)}
                        className="btn-primary text-sm"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isDeveloper && ['ACTIVE', 'FUNDED', 'IN_PROGRESS'].includes(project.status) && (
              <>
                {!showMilestoneForm ? (
                  <button
                    onClick={() => setShowMilestoneForm(true)}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Milestone
                  </button>
                ) : (
                  <div className="card border-2 border-dashed border-escrow-aqua/25">
                    <h4 className="font-semibold text-white mb-4">New Milestone</h4>
                    <form onSubmit={handleAddMilestone} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                          <input
                            type="text" required className="input-field"
                            placeholder="Frontend Development"
                            value={milestoneForm.title}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Amount (USDC) *</label>
                          <input
                            type="number" required min="1" step="0.01" className="input-field"
                            placeholder="1500"
                            value={milestoneForm.amount}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                          <input
                            type="text" className="input-field"
                            placeholder="Build all frontend pages"
                            value={milestoneForm.description}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Acceptance Criteria</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text" className="input-field"
                            placeholder="Press Enter to add criteria"
                            value={milestoneForm.criteria}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, criteria: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (milestoneForm.criteria.trim()) {
                                  setCriteriaList([...criteriaList, milestoneForm.criteria.trim()]);
                                  setMilestoneForm({ ...milestoneForm, criteria: '' });
                                }
                              }
                            }}
                          />
                          <button type="button" onClick={() => {
                            if (milestoneForm.criteria.trim()) {
                              setCriteriaList([...criteriaList, milestoneForm.criteria.trim()]);
                              setMilestoneForm({ ...milestoneForm, criteria: '' });
                            }
                          }} className="btn-secondary">
                            <Plus size={16} />
                          </button>
                        </div>
                        {criteriaList.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-300 mb-1">
                            <span className="text-escrow-aqua">•</span>
                            <span className="flex-1">{c}</span>
                            <button type="button" onClick={() => setCriteriaList(criteriaList.filter((_, idx) => idx !== i))}
                              className="text-slate-500 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowMilestoneForm(false)} className="btn-secondary flex-1">
                          Cancel
                        </button>
                        <button type="submit" className="btn-primary flex-1">Add Milestone</button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'review' && project.status === 'COMPLETED' && (
          <div className="card max-w-lg">
            <h3 className="font-semibold text-white mb-4">Leave a Review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= reviewForm.rating ? 'text-yellow-400' : 'text-slate-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Comment</label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="Share your experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </div>
              <button type="submit" disabled={submittingReview} className="btn-primary w-full">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modals */}
      {submitMilestone && (
        <MilestoneSubmitModal
          milestone={submitMilestone}
          onClose={() => setSubmitMilestone(null)}
          onSuccess={() => { setSubmitMilestone(null); loadProject(); }}
        />
      )}
      {reviewMilestone && (
        <MilestoneReviewModal
          milestone={reviewMilestone}
          onClose={() => setReviewMilestone(null)}
          onSuccess={() => { setReviewMilestone(null); loadProject(); }}
        />
      )}
    </Layout>
  );
}
