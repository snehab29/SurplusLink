export type UserRole = 'restaurant' | 'ngo' | 'admin';

export interface User {
  id: number;
  name: string;
  orgName: string;
  contact?: string;
  email?: string;
  address: string;
  zone: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Listing {
  id: number;
  restaurant_id: number;
  restaurant_name?: string;
  restaurant_avatar?: string;
  zone: string;
  food_description: string;
  category: 'NORMAL' | 'BAKERY_SWEETS';
  total_meals: number;
  meals_remaining: number;
  cooked_time: string;
  expiry_time: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REMOVED' | 'EDITED';
  created_at: string;
}

export interface Claim {
  id: number;
  listing_id: number;
  ngo_id: number;
  ngo_name?: string;
  ngo_contact?: string;
  meals_claimed: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  pickup_time: string | null;
  created_at: string;
  food_description?: string;
  zone?: string;
  restaurant_name?: string;
  restaurant_contact?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'CLAIM' | 'EXPIRY_WARNING';
  message: string;
  related_id: number;
  is_read: boolean;
  created_at: string;
}

export const ZONES = [
  "Vaishali Nagar",
  "Nirman Nagar",
  "Ajmer Road"
];
