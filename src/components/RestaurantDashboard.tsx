import React, { useState, useEffect } from 'react';
import { Listing, Claim } from '../types';
import { Plus, Clock, CheckCircle2, AlertCircle, ChevronRight, Loader2, Utensils, Trash2, Edit3, Save, X as CloseIcon } from 'lucide-react';
import { ListingCard } from './ListingCard';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { getISTNowForInput, istToUTC, formatDateTimeToIST, getISTDateForInput, cn } from '../lib/utils';

export function RestaurantDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [selectedListingClaims, setSelectedListingClaims] = useState<{listingId: number, claims: Claim[]} | null>(null);

  const [formData, setFormData] = useState({
    food_description: '',
    category: 'NORMAL' as 'NORMAL' | 'BAKERY_SWEETS',
    total_meals: 10,
    cooked_date: getISTDateForInput(),
    cooked_hour: '10',
    cooked_minute: '00',
    cooked_ampm: 'AM',
    safety_waiver: false
  });

  const [editFormData, setEditFormData] = useState({
    food_description: '',
    total_meals: 10
  });

  const getCookedTimeISO = (date: string, hour: string, minute: string, ampm: string) => {
    let h = parseInt(hour);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const timeStr = `${h.toString().padStart(2, '0')}:${minute}:00`;
    return istToUTC(`${date}T${timeStr}`);
  };

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
      const cooked_time = getCookedTimeISO(formData.cooked_date, formData.cooked_hour, formData.cooked_minute, formData.cooked_ampm);
      const res = await apiFetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_description: formData.food_description,
          category: formData.category,
          total_meals: formData.total_meals,
          cooked_time
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsAdding(false);
        setFormData({
          food_description: '',
          category: 'NORMAL',
          total_meals: 10,
          cooked_date: getISTDateForInput(),
          cooked_hour: '10',
          cooked_minute: '00',
          cooked_ampm: 'AM',
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    setError('');

    try {
      const res = await apiFetch(`/api/listings/${editingListing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (res.ok) {
        setEditingListing(null);
        fetchListings();
      } else {
        setError(data.error || 'Failed to update listing');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const startEditing = (listing: Listing) => {
    setEditingListing(listing);
    setEditFormData({
      food_description: listing.food_description,
      total_meals: listing.total_meals
    });
    setError('');
  };

  const activeListings = listings.filter(l => l.status === 'ACTIVE' || l.status === 'EDITED');
  const historyListings = listings.filter(l => l.status !== 'ACTIVE' && l.status !== 'EDITED');

  const viewClaims = async (listingId: number) => {
    const res = await apiFetch(`/api/claims/listing/${listingId}`);
    const data = await res.json();
    setSelectedListingClaims({ listingId, claims: data });
  };

  const handleRemoveListing = async (listingId: number) => {
    if (!confirm("Are you sure you want to remove this listing? It will no longer be available for NGOs.")) return;
    try {
      const res = await apiFetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchListings();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove listing");
      }
    } catch (err) {
      console.error('Remove error:', err);
    }
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

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            "px-6 py-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'ACTIVE' 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Active Listings ({activeListings.length})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={cn(
            "px-6 py-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'HISTORY' 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Past Listings ({historyListings.length})
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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      required
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    >
                      <option value="NORMAL">Regular Food (4h)</option>
                      <option value="BAKERY_SWEETS">Bakery/Sweets (6h)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Meals</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.total_meals}
                      onChange={e => setFormData({ ...formData, total_meals: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cooking Time (approx)</label>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <input
                        type="date"
                        required
                        value={formData.cooked_date}
                        onChange={e => setFormData({ ...formData, cooked_date: e.target.value })}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                    <select
                      value={formData.cooked_hour}
                      onChange={e => setFormData({ ...formData, cooked_hour: e.target.value })}
                      className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      value={formData.cooked_minute}
                      onChange={e => setFormData({ ...formData, cooked_minute: e.target.value })}
                      className="px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    >
                      {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={formData.cooked_ampm}
                      onChange={e => setFormData({ ...formData, cooked_ampm: e.target.value })}
                      className="col-span-4 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 font-medium">Select the approximate time the food was cooked.</p>
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
        {(activeTab === 'ACTIVE' ? activeListings : historyListings).map(listing => (
          <div key={listing.id} className="relative group">
            <ListingCard listing={listing} />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => viewClaims(listing.id)}
                className="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                Claims
                <ChevronRight className="w-3 h-3" />
              </button>
              {listing.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => startEditing(listing)}
                    className="py-2 px-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
                    title="Edit Listing"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveListing(listing.id)}
                    className="py-2 px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shadow-sm"
                    title="Remove Listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {(activeTab === 'ACTIVE' ? activeListings : historyListings).length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">
              {activeTab === 'ACTIVE' ? 'No active listings' : 'No past listings'}
            </h3>
            <p className="text-slate-500">
              {activeTab === 'ACTIVE' ? 'Start by creating your first surplus food listing.' : 'Expired or removed listings will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingListing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-600" />
                  Edit Listing
                </h3>
                <button onClick={() => setEditingListing(null)} className="text-slate-400 hover:text-slate-600">
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Food Description</label>
                  <textarea
                    required
                    value={editFormData.food_description}
                    onChange={e => setEditFormData({ ...editFormData, food_description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-700"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Meals</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      required
                      min="1"
                      value={editFormData.total_meals}
                      onChange={e => setEditFormData({ ...editFormData, total_meals: parseInt(e.target.value) })}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    />
                    <div className="text-xs text-slate-400 max-w-[120px]">
                      Currently {editingListing.total_meals - editingListing.meals_remaining} meals are claimed.
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingListing(null)}
                    className="flex-1 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        <div className="text-[9px] text-slate-400 mt-1">{formatDateTimeToIST(claim.created_at)}</div>
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
