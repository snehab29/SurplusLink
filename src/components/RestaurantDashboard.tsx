import React, { useState, useEffect } from 'react';
import { Listing, Claim } from '../types';
import { Plus, Clock, CheckCircle2, AlertCircle, ChevronRight, Loader2, Utensils } from 'lucide-react';
import { ListingCard } from './ListingCard';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';

export function RestaurantDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedListingClaims, setSelectedListingClaims] = useState<{listingId: number, claims: Claim[]} | null>(null);

  const [formData, setFormData] = useState({
    food_description: '',
    total_meals: 10,
    cooked_time: new Date().toISOString().slice(0, 16),
    pickup_window_hours: 2,
    safety_waiver: false
  });

  const fetchListings = async () => {
    try {
      const res = await apiFetch('/api/listings/my');
      const data = await res.json();
      if (Array.isArray(data)) {
        setListings(data);
      } else {
        console.error('Expected array of listings, got:', data);
        setListings([]);
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.safety_waiver) {
      setError("Please accept the safety waiver before posting.");
      return;
    }
    
    try {
      const res = await apiFetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsAdding(false);
        setFormData({
          food_description: '',
          total_meals: 10,
          cooked_time: new Date().toISOString().slice(0, 16),
          pickup_window_hours: 2,
          safety_waiver: false
        });
        fetchListings();
      } else {
        setError(data.error || 'Failed to create listing');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Submit error:', err);
    }
  };

  const viewClaims = async (listingId: number) => {
    const res = await apiFetch(`/api/claims/listing/${listingId}`);
    const data = await res.json();
    setSelectedListingClaims({ listingId, claims: data });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Restaurant Dashboard</h2>
          <p className="text-slate-500">Manage your surplus food listings and track claims.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Create Listing
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">New Surplus Listing</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 font-bold">Close</button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Food Description</label>
                  <textarea
                    required
                    value={formData.food_description}
                    onChange={e => setFormData({ ...formData, food_description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    placeholder="e.g. 20 portions of Paneer Butter Masala and Roti"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Meals</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.total_meals}
                      onChange={e => setFormData({ ...formData, total_meals: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pickup Window (Hours)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="24"
                      value={formData.pickup_window_hours}
                      onChange={e => setFormData({ ...formData, pickup_window_hours: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cooked Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.cooked_time}
                    onChange={e => setFormData({ ...formData, cooked_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                    {error}
                  </div>
                )}
                <label className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer group">
                  <input
                    type="checkbox"
                    required
                    checked={formData.safety_waiver}
                    onChange={e => setFormData({ ...formData, safety_waiver: e.target.checked })}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-emerald-800 font-medium">
                    I confirm the food is fresh, stored safely, and follows all hygiene standards.
                  </span>
                </label>
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Post Listing
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(listings) && listings.map(listing => (
          <div key={listing.id} className="relative group">
            <ListingCard listing={listing} />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => viewClaims(listing.id)}
                className="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                View Claims
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {listings.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No listings yet</h3>
            <p className="text-slate-500">Start by creating your first surplus food listing.</p>
          </div>
        )}
      </div>

      {/* Claims Modal */}
      <AnimatePresence>
        {selectedListingClaims && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Claims for Listing #{selectedListingClaims.listingId}</h3>
                <button onClick={() => setSelectedListingClaims(null)} className="text-slate-400 hover:text-slate-600">Close</button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {selectedListingClaims.claims.map(claim => (
                  <div key={claim.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-slate-900">{claim.ngo_name}</div>
                        <div className="text-xs text-slate-500">{claim.ngo_contact}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-600">{claim.meals_claimed}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Meals</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {claim.status === 'COMPLETED' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Picked Up
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Pickup
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {selectedListingClaims.claims.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm italic">
                    No claims yet for this listing.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
