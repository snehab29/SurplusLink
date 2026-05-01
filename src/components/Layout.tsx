import React from 'react';
import { useAuth } from '../App';
import { Utensils, Heart, ShieldCheck, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { ProfileMenu } from './ProfileMenu';
import { NotificationCenter } from './NotificationCenter';
import { ProfileNudge } from './ProfileNudge';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-600 font-bold text-xs uppercase tracking-wider">
                  {user?.role === 'restaurant' && <Utensils className="w-3.5 h-3.5 text-emerald-600" />}
                  {user?.role === 'ngo' && <Heart className="w-3.5 h-3.5 text-rose-600" />}
                  {user?.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{user?.role}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-2" />
                <NotificationCenter />
                <ProfileMenu />
              </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <NotificationCenter />
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
        <div className={cn("md:hidden border-t border-slate-100 bg-white shadow-lg", isMenuOpen ? "block" : "hidden")}>
          <div className="px-4 pt-2 pb-6">
            <ProfileMenu />
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <ProfileNudge />

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
