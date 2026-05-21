const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'edu_auth_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  return res.json();
}

export const educationApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const TOKEN_STORAGE_KEY = TOKEN_KEY;

export async function fetchPublicConfig(domain: string) {
  return request<Record<string, unknown>>(`/education/public/config/${domain}`);
}

export async function loginStudent(email: string, password: string, tenantDomain: string) {
  return request<{ access_token: string; student: Record<string, unknown> }>('/education/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, tenantDomain }),
  });
}

export async function loginTeacher(email: string, password: string) {
  return request<{ access_token: string; user: Record<string, unknown> }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
