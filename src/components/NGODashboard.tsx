import React, { useState, useEffect } from 'react';
import { Listing, Claim, ZONES } from '../types';
import { Search, Filter, Clock, CheckCircle2, Loader2, Heart, MapPin, Utensils, AlertCircle } from 'lucide-react';
import { ListingCard } from './ListingCard';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { formatDateTimeToIST, formatToIST } from '../lib/utils';

export function NGODashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterZone, setFilterZone] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [claimAmount, setClaimAmount] = useState(1);
  const [claiming, setClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-claims'>('browse');
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [listingsRes, claimsRes] = await Promise.all([
        apiFetch(`/api/listings?zone=${encodeURIComponent(filterZone)}&sort=${sortBy}`),
        apiFetch('/api/claims/my')
      ]);
      
      if (!listingsRes.ok) {
        const errData = await listingsRes.json();
        throw new Error(errData.error || 'Failed to fetch listings');
      }
      if (!claimsRes.ok) {
        const errData = await claimsRes.json();
        throw new Error(errData.error || 'Failed to fetch claims');
      }

      const [listingsData, claimsData] = await Promise.all([
        listingsRes.json(),
        claimsRes.json()
      ]);
      
      console.log('NGO Dashboard Data:', { listings: listingsData, claims: claimsData });
      
      setListings(Array.isArray(listingsData) ? listingsData : []);
      setMyClaims(Array.isArray(claimsData) ? claimsData.filter((c: any) => c.status !== 'CANCELLED') : []);
    } catch (err: any) {
      console.error('NGO Dashboard Fetch Error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterZone, sortBy]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;
    setClaiming(true);

    try {
      const res = await apiFetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: selectedListing.id,
          meals_claimed: claimAmount
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSelectedListing(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const confirmPickup = async (claimId: number) => {
    const res = await apiFetch(`/api/claims/${claimId}/pickup`, { 
      method: 'POST',
    });
    if (res.ok) fetchData();
  };

  const cancelClaim = async (claimId: number) => {
    if (!confirm("Are you sure you want to cancel this claim?")) return;
    
    // Optimistic update
    setMyClaims(current => current.filter(c => c.id !== claimId));

    try {
      const res = await apiFetch(`/api/claims/${claimId}/cancel`, { method: 'POST' });
      if (res.ok) {
        fetchData();
      } else {
        fetchData(); // Rollback
        const data = await res.json();
        alert(data.error || "Failed to cancel claim");
      }
    } catch (err) {
      console.error('Failed to cancel claim:', err);
      fetchData(); // Rollback
    }
  };

  if (loading && listings.length === 0) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900">NGO Dashboard</h2>
          <p className="text-slate-500">Browse available surplus food and manage your claims.</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'browse' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Browse Food
          </button>
          <button
            onClick={() => setActiveTab('my-claims')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'my-claims' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            My Claims
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {activeTab === 'browse' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterZone}
                onChange={e => setFilterZone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none font-medium text-slate-700"
              >
                <option value="">All Zones</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none font-medium text-slate-700"
              >
                <option value="newest">Newest First</option>
                <option value="least_time">Least Time Remaining</option>
                <option value="most_meals">Most Meals Remaining</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(listings) && listings.map(listing => (
              <div key={listing.id}>
                <ListingCard
                  listing={listing}
                  showClaimButton
                  onClaim={setSelectedListing}
                />
              </div>
            ))}
            {listings.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">No active listings</h3>
                <p className="text-slate-500">Check back later or try a different zone.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(myClaims) && myClaims.map(claim => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={claim.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{claim.restaurant_name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                        {claim.zone}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-600 leading-none">{claim.meals_claimed}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Meals</div>
                  </div>
                </div>
                <p className="text-slate-600 text-sm mb-4 italic">"{claim.food_description}"</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
                  <Clock className="w-3.5 h-3.5" />
                  Claimed: {formatDateTimeToIST(claim.created_at)}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {claim.status === 'COMPLETED' ? (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      Picked Up
                    </div>
                    {claim.pickup_time && (
                      <div className="text-[10px] text-slate-400 mt-1 ml-7 italic">
                        at {formatToIST(claim.pickup_time)}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                      <Clock className="w-5 h-5" />
                      Pending Pickup
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => cancelClaim(claim.id)}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmPickup(claim.id)}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Confirm Pickup
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
          {myClaims.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No claims yet</h3>
              <p className="text-slate-500">Browse food listings to make your first claim.</p>
            </div>
          )}
        </div>
      )}

      {/* Claim Modal */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-emerald-100 p-3 rounded-2xl">
                    <Utensils className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Claim Meals</h3>
                    <p className="text-sm text-slate-500">{selectedListing.restaurant_name}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500 font-medium">Available Meals</span>
                    <span className="text-lg font-black text-slate-900">{selectedListing.meals_remaining}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Zone</span>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">{selectedListing.zone}</span>
                  </div>
                </div>

                <form onSubmit={handleClaim} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">How many meals will you pick up?</label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setClaimAmount(Math.max(1, claimAmount - 1))}
                        className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={claimAmount}
                        onChange={e => setClaimAmount(Math.min(selectedListing.meals_remaining, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="flex-1 h-12 text-center bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setClaimAmount(Math.min(selectedListing.meals_remaining, claimAmount + 1))}
                        className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedListing(null)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={claiming}
                      className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                    >
                      {claiming ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Claim'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
