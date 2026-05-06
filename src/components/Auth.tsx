import React, { useState } from 'react';
import { useAuth } from '../App';
import { ZONES, UserRole } from '../types';
import { Utensils, Heart, ShieldCheck, ArrowRight, Loader2, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';

export function Auth() {
  const { setUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('restaurant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      name: '',
      orgName: '',
      contact: '',
      email: '',
      address: '',
      zone: ZONES[0],
      password: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_REGEX = /^[1-9][0-9]{9}$/;
    
    // Validate email format if email is being used
    if (isForgot || (!isLogin && formData.email) || (isLogin && authMethod === 'email')) {
      const emailToValidate = isForgot ? formData.email : formData.email;
      if (!EMAIL_REGEX.test(emailToValidate)) {
        setError('Invalid email format. Please use example@domain.com');
        return;
      }
    }

    // Validate phone number format if contact is being used
    if ((!isLogin && formData.contact) || (isLogin && authMethod === 'contact')) {
      if (!PHONE_REGEX.test(formData.contact)) {
        setError('Invalid phone number. Must be 10 digits and not start with 0.');
        return;
      }
    }

    // Validate password length for signup
    if (!isLogin && !isForgot && formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    if (isForgot) {
      try {
        const res = await apiFetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong');
        setSuccess(data.message || 'Reset link sent! Please check your email.');
        setTimeout(() => {
          setSuccess('');
          setIsForgot(false);
        }, 5000);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

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
        setFormData(prev => ({ ...prev, password: '' })); // Keep contact/email but clear password
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
              onClick={() => !isLogin && toggleMode()}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${isLogin ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Login
            </button>
            <button
              onClick={() => isLogin && toggleMode()}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${!isLogin ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-7">
            <AnimatePresence mode="wait">
              {isForgot ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !!success}
                    className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsForgot(false)}
                    className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Back to Login
                  </button>
                </motion.div>
              ) : !isLogin ? (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3.5 mb-3.5"
                >
                  <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRole('restaurant')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${role === 'restaurant' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Restaurant
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ngo')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${role === 'ngo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      NGO
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Contact Person</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="Rahul Sharma"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">
                        {role === 'restaurant' ? 'Restaurant Name' : 'NGO Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.orgName}
                        onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder={role === 'restaurant' ? 'Royal Sweets' : 'Helping Hands'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="name@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Contact Number</label>
                      <input
                        type="tel"
                        required
                        value={formData.contact}
                        onChange={e => setFormData({ ...formData, contact: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="10-digit mobile"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Zone</label>
                      <select
                        value={formData.zone}
                        onChange={e => setFormData({ ...formData, zone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm appearance-none"
                      >
                        {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Address</label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="Street address"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-0 mb-3.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {authMethod === 'contact' ? 'Contact Number' : 'Email Address'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuthMethod(authMethod === 'contact' ? 'email' : 'contact')}
                        className="text-[9px] font-extrabold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
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
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="10-digit mobile number"
                      />
                    ) : (
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                        placeholder="name@example.com"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isForgot && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm pr-11"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {isLogin && (
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => setIsForgot(true)}
                        className="text-[9px] font-extrabold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          By continuing, you agree to our terms of service and safety guidelines.
        </p>
      </motion.div>
    </div>
  );
}
