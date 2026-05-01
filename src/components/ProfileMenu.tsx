import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { User, ZONES } from '../types';
import { apiFetch } from '../lib/api';
import { 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  X, 
  Save,
  Loader2,
  ChevronDown,
  History,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ActivityModal } from './ActivityModal';

export function ProfileMenu() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('surplus_token');
    setUser(null);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition-colors">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.orgName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={20} />
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-bold text-slate-900 leading-none">{user.orgName}</div>
          <div className="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-wider">{user.role}</div>
        </div>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden z-[60]"
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-600 flex items-center justify-center text-white text-xl font-bold">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.orgName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user.orgName.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{user.name}</h3>
                  <p className="text-sm text-slate-500">{user.orgName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={16} className="text-slate-400" />
                <span className="text-sm">{user.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400" />
                <span className="text-sm">{user.contact || 'No contact provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-sm line-clamp-1">{user.address}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Building2 size={16} className="text-slate-400" />
                <span className="text-sm">{user.zone}</span>
              </div>
            </div>

            <div className="p-2 bg-slate-50 mt-2">
              <button
                onClick={() => {
                  setShowActivity(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded-xl transition-all"
              >
                <History size={16} />
                {user.role === 'restaurant' ? 'Your Listings' : 'Your Claims'}
              </button>
              <button
                data-action="edit-profile"
                onClick={() => {
                  setIsEditing(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded-xl transition-all mt-1"
              >
                <Settings size={16} />
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all mt-1"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <EditProfileModal user={user} onClose={() => setIsEditing(false)} onUpdate={setUser} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActivity && (
          <ActivityModal user={user} onClose={() => setShowActivity(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditProfileModal({ user, onClose, onUpdate }: { user: User, onClose: () => void, onUpdate: (user: User) => void }) {
  const [formData, setFormData] = useState({
    name: user.name,
    orgName: user.orgName,
    email: user.email || '',
    contact: user.contact || '',
    address: user.address,
    zone: user.zone,
    avatar_url: user.avatar_url || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for safety with Base64
        setError('Image is too large. Please select an image under 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onUpdate(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl">
              {error}
            </div>
          )}

          <div className="flex justify-center pb-2">
            <div className="relative group">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-all relative"
              >
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Camera size={24} />
                    <span className="text-[10px] font-bold uppercase">Click to Upload</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-xl shadow-lg border-2 border-white hover:bg-emerald-700 transition-colors"
                title="Upload from device"
              >
                <Camera size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Profile Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={formData.avatar_url}
              onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 px-1 italic">Provide a link to your organization's logo or profile picture.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Full Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Organization</label>
              <input
                required
                type="text"
                value={formData.orgName}
                onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Email Address</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Contact Number</label>
              <input
                required
                type="tel"
                value={formData.contact}
                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Zone</label>
            <select
              value={formData.zone}
              onChange={e => setFormData({ ...formData, zone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
            >
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Address</label>
            <textarea
              required
              rows={3}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
