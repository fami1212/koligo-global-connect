import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  city?: string;
  avatar_url?: string;
  rating: number;
  total_reviews: number;
  is_verified?: boolean;
  business_name?: string;
  id_type?: string;
  id_validity_date?: string;
}

interface UserRole {
  role: 'admin' | 'sender' | 'traveler';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      setProfile(profileData);
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message === "User already registered" 
          ? "Cet email est déjà utilisé" 
          : error.message,
        variant: "destructive",
      });
    } else {
      // Call edge function to create profile and assign role
      if (data.user && userData) {
        try {
          await supabase.functions.invoke('handle-new-user', {
            body: {
              user: data.user,
              metadata: userData
            }
          });
          
          // Rafraîchir le profil et les roles après création
          setTimeout(() => {
            if (data.user?.id) {
              fetchProfile(data.user.id);
            }
          }, 500);
        } catch (error) {
          console.error('Error calling handle-new-user function:', error);
        }
      }

      toast({
        title: "Inscription réussie",
        description: userData?.user_type === 'traveler' 
          ? "Votre compte GP a été créé. Votre document sera vérifié sous 24-48h."
          : "Bienvenue sur GP Connect !",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !/Auth session missing/i.test(error.message)) {
        throw error;
      }
    } catch (err: any) {
      // Ignore "Auth session missing" and proceed to clear local state
      if (!/Auth session missing/i.test(err?.message || '')) {
        toast({
          title: "Erreur de déconnexion",
          description: err?.message || 'Une erreur est survenue',
          variant: "destructive",
        });
      }
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      window.location.href = '/';
    }
  };

  const hasRole = (role: string) => {
    return roles.some(r => r.role === role);
  };

  const value = {
    user,
    session,
    profile,
    roles,
    isLoading,
    signUp,
    signIn,
    signOut,
    hasRole,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
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