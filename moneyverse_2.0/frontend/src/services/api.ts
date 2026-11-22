const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('moneyverse_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('moneyverse_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('moneyverse_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP error ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // ignore
    }
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new Error(errorDetail);
  }

  // Handle CSV or non-JSON if needed
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const textData = await response.text();
    return textData as unknown as T;
  }

  return response.json();
}
