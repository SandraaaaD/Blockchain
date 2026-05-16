import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProjectApi } from '../../api/projects';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    budget: '',
    deadlineDays: '',
    clientEmail: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await createProjectApi({
        title: form.title,
        description: form.description,
        budget: parseFloat(form.budget),
        deadlineDays: parseInt(form.deadlineDays) || 30,
        clientEmail: form.clientEmail,
      });
      toast.success('Project created! Waiting for client to accept.');
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="card">
          <h1 className="text-xl font-bold text-white mb-6">Create New Project</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Project Title *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="E-commerce Platform"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                rows={4}
                className="input-field"
                placeholder="Describe the project..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Budget (USDC) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  className="input-field"
                  placeholder="5000"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Deadline (days)</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  placeholder="30"
                  value={form.deadlineDays}
                  onChange={(e) => setForm({ ...form, deadlineDays: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Client Email *</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="client@example.com"
                value={form.clientEmail}
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                The client will receive an invitation to join this project.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
