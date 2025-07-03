import axios from "axios";

// Create axios instance with default config
export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 60 * 60 * 1000, // Set timeout to 1 hour
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies with requests
});

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle connection refused errors
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      throw new APIError(
        "Unable to connect to the server. Please check if the server is running.",
        "CONNECTION_ERROR"
      );
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      throw new APIError(
        "Request timed out. Please try again.",
        "TIMEOUT_ERROR"
      );
    }

    // Handle unauthorized errors
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }
    }

    // Handle other errors
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    throw new APIError(message, status, error.response?.data);
  }
);

// Check server connection
export const checkServerConnection = async () => {
  try {
    await axiosInstance.get("/products");
    return true;
  } catch (error) {
    if (error instanceof APIError && error.status === "CONNECTION_ERROR") {
      return false;
    }
    return true; // If we get any other error, the server is at least running
  }
};

export default axiosInstance;
