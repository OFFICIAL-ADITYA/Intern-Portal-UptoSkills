import axios from 'axios';
import { API_BASE_URL } from '../../../../shared/config/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/admin`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const getOverview = async (params) => {
  const res = await api.get('/analytics/overview', { params });
  return res.data;
};

export const getRequestsTrend = async (params) => {
  const res = await api.get('/analytics/requests-trend', { params });
  return res.data;
};

export const getCertificateTypes = async (params) => {
  const res = await api.get('/analytics/certificate-types', { params });
  return res.data;
};

export const getTurnaround = async (params) => {
  const res = await api.get('/analytics/turnaround', { params });
  return res.data;
};

export const getTeamLeaders = async (params) => {
  const res = await api.get('/analytics/team-leaders', { params });
  return res.data;
};

export const getDomains = async (params) => {
  const res = await api.get('/analytics/domains', { params });
  return res.data;
};

export const getPipeline = async (params) => {
  const res = await api.get('/analytics/pipeline', { params });
  return res.data;
};

export const getStuckRequests = async (params) => {
  const res = await api.get('/analytics/stuck', { params });
  return res.data;
};

export const getUpcomingCompletions = async (params) => {
  const res = await api.get('/analytics/upcoming-completions', { params });
  return res.data;
};

export const getFilteredRequests = async (params) => {
  const res = await api.get('/requests', { params });
  return res.data;
};

export const exportReport = async (type, params = {}, format = 'csv') => {
  const res = await api.get('/analytics/export', {
    params: { ...params, type, format },
    responseType: 'blob',
  });
  return res;
};

export default {
  getOverview,
  getRequestsTrend,
  getCertificateTypes,
  getTurnaround,
  getTeamLeaders,
  getDomains,
  getPipeline,
  getStuckRequests,
  getUpcomingCompletions,
  getFilteredRequests,
  exportReport,
};
