import { API_BASE } from './config';

export interface ContactQueryData {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  message: string;
}

export async function submitContactQuery(data: ContactQueryData): Promise<void> {
  const res = await fetch(`${API_BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? body.message ?? `Failed to send message (HTTP ${res.status})`
    );
  }
}
