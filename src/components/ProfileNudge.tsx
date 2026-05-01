import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Camera, Mail, Phone, ArrowRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProfileMenu } from './ProfileMenu';

export function ProfileNudge() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(`nudge_dismissed_${user?.id}`) === 'true';
  });

  useEffect(() => {
    if (!user || isDismissed) {
      setIsVisible(false);
      return;
    }

    const isProfileIncomplete = !user.avatar_url || !user.email || !user.contact;
    
    if (isProfileIncomplete) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem(`nudge_dismissed_${user?.id}`, 'true');
  };

  if (!user || !isVisible) return null;

  const missingFields = [
    { key: 'avatar_url', label: 'Profile Picture', icon: Camera },
    { key: 'email', label: 'Email Address', icon: Mail },
    { key: 'contact', label: 'Phone Number', icon: Phone },
  ].filter(f => !user[f.key as keyof typeof user]);

  if (missingFields.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
    >
      <div className="bg-white rounded-3xl shadow-2xl shadow-emerald-200/50 border border-emerald-100 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-600">
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <button 
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-white">Complete Your Profile</h3>
            <p className="text-white/80 text-sm mt-1">
              Building trust helps successful food redistribution.
            </p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            {missingFields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-3 text-slate-600">
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  <field.icon size={14} className="text-emerald-600" />
                </div>
                <span className="text-xs font-semibold">{field.label} is missing</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => {
              // We want to trigger the profile edit modal.
              // Since ProfileMenu is already in Layout, we could try to simulate a click 
              // or use a more global state. For now, let's just guide them.
              const profileBtn = document.querySelector('[data-action="edit-profile"]') as HTMLButtonElement;
              if (profileBtn) {
                profileBtn.click();
              } else {
                // Fallback: Notify user to click on profile menu
                window.alert("Please open your Profile Menu and click 'Edit Profile'");
              }
            }}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 group"
          >
            Update Profile Now
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
