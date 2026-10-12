import axios from "axios";
import { retryWithRefresh } from "./sessionRefresh";

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for handling cookies
});

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // No need to manually add token as it's handled by cookies
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// On 401: refresh the session once and retry (see sessionRefresh.js).
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const retried = await retryWithRefresh(apiClient, error);
    if (retried) return retried;
    return Promise.reject(error);
  }
);
