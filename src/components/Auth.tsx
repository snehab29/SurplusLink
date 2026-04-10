import React, { useState } from 'react';
import { useAuth } from '../App';
import { ZONES, UserRole } from '../types';
import { Utensils, Heart, ShieldCheck, ArrowRight, Loader2, Mail, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';

export function Auth() {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('restaurant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'contact' | 'email'>('contact');

  const [formData, setFormData] = useState({
    name: '',
    orgName: '',
    contact: '',
    email: '',
    address: '',
    zone: ZONES[0],
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { 
          contact: authMethod === 'contact' ? formData.contact : undefined, 
          email: authMethod === 'email' ? formData.email : undefined, 
          password: formData.password 
        }
      : { 
          ...formData, 
          role
        };

    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      
      if (isLogin) {
        if (data.token) localStorage.setItem('surplus_token', data.token);
        setUser(data);
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">SurplusLink</h1>
          <p className="text-slate-500 mt-2">Jaipur's Food Redistribution Network</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${isLogin ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${!isLogin ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRole('restaurant')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${role === 'restaurant' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Restaurant
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ngo')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${role === 'ngo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      NGO
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Contact Person Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                      {role === 'restaurant' ? 'Restaurant Name' : 'NGO Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.orgName}
                      onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder={role === 'restaurant' ? 'e.g. Royal Sweets' : 'e.g. Helping Hands'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Address</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Full street address"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Zone</label>
                    <select
                      value={formData.zone}
                      onChange={e => setFormData({ ...formData, zone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    >
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {authMethod === 'contact' ? 'Contact Number' : 'Email Address'}
                </label>
                <button
                  type="button"
                  onClick={() => setAuthMethod(authMethod === 'contact' ? 'email' : 'contact')}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
                >
                  Use {authMethod === 'contact' ? 'Email' : 'Phone'} instead
                </button>
              </div>
              {authMethod === 'contact' ? (
                <input
                  type="tel"
                  required
                  value={formData.contact}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="10-digit mobile number"
                />
              ) : (
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="name@example.com"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          By continuing, you agree to our terms of service and safety guidelines.
        </p>
      </motion.div>
    </div>
  );
}
