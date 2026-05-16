import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyProjectsApi } from '../../api/projects';
import type { Project } from '../../types';
import { milestonesAwaitingClientReview } from '../../utils/milestoneFlow';
import Layout from '../../components/Layout';
import { ProjectStatusBadge } from '../../components/StatusBadge';
import { Plus, FolderOpen, DollarSign, Clock, CheckCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProjectsApi()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: projects.length,
    active: projects.filter((p) => ['ACTIVE', 'FUNDED', 'IN_PROGRESS'].includes(p.status)).length,
    completed: projects.filter((p) => p.status === 'COMPLETED').length,
    totalEarned: projects
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.budget, 0),
  };
  const waitingOnClientApproval = projects.filter(
    (p) => milestonesAwaitingClientReview(p).length > 0
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-slate-400 mt-0.5">Manage your freelance projects</p>
          </div>
          <Link to="/developer/projects/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            New Project
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-escrow-sea/18 rounded-xl mx-auto mb-2">
              <FolderOpen size={20} className="text-escrow-sea" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-slate-400">Total Projects</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-400/15 rounded-xl mx-auto mb-2">
              <Clock size={20} className="text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
            <p className="text-sm text-slate-400">Active</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-green-400/15 rounded-xl mx-auto mb-2">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.completed}</p>
            <p className="text-sm text-slate-400">Completed</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-400/15 rounded-xl mx-auto mb-2">
              <DollarSign size={20} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">${stats.totalEarned.toLocaleString()}</p>
            <p className="text-sm text-slate-400">Total Earned</p>
          </div>
        </div>

        {waitingOnClientApproval.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Send size={18} className="text-escrow-aqua" />
              Waiting on client for milestones
            </h2>
            <p className="text-sm text-slate-400 mb-3">
              Work is submitted—the client needs to approve so the next milestone can unlock automatically.
            </p>
            <div className="grid gap-3">
              {waitingOnClientApproval.map((project) => {
                const waiting = milestonesAwaitingClientReview(project);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="card hover:shadow-elevated-dark transition-shadow border-l-4 border-l-escrow-aqua/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-100 group-hover:text-escrow-aqua transition-colors">{project.title}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{waiting.map((m) => m.title).join(' · ')}</p>
                    </div>
                    <span className="btn-secondary text-sm shrink-0 w-fit">View in project</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects List */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Projects</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="card text-center py-12">
              <FolderOpen size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No projects yet</p>
              <p className="text-slate-500 text-sm mt-1">Create your first project to get started</p>
              <Link to="/developer/projects/new" className="btn-primary inline-flex items-center gap-2 mt-4">
                <Plus size={16} />
                Create Project
              </Link>
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
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Client: {project.client?.fullName || project.clientEmail}</span>
                      {project.deadlineDays && <span>{project.deadlineDays} days</span>}
                      <span>{project.milestones.length} milestones</span>
                    </div>
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
