export interface Complex {
  id: string;
  slug: string;
  name: string;
  address: string;
  district: string;
  subway?: string;
  price_from: number;
  price_label: string;
  status: 'building' | 'done' | 'project';
  deadline?: string;
  builder: string;
  images: string[];
  units_count: number;
  lat?: number;
  lng?: number;
}

export interface Apartment {
  id: string;
  complex_id: string;
  complex_name: string;
  complex_slug: string;
  rooms: number | 'studio';
  area: number;
  floor: number;
  total_floors: number;
  price: number;
  price_label: string;
  finishing: string;
  deadline: string;
  image?: string;
  layout_image?: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
}

export interface LeadRequest {
  name: string;
  phone: string;
  comment?: string;
  source?: string;
}

export type UserRole = 'client' | 'agent' | 'manager' | 'editor' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  avatar?: string;
}
