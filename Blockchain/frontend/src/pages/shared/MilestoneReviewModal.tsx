import { useState } from 'react';
import type { Milestone } from '../../types';
import { reviewMilestoneApi } from '../../api/projects';
import { X, CheckCircle, XCircle, Code2, Link2, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  milestone: Milestone;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MilestoneReviewModal({ milestone, onClose, onSuccess }: Props) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (approved: boolean) => {
    setLoading(true);
    try {
      await reviewMilestoneApi(milestone.id, approved, feedback || undefined);
      toast.success(
        approved
          ? 'Milestone approved! Payment released.'
          : 'Sent for AI review.'
      );
      onSuccess();
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const { submission } = milestone;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl ring-1 ring-escrow-aqua/15">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.07]">
          <div>
            <h2 className="text-lg font-bold text-white">Review Milestone</h2>
            <p className="text-sm text-slate-400 mt-0.5">{milestone.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/70 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {submission && (
            <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-slate-300">Developer submission:</p>
              {submission.githubRepo && (
                <a href={submission.githubRepo} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-escrow-aqua hover:text-escrow-sand hover:underline transition-colors">
                  <Code2 size={14} /> {submission.githubRepo}
                </a>
              )}
              {submission.demoLink && (
                <a href={submission.demoLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-escrow-aqua hover:text-escrow-sand hover:underline transition-colors">
                  <Link2 size={14} /> {submission.demoLink}
                </a>
              )}
              {submission.notes && (
                <p className="text-sm text-slate-300">{submission.notes}</p>
              )}
              {submission.fileUrls.length > 0 && (
                <div>
                  {submission.fileUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm text-escrow-aqua hover:text-escrow-sand hover:underline transition-colors">
                      <Paperclip size={12} /> Attachment {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {milestone.acceptanceCriteria.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Acceptance Criteria:</p>
              <ul className="space-y-1.5">
                {milestone.acceptanceCriteria.map((ac, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-escrow-aqua/60 mt-1.5 shrink-0"></span>
                    {ac}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Feedback (required if declining)
            </label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Describe what needs to be fixed..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <div className="bg-escrow-deep/30 border border-escrow-sea/25 rounded-xl p-3 text-xs text-slate-300">
            <strong className="text-escrow-aqua">Note:</strong> If you decline, the milestone goes to AI for independent review.
            If AI approves it, payment will be released regardless of your decision.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleReview(false)}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
            >
              <XCircle size={16} /> Decline
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleReview(true)}
              className="btn-success flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Approve & Release
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
