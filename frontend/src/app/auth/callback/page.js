"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/apiClient";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUserData } = useAuth();
  const hasProcessed = useRef(false);

  const handleCallback = useCallback(async () => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    try {
      const error = searchParams.get("error");
      const success = searchParams.get("success");

      if (error || !success) {
        toast.error("Authentication failed. Please try again.");
        router.push("/auth/login");
        return;
      }

      const response = await apiClient.get("/users/profile", {
        withCredentials: true,
      });
      const { data } = response.data;

      if (data?.user) {
        setUserData(data.user);
        toast.success(`Welcome back, ${data.user.name || data.user.email}!`);
        router.push("/");
      } else {
        throw new Error("Invalid user data");
      }
    } catch (error) {
      console.error("Auth callback error:", error);
      document.cookie =
        "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      toast.error("Something went wrong. Please try logging in again.");
      router.push("/auth/login");
    }
  }, [router, searchParams, setUserData]);

  useEffect(() => {
    if (!hasProcessed.current) {
      handleCallback();
    }
  }, [handleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-gray-700 text-sm mb-2">Authenticating...</p>
        <LoadingSpinner size="large" />
      </div>
    </div>
  );
}
