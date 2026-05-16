import type { ProjectStatus, MilestoneStatus } from '../types';

const projectStatusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  PENDING_CLIENT: {
    label: 'Pending Client',
    className:
      'bg-amber-500/15 text-amber-900 dark:bg-amber-500/22 dark:text-amber-100',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-sky-500/15 text-blue-950 dark:bg-sky-500/22 dark:text-sky-100',
  },
  FUNDED: {
    label: 'Funded',
    className: 'bg-indigo-500/12 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-500/15 text-blue-900 dark:bg-blue-500/22 dark:text-blue-100',
  },
  COMPLETED: {
    label: 'Completed',
    className:
      'bg-emerald-500/14 text-emerald-950 dark:bg-emerald-500/22 dark:text-emerald-50',
  },
  DECLINED: {
    label: 'Declined',
    className: 'bg-rose-500/12 text-rose-900 dark:bg-rose-500/22 dark:text-rose-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    className:
      'bg-slate-500/12 text-slate-700 dark:bg-slate-600/26 dark:text-slate-100',
  },
};

const milestoneStatusConfig: Record<MilestoneStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className:
      'bg-slate-400/16 text-slate-800 dark:bg-slate-600/35 dark:text-slate-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className:
      'bg-sky-500/15 text-blue-950 dark:bg-sky-500/22 dark:text-sky-100',
  },
  SUBMITTED: {
    label: 'Submitted',
    className:
      'bg-amber-500/15 text-amber-950 dark:bg-amber-500/22 dark:text-amber-100',
  },
  CLIENT_APPROVED: {
    label: 'Client Approved',
    className:
      'bg-emerald-500/14 text-emerald-950 dark:bg-emerald-500/22 dark:text-emerald-50',
  },
  AI_REVIEW: {
    label: 'AI Review',
    className:
      'bg-violet-500/13 text-violet-950 dark:bg-violet-500/22 dark:text-violet-100',
  },
  AI_APPROVED: {
    label: 'AI Approved',
    className:
      'bg-indigo-500/14 text-indigo-950 dark:bg-indigo-500/22 dark:text-indigo-100',
  },
  AI_REJECTED: {
    label: 'AI Rejected',
    className: 'bg-rose-500/12 text-rose-900 dark:bg-rose-500/22 dark:text-rose-100',
  },
  COMPLETED: {
    label: 'Completed',
    className:
      'bg-emerald-500/14 text-emerald-950 dark:bg-emerald-500/22 dark:text-emerald-50',
  },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config =
    projectStatusConfig[status] ?? {
      label: status,
      className: 'bg-slate-500/12 text-slate-700 dark:bg-slate-700/38 dark:text-slate-50',
    };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config =
    milestoneStatusConfig[status] ?? {
      label: status,
      className: 'bg-slate-500/12 text-slate-700 dark:bg-slate-700/38 dark:text-slate-50',
    };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
