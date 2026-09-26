import axios from 'axios';

// Works with Vite (import.meta.env) or falls back to a same-origin /api path.
const baseURL = import.meta?.env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // sends/receives the httpOnly auth cookie
});

// Normalizes axios errors into a plain message string the UI can display.
function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => {
      const message = err.response?.data?.message || 'Something went wrong. Please try again.';
      throw new Error(message);
    });
}

export const signup = (name, email, password) => unwrap(api.post('/auth/signup', { name, email, password }));

export const login = (email, password) => unwrap(api.post('/auth/login', { email, password }));

export const logout = () => unwrap(api.post('/auth/logout'));

export const fetchMe = () => unwrap(api.get('/auth/me'));

export const forgotPassword = (email) => unwrap(api.post('/auth/forgot-password', { email }));

export const verifyOtp = (email, otp) => unwrap(api.post('/auth/verify-otp', { email, otp }));

export const resetPassword = (resetToken, newPassword) =>
  unwrap(api.post('/auth/reset-password', { resetToken, newPassword }));
