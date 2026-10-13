import api, { APIError } from "./axiosInstance";

// Helper function to format validation errors
const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors)) return null;

  // Group errors by field
  const groupedErrors = errors.reduce((acc, error) => {
    if (!acc[error.field]) {
      acc[error.field] = [];
    }
    acc[error.field].push(error.message);
    return acc;
  }, {});

  // Format into readable messages
  return Object.entries(groupedErrors)
    .map(([field, messages]) => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      return `${fieldName}: ${messages.join(", ")}`;
    })
    .join("\n");
};

// Auth API methods with improved error handling and type safety
export const authAPI = {
  // Public routes
  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      console.log("Register response:", response.data);

      // ปรับปรุงการตรวจสอบ response
      if (response.data?.status !== "success") {
        throw new APIError(
          response.data?.message || "Registration failed",
          response.status
        );
      }

      // ส่งกลับข้อมูลในรูปแบบที่สอดคล้องกัน
      return {
        success: true,
        ...response.data, // รวม status, message และ data
        user: response.data.data?.user, // แยก user object ออกมาเพื่อความสะดวก
      };
    } catch (error) {
      // The axios interceptor already turned it into an APIError (status, data).
      const status = error.response?.status ?? error.status;
      const body = error.response?.data ?? error.data;
      console.log("Register error details:", { status, data: body, message: error.message });

      // Handle specific error cases
      if (status === 409) {
        throw new APIError(
          "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบหรือใช้อีเมลอื่น",
          status
        );
      }

      // Handle validation errors
      if (status === 400) {
        const validationErrors = body?.errors;
        if (validationErrors) {
          const formattedErrors = formatValidationErrors(validationErrors);
          throw new APIError(
            formattedErrors || "Please check your input and try again",
            status,
            validationErrors
          );
        }
      }

      throw new APIError(
        body?.message || "Registration failed",
        status || 500
      );
    }
  },

  login: async (credentials) => {
    try {
      console.log("Attempting login with email:", credentials.email);

      const response = await api.post("/auth/login", {
        email: credentials.email.trim(),
        password: credentials.password,
      });

      console.log("Login response:", response.data);

      // ตรวจสอบโครงสร้าง response ที่คาดหวัง
      if (!response.data || !response.data.data?.user) {
        throw new APIError(
          response.data?.message || "Invalid server response",
          response.status
        );
      }

      return {
        success: true,
        user: response.data.data.user,
        tokens: response.data.tokens,
      };
    } catch (error) {
      // The axios interceptor already turned it into an APIError (status, data).
      const status = error.response?.status ?? error.status;
      const body = error.response?.data ?? error.data;
      console.warn("Login error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // กรณี validation error (400)
      if (status === 400) {
        const serverMessage = body?.message ?? "";
        if (serverMessage.includes("password")) {
          throw new APIError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร", 400);
        }
        if (serverMessage.includes("email")) {
          throw new APIError("รูปแบบอีเมลไม่ถูกต้อง", 400);
        }
        throw new APIError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", 400);
      }

      // กรณีอื่นๆ (data.code tells the page what happened, e.g. EMAIL_NOT_VERIFIED)
      throw new APIError(
        body?.message || "ล็อกอินไม่สำเร็จ กรุณาลองใหม่",
        status || 500,
        body ?? null
      );
    }
  },

  /** Always succeeds from the user's view; the server does not say whether the email exists. */
  resendVerification: async (email) => {
    const response = await api.post("/auth/resend-verification", { email: email.trim() });
    return response.data;
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post("/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        "Password reset request failed",
        "PASSWORD_RESET_FAILED",
        500
      );
    }
  },

  resetPassword: async (resetData) => {
    try {
      const response = await api.post("/auth/reset-password", resetData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Password reset failed", "PASSWORD_RESET_FAILED", 500);
    }
  },

  verifyEmail: async (token) => {
    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        "Email verification failed",
        "VERIFICATION_FAILED",
        500
      );
    }
  },

  // Protected routes
  getProfile: async () => {
    try {
      console.log("=== Get Profile Process Start ===");
      const response = await api.get("/users/profile", {
        withCredentials: true,
      });
      console.log("Raw profile response:", response);
      console.log("Profile response data:", response.data);

      // Check if response has the required structure
      if (!response.data?.data?.user) {
        console.error("Invalid profile response structure:", response.data);
        throw new APIError("Invalid response from server", 500);
      }

      // Format the response to match the expected structure
      const formattedResponse = {
        data: {
          data: {
            user: response.data.data.user,
          },
        },
      };

      console.log("Formatted profile response:", formattedResponse);
      console.log("=== Get Profile Process End ===");
      return formattedResponse;
    } catch (error) {
      console.error("=== Get Profile Error ===");
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new APIError("Unauthorized. Please log in again.", 401);
      }

      if (error.response?.status === 404) {
        throw new APIError("Profile not found", 404);
      }

      // Handle other errors
      throw new APIError(
        error.response?.data?.message || "Failed to fetch profile",
        error.response?.status || 500
      );
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.post("/auth/change-password", passwordData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        "Password change failed",
        "PASSWORD_CHANGE_FAILED",
        500
      );
    }
  },

  logout: async () => {
    try {
      // Just call logout endpoint to clear cookies
      await api.post("/auth/logout");

      // Clear any local storage items if needed
      localStorage.removeItem("user");

      return {
        status: "success",
        message: "Logout successful",
      };
    } catch (error) {
      console.log("Logout error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Even if the request fails, we should still consider it a successful logout
      // and clear local storage
      localStorage.removeItem("user");

      throw new APIError(
        error.response?.data?.message || "Error during logout",
        error.response?.status || 500
      );
    }
  },

  logoutAllSessions: async () => {
    try {
      await api.post(
        "/auth/logout-all",
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return { success: true, message: "Logged out from all sessions" };
    } catch (error) {
      // Log the error for debugging
      console.log("Logout all sessions error:", {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status,
      });

      // Even if the request fails, we should still consider it a successful logout
      return { success: true, message: "Logged out from all sessions" };
    }
  },
};
