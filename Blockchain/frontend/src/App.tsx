import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PhantomProvider } from './context/PhantomContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DeveloperDashboard from './pages/developer/DeveloperDashboard';
import NewProjectPage from './pages/developer/NewProjectPage';
import ClientDashboard from './pages/client/ClientDashboard';
import ProjectsPage from './pages/shared/ProjectsPage';
import ProjectDetailPage from './pages/shared/ProjectDetailPage';
import WalletPlaygroundPage from './pages/WalletPlaygroundPage';
import SolanaEscrowDemoPage from './pages/SolanaEscrowDemoPage';

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'DEVELOPER' ? '/developer' : '/client'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <PhantomProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className:
                '!rounded-xl !font-sans !text-sm !shadow-lg !backdrop-blur-md !bg-white/95 !text-slate-900 !ring-1 !ring-blue-200/55 dark:!bg-slate-950/92 dark:!text-slate-50 dark:!ring-blue-950/92',
            }}
          />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/developer"
              element={
                <ProtectedRoute allowedRole="DEVELOPER">
                  <DeveloperDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer/projects/new"
              element={
                <ProtectedRoute allowedRole="DEVELOPER">
                  <NewProjectPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/client"
              element={
                <ProtectedRoute allowedRole="CLIENT">
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wallet-playground"
              element={
                <ProtectedRoute>
                  <WalletPlaygroundPage />
                </ProtectedRoute>
              }
            />

            <Route path="/demo/solana-escrow" element={<Navigate to="/escrow-flow" replace />} />

            <Route
              path="/escrow-flow"
              element={
                <ProtectedRoute>
                  <SolanaEscrowDemoPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PhantomProvider>
    </AuthProvider>
  );
}
