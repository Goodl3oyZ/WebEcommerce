"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api/auth";
import { config } from "@/lib/config";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api/apiClient";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/sessionRefresh";
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
  const resetLocalCart = useCartStore((state) => state.resetLocal);
  const clearAuthData = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    // A copy of the account's cart must not stay behind as a "guest" cart.
    if (useCartStore.getState().owner) useCartStore.getState().resetLocal();
  }, []);

  /**
   * Finish any sign-in (password or social): save the user, fold the guest
   * cart into the account's cart, then show the signed-in UI.
   */
  const completeSignIn = useCallback(async (signedInUser) => {
    localStorage.setItem("user", JSON.stringify(signedInUser));
    try {
      const { added, skipped, limited } = await useCartStore.getState().mergeGuestCart();
      if (added > 0) {
        const note = skipped || limited ? "\nบางรายการหมดหรือมีไม่พอ จึงปรับจำนวนให้แล้ว" : "";
        toast.success(`เพิ่มสินค้า ${added} รายการจากตะกร้าก่อนเข้าสู่ระบบแล้ว${note}`, { duration: 5000 });
      } else if (skipped) {
        toast("สินค้าในตะกร้าก่อนเข้าสู่ระบบหมดแล้ว จึงไม่ได้เพิ่มเข้าบัญชี", { duration: 5000 });
      }
    } catch {
      // The guest cart stays on this device; the account cart loads as usual.
    }
    setUser(signedInUser);
  }, []);

  const setUserData = useCallback(
    (userData) => {
      if (!userData) {
        clearAuthData();
        return;
      }
      const userWithDefaultProfile = {
        ...userData,
      };
      setUser(userWithDefaultProfile);
      localStorage.setItem("user", JSON.stringify(userWithDefaultProfile));
    },
    [clearAuthData]
  );

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
  }, [setUserData]); // เพิ่ม setUserData ใน dependency array

  // The session ended while the page was open (refresh failed): show signed-out UI.
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, clearAuthData);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clearAuthData);
  }, [clearAuthData]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const result = await authAPI.login(credentials);

      if (!result.success || !result.user) {
        throw new Error(result.error || "Invalid login response");
      }
      await completeSignIn(result.user);
      return { success: true };
    } catch (error) {
      console.warn("Login failed:", error.message);

      // แสดง error ที่เป็นประโยชน์ต่อผู้ใช้
      let userMessage = "ล็อกอินไม่สำเร็จ";
      if (error.message.includes("รหัสผ่าน")) userMessage = error.message;
      if (error.message.includes("อีเมล")) userMessage = error.message;
      const code = error.data?.code;
      if (code === "EMAIL_NOT_VERIFIED") userMessage = "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
      if (code === "INVALID_CREDENTIALS") userMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      if (code === "ACCOUNT_LOCKED") userMessage = "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
      if (code === "ACCOUNT_DEACTIVATED") userMessage = "บัญชีนี้ถูกปิดการใช้งาน";

      return {
        success: false,
        error: userMessage,
        code,
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

      // Not signed in yet: the account must verify its email first.
      return {
        success: true,
        message: response.message || "Registration successful",
        user: response.data.user,
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
      // End the server session (httpOnly cookies can only be cleared by the API).
      await authAPI.logout().catch(() => {});
      // Forget this device's copy; the account keeps its cart for next time.
      resetLocalCart();
      clearAuthData();
      // Redirect to login page
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, still clear data and redirect
      resetLocalCart();
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
    completeSignIn,
    logout,
    clearAuthData,
    setUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
