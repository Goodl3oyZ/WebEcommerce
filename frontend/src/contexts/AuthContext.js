"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api/auth";
import { config } from "@/lib/config";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api/apiClient";
import useCartStore from "@/store/cartStore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const clearCartStore = useCartStore((state) => state.clearCart);
  const clearAuthData = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const setUserData = (userData) => {
    if (!userData) {
      clearAuthData();
      return;
    }

    const userWithDefaultProfile = {
      ...userData,
    };

    setUser(userWithDefaultProfile);
    localStorage.setItem("user", JSON.stringify(userWithDefaultProfile));
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ตรวจสอบว่ามี user ใน localStorage หรือไม่
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          setLoading(false);
          return;
        }

        const response = await apiClient.get("/users/profile");
        const { data } = response.data;
        if (data?.user) {
          setUserData(data.user);
        } else {
          throw new Error("Invalid user data");
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // เรียกเพียงครั้งเดียวตอน component mount

  const login = async (credentials) => {
    try {
      setLoading(true);
      const result = await authAPI.login(credentials);

      if (!result.success || !result.user) {
        throw new Error(result.error || "Invalid login response");
      }
      // บันทึกข้อมูลผู้ใช้และ token
      localStorage.setItem("user", JSON.stringify(result.user));

      setUser(result.user);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);

      // แสดง error ที่เป็นประโยชน์ต่อผู้ใช้
      let userMessage = "ล็อกอินไม่สำเร็จ";
      if (error.message.includes("รหัสผ่าน")) userMessage = error.message;
      if (error.message.includes("อีเมล")) userMessage = error.message;

      return {
        success: false,
        error: userMessage,
        validationErrors: error.validationErrors,
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      console.log("Registration response:", response);

      // ปรับปรุงการตรวจสอบ response
      if (!response?.success || !response.data?.user) {
        throw new Error(response?.message || "Invalid response from server");
      }

      // ใช้ user จาก response.data แทน response.user
      const newUserData = {
        ...response.data.user,
        // เพิ่มข้อมูลอื่นๆ หากจำเป็น
        verificationMessage: response.message,
      };

      localStorage.setItem("user", JSON.stringify(newUserData));
      setUser(newUserData);

      // ส่งกลับ message จาก API ด้วย
      return {
        success: true,
        message: response.message || "Registration successful",
        user: newUserData,
      };
    } catch (error) {
      console.error("Registration error:", error);
      clearAuthData();

      // ส่งกลับ error message ที่ชัดเจน
      return {
        success: false,
        error: error.message || "Registration failed",
        // เพิ่มข้อมูล error เพิ่มเติมหากมี
        ...(error.validationErrors && { errors: error.validationErrors }),
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear cart and auth data
      clearCartStore();
      clearAuthData();
      // Redirect to login page
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, still clear data and redirect
      clearCartStore();
      clearAuthData();
      router.push("/auth/login");
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearAuthData,
    setUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
