import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string, username: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      // After successful login, upsert profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch username from user_metadata if available, else fallback
        const username = user.user_metadata?.username || user.email?.split('@')[0] || '';
        await supabase.from('profiles').upsert({
          id: user.id,
          username,
          email: user.email,
          avatar_url: '',
        });
      }
    }
    setIsLoading(false);
    if (error) {
      console.error('Login error:', error.message);
      return { error: error.message };
    }
    return {};
  };

  const register = async (email: string, password: string, name: string, username: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    let signupResponse;
    try {
      signupResponse = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
            username: username,
          }
        }
      });
    } catch (err) {
      console.error('Registration exception:', err);
      setIsLoading(false);
      return { error: (err as Error).message || 'Unknown error during signup' };
    }
    const { error, data } = signupResponse;
    if (error) {
      console.error('Registration error:', error.message, error, 'Signup response:', signupResponse);
      setIsLoading(false);
      return { error: error.message };
    }
    // After successful signup, if user is returned (no email confirmation required), upsert profile
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        email,
        avatar_url: '',
      });
    }
    setIsLoading(false);
    return {};
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error.message);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
