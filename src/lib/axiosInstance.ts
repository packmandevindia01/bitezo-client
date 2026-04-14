// src/lib/axiosInstance.ts

import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken"); // ← matches your login response
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;