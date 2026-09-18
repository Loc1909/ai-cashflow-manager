export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  is_active: boolean;
}

// Backend giờ trả user info trong body, còn access/refresh token nằm
// trong httpOnly cookie (không có trong JSON) — xem app/schemas/auth.py.
export interface AuthResponse {
  user: AuthUser;
}