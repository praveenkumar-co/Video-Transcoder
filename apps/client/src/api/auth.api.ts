import { API_BASE } from './config';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  role: 'free' | 'premium';
}

export interface AuthResponse {
  user: UserProfile;
  token?: string;
}

// Helper to inject Bearer token into headers
export function getAuthHeaders(contentType?: string): HeadersInit {
  const token = localStorage.getItem('videoforge-token');
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function signupAPI(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Signup failed');
  }

  const json = await res.json();
  const data = json.data as AuthResponse;
  if (data.token) {
    localStorage.setItem('videoforge-token', data.token);
  }
  return data;
}

export async function loginAPI(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Login failed');
  }

  const json = await res.json();
  const data = json.data as AuthResponse;
  if (data.token) {
    localStorage.setItem('videoforge-token', data.token);
  }
  return data;
}

export async function googleAuthAPI(idToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Google Sign-In failed');
  }

  const json = await res.json();
  const data = json.data as AuthResponse;
  if (data.token) {
    localStorage.setItem('videoforge-token', data.token);
  }
  return data;
}

export async function getProfileAPI(): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/profile/profile`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Session invalid');
  }

  const json = await res.json();
  return json.data as AuthResponse;
}

export async function signoutAPI(): Promise<void> {
  // Clear local references first
  localStorage.removeItem('videoforge-token');

  const res = await fetch(`${API_BASE}/api/auth/signout`, {
    method: 'POST',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Signout failed');
  }
}

export async function updateProfileAPI(data: { name?: string; username?: string; avatarUrl?: string; role?: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/profile/profile`, {
    method: 'PUT',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Failed to update profile');
  }

  const json = await res.json();
  return json.data as AuthResponse;
}

export async function getUserVideosAPI(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/profile/videos`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? 'Failed to fetch user videos');
  }

  const json = await res.json();
  return json.data;
}

export async function checkUsernameAPI(username: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    return false;
  }
  const body = await res.json();
  return body.data?.available ?? false;
}


