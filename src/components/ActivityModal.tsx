import React, { useState, useEffect } from 'react';
import { Listing, Claim, User } from '../types';
import { apiFetch } from '../lib/api';
import { formatDateTimeToIST, cn } from '../lib/utils';
import { 
  X, 
  History, 
  Utensils, 
  Heart, 
  Clock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { motion } from 'motion/react';

interface ActivityModalProps {
  user: User;
  onClose: () => void;
}

export function ActivityModal({ user, onClose }: ActivityModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ listings?: Listing[], claims?: Claim[] }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'restaurant') {
          const res = await apiFetch('/api/listings/my');
          const listings = await res.json();
          setData({ listings: Array.isArray(listings) ? listings : [] });
        } else if (user.role === 'ngo') {
          const res = await apiFetch('/api/claims/my');
          const claims = await res.json();
          setData({ claims: Array.isArray(claims) ? claims : [] });
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.role]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'EDITED': return 'bg-blue-100 text-blue-700';
      case 'EXPIRED': return 'bg-slate-100 text-slate-600';
      case 'REMOVED': return 'bg-rose-100 text-rose-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Utensils size={12} />;
      case 'EDITED': return <Edit3 size={12} />;
      case 'EXPIRED': return <Clock size={12} />;
      case 'REMOVED': return <Trash2 size={12} />;
      case 'PENDING': return <Clock size={12} />;
      case 'COMPLETED': return <CheckCircle2 size={12} />;
      case 'CANCELLED': return <AlertCircle size={12} />;
      default: return null;
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
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {user.role === 'restaurant' ? 'Your Listing Activity' : 'Your Claim Activity'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Role: {user.role}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-emerald-600" />
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing History...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {user.role === 'restaurant' ? (
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-100 p-4">
                    <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">#</div>
                    <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Dish Name</div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Qty</div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Created At (IST)</div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {data.listings?.map((l, i) => (
                      <div key={l.id} className="grid grid-cols-12 p-4 items-center hover:bg-emerald-50/30 transition-colors">
                        <div className="col-span-1 text-xs font-mono text-slate-400">{(i + 1).toString().padStart(2, '0')}</div>
                        <div className="col-span-4 text-sm font-bold text-slate-700 line-clamp-1">{l.food_description}</div>
                        <div className="col-span-2">
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            {l.total_meals}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            getStatusStyle(l.status)
                          )}>
                            {getStatusIcon(l.status)}
                            {l.status}
                          </div>
                        </div>
                        <div className="col-span-3 text-xs font-bold text-slate-500 font-mono">
                          {formatDateTimeToIST(l.created_at)}
                        </div>
                      </div>
                    ))}
                    {data.listings?.length === 0 && (
                      <div className="p-12 text-center text-slate-400 italic text-sm">No listing activity found.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-100 p-4">
                    <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">#</div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Dish Name</div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Restaurant</div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Claimed</div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date (IST)</div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {data.claims?.map((c, i) => (
                      <div key={c.id} className="grid grid-cols-12 p-4 items-center hover:bg-emerald-50/30 transition-colors">
                        <div className="col-span-1 text-xs font-mono text-slate-400">{(i + 1).toString().padStart(2, '0')}</div>
                        <div className="col-span-3 text-sm font-bold text-slate-700 line-clamp-1">{c.food_description}</div>
                        <div className="col-span-3">
                          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {c.restaurant_name}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            {c.meals_claimed}
                          </span>
                        </div>
                        <div className="col-span-3 text-xs font-bold text-slate-500 font-mono">
                          {formatDateTimeToIST(c.created_at)}
                        </div>
                      </div>
                    ))}
                    {data.claims?.length === 0 && (
                      <div className="p-12 text-center text-slate-400 italic text-sm">No claim activity found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
          <span>SurplusLink Tracking System v1.0</span>
          <span>Timezone: IST (UTC+5:30)</span>
        </div>
      </motion.div>
    </div>
  );
}
