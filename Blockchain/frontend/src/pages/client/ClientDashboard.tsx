import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyProjectsApi } from '../../api/projects';
import type { Project } from '../../types';
import { milestonesAwaitingClientReview } from '../../utils/milestoneFlow';
import Layout from '../../components/Layout';
import { ProjectStatusBadge } from '../../components/StatusBadge';
import { FolderOpen, DollarSign, Clock, CheckCircle, AlertCircle, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProjectsApi()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const pending = projects.filter((p) => p.status === 'PENDING_CLIENT');
  const active = projects.filter((p) => ['ACTIVE', 'FUNDED', 'IN_PROGRESS'].includes(p.status));
  const completed = projects.filter((p) => p.status === 'COMPLETED');
  const awaitingDeliverableReview = projects.filter(
    (p) => milestonesAwaitingClientReview(p).length > 0
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-slate-400 mt-0.5">Track your projects and milestones</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-400/15 rounded-xl mx-auto mb-2">
              <AlertCircle size={20} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{pending.length}</p>
            <p className="text-sm text-slate-400">Pending Invite</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-escrow-sea/18 rounded-xl mx-auto mb-2">
              <Clock size={20} className="text-escrow-sea" />
            </div>
            <p className="text-2xl font-bold text-white">{active.length}</p>
            <p className="text-sm text-slate-400">Active</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-green-400/15 rounded-xl mx-auto mb-2">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{completed.length}</p>
            <p className="text-sm text-slate-400">Completed</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-400/15 rounded-xl mx-auto mb-2">
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{projects.length}</p>
            <p className="text-sm text-slate-400">Total Projects</p>
          </div>
        </div>

        {pending.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-yellow-400" />
              Pending Invitations
            </h2>
            <div className="grid gap-3">
              {pending.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="card hover:shadow-elevated-dark transition-shadow border-l-4 border-l-yellow-400 flex items-center justify-between group"
                >
                  <div>
                    <h3 className="font-semibold text-slate-100 group-hover:text-escrow-aqua transition-colors">{project.title}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      From: {project.developer.fullName} · ${project.budget.toLocaleString()} USDC
                    </p>
                  </div>
                  <span className="btn-primary text-sm">Review Invitation</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {awaitingDeliverableReview.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-amber-400" />
              Review milestones (developer submitted work)
            </h2>
            <div className="grid gap-3">
              {awaitingDeliverableReview.map((project) => {
                const waiting = milestonesAwaitingClientReview(project);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="card hover:shadow-elevated-dark transition-shadow border-l-4 border-l-amber-500 flex items-center justify-between group"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-100 group-hover:text-escrow-aqua transition-colors">{project.title}</h3>
                      <p className="text-sm text-amber-300 mt-0.5">
                        {waiting.map((m) => m.title).join(' · ')}
                      </p>
                    </div>
                    <span className="btn-primary text-sm shrink-0">Approve / Decline</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* All Projects */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">All Projects</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="card text-center py-12">
              <FolderOpen size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No projects yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Ask your developer to invite you to a project
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="card hover:shadow-elevated-dark transition-shadow flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-100 group-hover:text-escrow-aqua transition-colors truncate">
                        {project.title}
                      </h3>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <p className="text-sm text-slate-400 truncate">{project.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Developer: {project.developer.fullName}
                    </p>
                  </div>
                  <div className="text-right ml-6 shrink-0">
                    <p className="text-lg font-bold text-white">${project.budget.toLocaleString()}</p>
                    <p className="text-xs text-escrow-aqua/70">USDC</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
