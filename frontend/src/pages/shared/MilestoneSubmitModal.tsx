import { useRef, useState } from 'react';
import type { Milestone } from '../../types';
import { submitMilestoneApi } from '../../api/projects';
import { X, Upload, Code2, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  milestone: Milestone;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MilestoneSubmitModal({ milestone, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ githubRepo: '', demoLink: '', notes: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitMilestoneApi(milestone.id, form, files.length > 0 ? files : undefined);
      toast.success('Milestone submitted!');
      onSuccess();
    } catch {
      toast.error('Failed to submit milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit Milestone</h2>
            <p className="text-sm text-gray-500 mt-0.5">{milestone.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Code2 size={14} /> GitHub Repository
            </label>
            <input
              type="url"
              className="input-field"
              placeholder="https://github.com/user/repo"
              value={form.githubRepo}
              onChange={(e) => setForm({ ...form, githubRepo: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Link2 size={14} /> Demo Link
            </label>
            <input
              type="url"
              className="input-field"
              placeholder="https://your-demo.com"
              value={form.demoLink}
              onChange={(e) => setForm({ ...form, demoLink: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Describe what was completed, any notes for the client..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Upload size={14} /> Attachments
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              {files.length > 0
                ? `${files.length} file(s) selected`
                : 'Click to attach files (screenshots, docs...)'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
