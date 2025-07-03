import axios from "axios";

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

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop by checking if this is a refresh token request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh token using cookies
        await axios.post(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
          }/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Retry the original request with cookies
        return apiClient({
          ...originalRequest,
          withCredentials: true,
        });
      } catch (refreshError) {
        // Clear any existing tokens
        document.cookie =
          "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // Redirect to login
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
