import { useEffect, useState } from 'react';
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: { full_name: string };
  created_at: string;
}

// Demo identity retained until authentication is rebuilt.
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'admin@travneeds.com',
  user_metadata: { full_name: 'Super Admin' },
  created_at: new Date().toISOString()
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user was previously logged in with demo credentials
    const demoSession = localStorage.getItem('demo_session');
    if (demoSession === 'true') {
      setUser(DEMO_USER);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Always use demo authentication for this CRM
    if (email === 'admin@travneeds.com' && password === 'password123') {
      localStorage.setItem('demo_session', 'true');
      setUser(DEMO_USER);
      return {
        data: { user: DEMO_USER },
        error: null
      };
    }

    // Return error for invalid credentials
    return {
      data: { user: null },
      error: { message: 'Invalid credentials. Use admin@travneeds.com / password123 for demo access.' }
    };
  };

  const signOut = async () => {
    localStorage.removeItem('demo_session');
    setUser(null);
    return { error: null };
  };

  return {
    user,
    loading,
    signIn,
    signOut,
  };
};
