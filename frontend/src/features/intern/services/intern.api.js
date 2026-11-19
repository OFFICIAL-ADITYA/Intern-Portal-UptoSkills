import axios from 'axios';
import { API_BASE_URL } from '../../../shared/config/api';

const internApi = axios.create({
  baseURL: `${API_BASE_URL}/api/intern`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const getProfile = async () => {
  const response = await internApi.get('/profile');
  return response.data;
};

export const submitCertificateRequest = async (data) => {
  const response = await internApi.post('/request-certificate', data);
  return response.data;
};

export const getMyRequests = async () => {
  const response = await internApi.get('/requests');
  return response.data;
};

export const getCertificateForRequest = async (id) => {
  const response = await internApi.get(`/requests/${id}/certificate`);
  return response.data;
};

export const downloadCertificateForRequest = async (id) => {
  const response = await internApi.get(
    `/requests/${id}/certificate/download`,
    {
      responseType: 'blob',
    }
  );

  return response;
};

export const setPassword = async (data) => {
  const response = await internApi.patch('/set-password', data);
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await internApi.patch('/profile', data);
  return response.data;
};

export default {
  getProfile,
  submitCertificateRequest,
  getMyRequests,
  getCertificateForRequest,
  downloadCertificateForRequest,
  setPassword,
  updateProfile,
};
