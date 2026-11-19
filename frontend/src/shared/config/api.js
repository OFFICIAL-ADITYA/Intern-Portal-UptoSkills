/**
 * Centralized API Base URL Configuration
 * Configured via VITE_API_URL environment variable (e.g. on Vercel / Netlify / Production).
 * Defaults to http://localhost:3000 for local development.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

export default API_BASE_URL;
