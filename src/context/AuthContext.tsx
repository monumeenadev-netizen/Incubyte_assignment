import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { authApi } from '../services/api';

interface AuthContextType {
  user: { id: string; email: string } | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
        fetchAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          await fetchAdminStatus(session.user.id);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    setIsAdmin(data?.is_admin || false);
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setUser({
      id: response.user.id,
      email: response.user.email,
    });
    setIsAdmin(response.isAdmin || false);

    await supabase.auth.setSession({
      access_token: response.session.access_token,
      refresh_token: response.session.refresh_token,
    });
  };

  const register = async (email: string, password: string, fullName: string) => {
    const response = await authApi.register(email, password, fullName);
    setUser({
      id: response.user.id,
      email: response.user.email,
    });
    setIsAdmin(false);

    await supabase.auth.setSession({
      access_token: response.session.access_token,
      refresh_token: response.session.refresh_token,
    });
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
