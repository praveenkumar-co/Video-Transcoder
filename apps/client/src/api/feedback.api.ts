import { API_BASE } from './config';
import { getAuthHeaders } from './auth.api';

export interface FeedbackData {
  rating: number;
  feedback: string;
}

export interface FeedbackItem {
  _id: string;
  userId: string;
  name: string;
  email: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export async function submitFeedback(data: FeedbackData): Promise<FeedbackItem> {
  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? body.message ?? `Failed to send feedback (HTTP ${res.status})`
    );
  }
  const json = await res.json();
  return json.data as FeedbackItem;
}

export async function getMyFeedbackAPI(): Promise<FeedbackItem[]> {
  const res = await fetch(`${API_BASE}/api/feedback/my-feedback`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? body.message ?? `Failed to fetch feedback (HTTP ${res.status})`
    );
  }
  const json = await res.json();
  return json.data as FeedbackItem[];
}

export async function updateFeedbackAPI(feedbackId: string, data: FeedbackData): Promise<FeedbackItem> {
  const res = await fetch(`${API_BASE}/api/feedback/${feedbackId}`, {
    method: 'PUT',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? body.message ?? `Failed to update feedback (HTTP ${res.status})`
    );
  }
  const json = await res.json();
  return json.data as FeedbackItem;
}

export async function deleteFeedbackAPI(feedbackId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/feedback/${feedbackId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? body.message ?? `Failed to delete feedback (HTTP ${res.status})`
    );
  }
}

