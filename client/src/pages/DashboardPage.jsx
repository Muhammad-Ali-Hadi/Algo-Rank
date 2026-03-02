import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';

export default function DashboardPage() {
  const { user: profile, loading } = useAuth();

  if (loading || !profile) {
    return <Navbar />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
    </div>
  );
}
