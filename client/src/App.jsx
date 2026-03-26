import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ContestsPage from './pages/ContestsPage';
import CreateContestPage from './pages/CreateContestPage';
import ContestDetailPage from './pages/ContestDetailPage';
import ProfilePage from './pages/ProfilePage';
import EditContestPage from './pages/EditContestPage';
import ContestProblemPage from './pages/ContestProblemPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <HomePage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <ProtectedRoute>
            <ContestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests/create"
        element={
          <ProtectedRoute>
            <CreateContestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests/:id"
        element={
          <ProtectedRoute>
            <ContestDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests/:id/edit"
        element={
          <ProtectedRoute>
            <EditContestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests/:id/problem/:problemId"
        element={
          <ProtectedRoute>
            <ContestProblemPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

