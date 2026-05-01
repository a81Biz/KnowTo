// src/shared/http.client.ts
import type { ApiResponse } from '../types/wizard.types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(url: string, options: RequestOptions): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = localStorage.getItem('knowto_auth_token');
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (url.includes('undefined')) {
    console.error('[URL-CRITICAL-UNDEFINED] Se detectó "undefined" en la URL:', url);
  }
  
  console.log('[HTTP-DEBUG] Request URL:', url);

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json() as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }

  return data;
}

export const getData = <T>(url: string): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'GET' });

export const postData = <T>(url: string, body: unknown): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'POST', body });

export const putData = <T>(url: string, body: unknown): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'PUT', body });

export const patchData = <T>(url: string, body: unknown): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'PATCH', body });

export const deleteData = <T>(url: string): Promise<ApiResponse<T>> =>
  request<T>(url, { method: 'DELETE' });
