import type { Milestone, Project } from '../types';

/** Milestones awaiting client accept / decline (SUBMITTED) */
export function milestonesAwaitingClientReview(p: Project): Milestone[] {
  return p.milestones.filter((m) => m.status === 'SUBMITTED');
}

/** Milestone actively in progress (work in flight) */
export function milestonesInProgress(p: Project): Milestone[] {
  return p.milestones.filter((m) => m.status === 'IN_PROGRESS');
}

/** Display order for milestone list */
export function sortMilestonesForDisplay(mds: Milestone[]): Milestone[] {
  const rank = (s: Milestone['status']) => {
    switch (s) {
      case 'SUBMITTED':
        return 0;
      case 'AI_REVIEW':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'AI_REJECTED':
        return 3;
      case 'AI_APPROVED':
      case 'CLIENT_APPROVED':
        return 9;
      case 'COMPLETED':
        return 10;
      default:
        return 5;
    }
  };
  return [...mds].sort((a, b) => {
      const rd = rank(a.status) - rank(b.status);
      if (rd !== 0) return rd;
      return (a.orderIndex ?? a.id) - (b.orderIndex ?? b.id);
    });
}
