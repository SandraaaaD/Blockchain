import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyProjectsApi } from '../../api/projects';
import type { Project } from '../../types';
import Layout from '../../components/Layout';
import { ProjectStatusBadge } from '../../components/StatusBadge';
import { ArrowUpRight, FolderOpen, Layers, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const { user } = useAuth();
  const isDev = user?.role === 'DEVELOPER';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProjectsApi()
      .then(setProjects)
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const completed = projects.filter((p) => p.status === 'COMPLETED').length;

  return (
    <Layout>
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-escrow-sea/35 bg-white/62 px-6 py-8 sm:px-10 sm:py-10 shadow-soft backdrop-blur-2xl ring-1 ring-escrow-aqua/28 dark:border-escrow-aqua/25 dark:bg-slate-950/62 dark:ring-escrow-deep/92">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_92%_-8%,rgb(10_196_224/0.32),transparent_58%),radial-gradient(ellipse_at_6%_12%,rgb(9_146_194/0.22),transparent_52%),radial-gradient(ellipse_at_76%_100%,rgb(11_45_114/0.18),transparent_58%),radial-gradient(ellipse_at_14%_100%,rgb(246_231_188/0.36),transparent_54%)] dark:bg-[radial-gradient(ellipse_at_88%_0%,rgb(10_196_224/0.2),transparent_55%),radial-gradient(ellipse_at_14%_6%,rgb(9_146_194/0.14),transparent_50%),radial-gradient(ellipse_at_100%_100%,rgb(11_45_114/0.55),transparent_58%),radial-gradient(ellipse_at_10%_100%,rgb(246_231_188/0.1),transparent_52%)] pointer-events-none" />
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-8 -translate-y-8 rounded-full bg-escrow-aqua/22 blur-2xl pointer-events-none dark:bg-escrow-aqua/14" />
          <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-escrow-sand/28 blur-2xl pointer-events-none dark:bg-escrow-deep/32" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-escrow-aqua/22 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-escrow-deep ring-1 ring-escrow-sea/38 backdrop-blur-md dark:bg-escrow-deep/58 dark:text-escrow-sand dark:ring-escrow-aqua/38">
                <Sparkles size={14} className="text-escrow-sea dark:text-escrow-aqua" aria-hidden />
                Workspace
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Ship work. <span className="text-gradient">Get paid safely.</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-lg">
                All projects where you collaborate — escrow milestones, approvals, and delivery in one
                flow.
              </p>
              <div className="flex flex-wrap gap-6 pt-2 text-sm">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {projects.length}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 font-medium uppercase tracking-wide text-[11px]">
                    Projects
                  </p>
                </div>
                <div className="hidden sm:block h-10 w-px bg-escrow-sea/25 dark:bg-slate-800 self-center" aria-hidden />
                <div className="hidden sm:block">
                  <p className="text-2xl font-bold tabular-nums text-escrow-deep dark:text-escrow-aqua">
                    {completed}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 font-medium uppercase tracking-wide text-[11px]">
                    Completed
                  </p>
                </div>
              </div>
            </div>
            {isDev && (
              <Link
                to="/developer/projects/new"
                className="btn-primary whitespace-nowrap self-start lg:self-auto shadow-glow shrink-0"
              >
                <Plus size={18} strokeWidth={2.25} aria-hidden />
                New Project
              </Link>
            )}
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 dark:text-slate-600">
            <div className="h-12 w-12 rounded-full border-2 border-escrow-sand/50 border-t-escrow-sea dark:border-escrow-deep/70 dark:border-t-escrow-aqua animate-spin" />
            <span className="text-sm font-medium">Loading workspace…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="card-interactive border-dashed border-2 border-escrow-sea/45 bg-white/52 text-center py-16 dark:border-escrow-aqua/28 dark:bg-slate-950/54">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-escrow-sand/45 to-white/94 ring-1 ring-escrow-sea/40 dark:from-escrow-deep/78 dark:to-escrow-sea/42 dark:ring-escrow-aqua/40">
              <FolderOpen size={32} className="text-escrow-deep dark:text-escrow-aqua" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">No projects yet</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              {isDev
                ? 'Create one to invite clients and lock milestones in escrow.'
                : 'Ask your developer to send you an invite.'}
            </p>
            {isDev && (
              <Link to="/developer/projects/new" className="btn-primary inline-flex mt-8">
                <Plus size={16} aria-hidden />
                Create project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group card-interactive flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10 p-5 sm:p-7"
              >
                <div className="flex flex-1 min-w-0 gap-5">
                  <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-escrow-sea ring-1 ring-slate-200/92 group-hover:from-escrow-aqua/18 group-hover:to-escrow-sand/42 group-hover:text-escrow-deep group-hover:ring-escrow-sea/52 transition-colors dark:from-slate-950 dark:to-slate-900 dark:text-escrow-aqua dark:ring-slate-800 dark:group-hover:from-escrow-deep/72 dark:group-hover:to-escrow-sea/48 dark:group-hover:text-escrow-sand">
                    <Layers size={26} strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <h2 className="text-lg font-bold text-slate-900 truncate group-hover:text-escrow-deep transition-colors dark:text-white dark:group-hover:text-escrow-sand">
                        {project.title}
                      </h2>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    {project.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                    <p className="text-xs font-medium text-slate-500 mt-3 dark:text-slate-500">
                      {isDev ? (
                        <>Partner · {project.client?.fullName || project.clientEmail}</>
                      ) : (
                        <>Builder · {project.developer.fullName}</>
                      )}
                      {project.milestones?.length ? (
                        <>
                          {' '}
                          · {project.milestones.length}{' '}
                          {project.milestones.length === 1 ? 'milestone' : 'milestones'}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-row flex-wrap items-center justify-between gap-4 lg:flex-col lg:items-end shrink-0 lg:border-l lg:border-slate-200/90 lg:pl-10 dark:lg:border-escrow-deep/92 pt-5 lg:pt-0 border-t lg:border-t-0 border-slate-200/90 dark:border-slate-900/94">
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white tracking-tight">
                      ${project.budget.toLocaleString()}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-escrow-sea dark:text-escrow-aqua/92">
                      USDC escrow
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-escrow-deep opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 dark:text-escrow-aqua">
                    Open
                    <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
