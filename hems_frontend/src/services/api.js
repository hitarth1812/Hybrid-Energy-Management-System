import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Generic CRUD helper
const createCrudService = (resource) => ({
  getAll: (params) => api.get(`/api/${resource}/`, { params }),
  create: (data) => api.post(`/api/${resource}/`, data),
  update: (id, data) => api.put(`/api/${resource}/${id}/`, data),
  delete: (id) => api.delete(`/api/${resource}/${id}/`),
})

// Device API
export const deviceService = {
  ...createCrudService('devices'),
  getMetadata: () => api.get('/api/devices/metadata/'),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/devices/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export const brandService = createCrudService('brands')
export const buildingService = createCrudService('buildings')
export const roomService = createCrudService('rooms')
export const categoryService = createCrudService('categories')

// Bulk Upload API (Legacy wrapper)
export const bulkUploadDevices = async (file) => {
  try {
    const response = await deviceService.upload(file);
    return response.data;
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      const customError = new Error(errorData.error || 'Upload failed');
      customError.details = errorData;
      throw customError;
    }
    throw error;
  }
};


// Energy Usage API
export const energyService = {
  getAll: () => api.get('/api/energy-usages/'),
  getByDevice: (deviceId) => api.get(`/api/energy-usages/?device=${deviceId}`),
  create: (data) => api.post('/api/energy-usages/', data),
  update: (id, data) => api.put(`/api/energy-usages/${id}/`, data),
  delete: (id) => api.delete(`/api/energy-usages/${id}/`),
}

// Analytics API
export const analyticsService = {
  getEmissionStats: () => api.get('/api/analytics/emissions/'),
  getEnergyStats: () => api.get('/api/analytics/energy/'),
  getDeviceStats: () => api.get('/api/analytics/devices/'),
}

export default api
