import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth';

const RoleGate = ({ allow = [], children, fallback = null }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const userRole = user?.role;
        setHasAccess(userRole && allow.includes(userRole));
        setLoading(false);
      })
      .catch(() => {
        setHasAccess(false);
        setLoading(false);
      });
  }, [allow]);

  if (loading) {
    return null; // Keep UI clean during loading
  }

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