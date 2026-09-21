import { supabase } from '../utils/supabase';
import { config } from '../config/env';

const API_BASE_URL = config.apiUrl;

export type ApiResponse<T = Record<string, any>> = {
  success: boolean;
  message?: string;
  data?: any;
} & T;



export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * Lightweight API client attaching authenticated Supabase Bearer token when present.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers, ...customConfig } = options;

  // Normalize endpoint URL
  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Get current active Supabase session
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: requestHeaders,
      ...customConfig,
    });
  } catch (err: any) {
    throw {
      status: 0,
      success: false,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Please check your internet connection or try again shortly.',
    };
  }

  let responseData: ApiResponse<T>;
  try {
    responseData = await response.json();
  } catch {
    responseData = {
      success: response.ok,
      message: response.statusText || 'Unexpected server response',
    } as ApiResponse<T>;
  }

  if (!response.ok) {
    // Session expired
    if (response.status === 401) {
      // Allow caller to handle or trigger logout if token expired
      console.warn('Session expired or unauthorized request (401)');
    }

    throw {
      status: response.status,
      ...responseData,
      message: responseData.message || (response.status === 403 ? 'Access forbidden. Please verify your permissions or subscription.' : 'Request failed'),
    };
  }

  return responseData;
}

export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'GET', ...options }),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }),
};
