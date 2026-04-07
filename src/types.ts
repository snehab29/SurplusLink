export type UserRole = 'restaurant' | 'ngo' | 'admin';

export interface User {
  id: number;
  name: string;
  contact: string;
  address: string;
  zone: string;
  role: UserRole;
}

export interface Listing {
  id: number;
  restaurant_id: number;
  restaurant_name?: string;
  zone: string;
  food_description: string;
  total_meals: number;
  meals_remaining: number;
  cooked_time: string;
  expiry_time: string;
  status: 'ACTIVE' | 'EXPIRED';
  created_at: string;
}

export interface Claim {
  id: number;
  listing_id: number;
  ngo_id: number;
  ngo_name?: string;
  ngo_contact?: string;
  meals_claimed: number;
  status: 'PENDING' | 'COMPLETED';
  pickup_time: string | null;
  created_at: string;
  food_description?: string;
  zone?: string;
  restaurant_name?: string;
}

export const ZONES = [
  "Vaishali Nagar",
  "Nirman Nagar",
  "Ajmer Road"
];
