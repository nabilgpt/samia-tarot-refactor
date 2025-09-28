import { useAuth } from '../contexts/AuthContext';

const RoleGate = ({ allow = [], children, fallback = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-pulse text-theme-secondary">Loading permissions...</div>
      </div>
    );
  }

  const hasAccess = user?.role && allow.includes(user.role);

  if (!hasAccess) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-theme-secondary">Access denied. Insufficient permissions.</p>
      </div>
    );
  }

  return children;
};

export default RoleGate;