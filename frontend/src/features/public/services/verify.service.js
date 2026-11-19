import axios from 'axios';
import { API_BASE_URL } from '../../../shared/config/api';

/**
 * Public Certificate Verification Service
 * Note: Never attaches auth tokens or cookies.
 *
 * @param {string} verifyId - Unguessable verification ID
 * @returns {Promise<Object|null>} Certificate data or null if not found
 */
export const verifyCertificate = async (verifyId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/verify/${encodeURIComponent(verifyId)}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error.response?.data || error;
  }
};

export default { verifyCertificate };
