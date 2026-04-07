import React from 'react';
import { useAuth } from '../App';
import { LogOut, Utensils, Heart, ShieldCheck, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('surplus_token');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <Utensils className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                  SurplusLink
                </span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                {user?.role === 'restaurant' && <Utensils className="w-4 h-4" />}
                {user?.role === 'ngo' && <Heart className="w-4 h-4" />}
                {user?.role === 'admin' && <ShieldCheck className="w-4 h-4" />}
                <span className="capitalize">{user?.role}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-sm text-slate-500">
                {user?.name} ({user?.zone})
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className={cn("md:hidden border-t border-slate-100 bg-white", isMenuOpen ? "block" : "hidden")}>
          <div className="px-4 pt-2 pb-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="bg-emerald-100 p-2 rounded-lg">
                {user?.role === 'restaurant' && <Utensils className="w-5 h-5 text-emerald-600" />}
                {user?.role === 'ngo' && <Heart className="w-5 h-5 text-emerald-600" />}
                {user?.role === 'admin' && <ShieldCheck className="w-5 h-5 text-emerald-600" />}
              </div>
              <div>
                <div className="font-bold text-slate-900">{user?.name}</div>
                <div className="text-xs text-slate-500 capitalize">{user?.role} • {user?.zone}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            © 2026 SurplusLink Jaipur. Connecting communities, reducing waste.
          </p>
        </div>
      </footer>
    </div>
  );
}
