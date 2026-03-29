export interface Overview {
  revenue: { today: number; week: number; month: number };
  events_by_type: Record<string, number>;
  conversion_rate: number | null;
}

export interface TopProduct {
  product_id: string;
  revenue: number;
}

export interface RecentEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface SessionUser {
  id: string;
  email: string;
  store_id: string;
}

export interface LoginResponse {
  access_token: string;
  user: SessionUser;
}
