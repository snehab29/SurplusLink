import React, { useState, useEffect } from 'react';
import { Listing } from '../types';
import { Clock, MapPin, Utensils, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn, formatToIST } from '../lib/utils';
import { motion } from 'motion/react';

interface ListingCardProps {
  listing: Listing;
  onClaim?: (listing: Listing) => void;
  showClaimButton?: boolean;
}

export function ListingCard({ listing, onClaim, showClaimButton }: ListingCardProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const expiry = new Date(listing.expiry_time).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [listing.expiry_time]);

  const isExpired = listing.status === 'EXPIRED' || listing.status === 'REMOVED' || timeLeft === 'Expired';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all hover:shadow-lg hover:shadow-slate-200/50 flex flex-col justify-between",
        isExpired && "opacity-75 grayscale-[0.5]"
      )}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-600 font-bold overflow-hidden border border-slate-100">
              {listing.restaurant_avatar ? (
                <img src={listing.restaurant_avatar} alt={listing.restaurant_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                listing.restaurant_name?.charAt(0)
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{listing.restaurant_name}</h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                  {listing.zone}
                </span>
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  listing.status === 'EXPIRED' ? "bg-slate-100 text-slate-600" :
                  listing.status === 'REMOVED' ? "bg-rose-100 text-rose-700" :
                  listing.status === 'EDITED' ? "bg-blue-100 text-blue-700" :
                  "bg-emerald-100 text-emerald-700"
                )}>
                  {listing.status === 'ACTIVE' && timeLeft === 'Expired' ? 'Expired' : listing.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                  {listing.category?.replace('_', ' ') || 'NORMAL'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl text-center min-w-[60px] border border-slate-100">
            <div className="text-xl font-black text-emerald-600 leading-none">{listing.meals_remaining}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Meals</div>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-5 line-clamp-2 min-h-[40px]">
          {listing.food_description}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4 text-emerald-500" />
            <div className="text-xs">
              <div className="font-bold text-slate-700">{timeLeft}</div>
              <div className="text-[10px] uppercase font-medium">Remaining</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <AlertCircle className="w-4 h-4 text-emerald-500" />
            <div className="text-xs">
              <div className="font-bold text-slate-700">
                {formatToIST(listing.expiry_time)}
              </div>
              <div className="text-[10px] uppercase font-medium">Deadline</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Utensils className="w-4 h-4 text-emerald-500" />
            <div className="text-xs">
              <div className="font-bold text-slate-700">
                {formatToIST(listing.cooked_time)}
              </div>
              <div className="text-[10px] uppercase font-medium">Cooked</div>
            </div>
          </div>
        </div>

        {showClaimButton && !isExpired && (
          <button
            onClick={() => onClaim?.(listing)}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            Claim Meals
          </button>
        )}
        
        {isExpired && (
          <div className="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
            <AlertCircle className="w-4 h-4" />
            Listing Expired
          </div>
        )}
      </div>
    </motion.div>
  );
}
