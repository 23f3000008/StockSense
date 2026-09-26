import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stocksense_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

export const apiError = (error) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Something went wrong.';
