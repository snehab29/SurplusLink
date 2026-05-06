import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { RestaurantDashboard } from './components/RestaurantDashboard';
import { NGODashboard } from './components/NGODashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ResetPassword } from './components/ResetPassword';
import { Loader2 } from 'lucide-react';

import { apiFetch } from './lib/api';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) setResetToken(token);

    apiFetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setUser(data);
        else localStorage.removeItem('surplus_token');
      })
      .catch(() => localStorage.removeItem('surplus_token'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {resetToken ? (
        <ResetPassword 
          token={resetToken} 
          onComplete={() => {
            setResetToken(null);
            window.history.replaceState({}, '', '/');
          }} 
        />
      ) : !user ? (
        <Auth />
      ) : (
        <Layout>
          {user.role === 'restaurant' && <RestaurantDashboard key={user.id} />}
          {user.role === 'ngo' && <NGODashboard key={user.id} />}
          {user.role === 'admin' && <AdminDashboard key={user.id} />}
        </Layout>
      )}
    </AuthContext.Provider>
  );
}
