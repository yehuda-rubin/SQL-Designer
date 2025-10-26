import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor לטיפול בשגיאות
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API Functions
export const projectsAPI = {
  // קבלת כל הפרויקטים
  getAll: async () => {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  // קבלת פרויקט בודד
  getById: async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  // יצירת פרויקט חדש
  create: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  },

  // עדכון פרויקט
  update: async (id, projectData) => {
    const response = await apiClient.put(`/projects/${id}`, projectData);
    return response.data;
  },

  // מחיקת פרויקט
  delete: async (id) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },
};

// בדיקת בריאות השרת
export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

export default apiClient;