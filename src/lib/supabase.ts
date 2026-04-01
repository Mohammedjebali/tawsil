import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type OrderStatus = "pending" | "accepted" | "picked_up" | "delivered" | "cancelled";

export interface Store {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  store_id: string | null;
  store_name: string;
  store_address: string | null;
  items_description: string;
  estimated_amount: number | null;
  distance_km: number | null;
  delivery_fee: number;
  status: OrderStatus;
  rider_name: string | null;
  rider_phone: string | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}
