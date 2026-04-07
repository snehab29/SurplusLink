import React, { useState, useEffect } from 'react';
import { Utensils, Heart, CheckCircle2, AlertCircle, MapPin, Loader2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../lib/api';

interface Stats {
  totalMealsListed: number;
  totalMealsClaimed: number;
  totalMealsPickedUp: number;
  activeListingsCount: number;
  expiredListingsCount: number;
  zoneDistribution: { zone: string; count: number }[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Meals Listed', value: stats.totalMealsListed, icon: Utensils, color: 'bg-blue-500' },
    { label: 'Total Meals Claimed', value: stats.totalMealsClaimed, icon: Heart, color: 'bg-emerald-500' },
    { label: 'Total Picked Up', value: stats.totalMealsPickedUp, icon: CheckCircle2, color: 'bg-indigo-500' },
    { label: 'Active Listings', value: stats.activeListingsCount, icon: TrendingUp, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Admin Overview</h2>
        <p className="text-slate-500">Platform-wide statistics and distribution.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.label}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
          >
            <div className={`${card.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-slate-100`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-black text-slate-900">{card.value}</div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Zone Distribution
          </h3>
          <div className="space-y-6">
            {stats.zoneDistribution.map((z, i) => {
              const percentage = (z.count / (stats.activeListingsCount + stats.expiredListingsCount || 1)) * 100;
              return (
                <div key={z.zone}>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-700">{z.zone}</span>
                    <span className="text-slate-500">{z.count} listings</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
            {stats.zoneDistribution.length === 0 && (
              <p className="text-slate-500 italic text-center py-8">No data available yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="bg-emerald-50 p-6 rounded-full mb-6">
            <Heart className="w-12 h-12 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Platform Impact</h3>
          <p className="text-slate-500 max-w-xs">
            Through SurplusLink, we've successfully redistributed <span className="font-bold text-emerald-600">{stats.totalMealsPickedUp}</span> meals to those in need across Jaipur.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 w-full">
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.expiredListingsCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expired</div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {Math.round((stats.totalMealsClaimed / (stats.totalMealsListed || 1)) * 100)}%
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
