"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaGithub, FaGoogle, FaFacebook } from "react-icons/fa";
import { config } from "@/lib/config";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      const result = await registerUser(data);
      console.log("Registration result:", result);

      // ✅ ตรวจสอบกรณีสำเร็จ
      if (result?.success && result?.user) {
        toast.success(
          result.message || "ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี"
        );
        router.push("/"); // เปลี่ยนหน้าไปยังหน้าหลัก
        return;
      }

      // ❌ ตรวจสอบกรณีล้มเหลว (เช่น validation ผิด)
      console.log("Registration failed response:", result);

      // 🎯 ถ้ามี validation errors
      if (result?.errors) {
        Object.entries(result.errors).forEach(([field, message]) => {
          setFormError(field, {
            type: "manual",
            message: message,
          });
        });
      }

      toast.error(result?.error || "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } catch (error) {
      // ❗ กรณี error ที่ไม่คาดคิด เช่น network หรือ exception
      console.error("Unexpected registration error:", error);
      toast.error(
        error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthRegister = (provider) => {
    window.location.href = config.oauth.startUrl(provider);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-fg">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-fg-muted">
            Or{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
                type="text"
                autoComplete="name"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-gray-500 text-fg rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-gray-500 text-fg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                type="password"
                autoComplete="new-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-gray-500 text-fg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value, formValues) =>
                    value === formValues.password || "Passwords do not match",
                })}
                type="password"
                autoComplete="new-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-gray-500 text-fg rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full" size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>

        {/* Add OAuth buttons after the regular registration form */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-fg-muted">
                Or register with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              onClick={() => handleOAuthRegister("github")}
              className="w-full inline-flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm font-medium text-fg-muted hover:bg-surface-muted"
            >
              <FaGithub className="h-5 w-5" />
            </button>

            <button
              onClick={() => handleOAuthRegister("google")}
              className="w-full inline-flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm font-medium text-fg-muted hover:bg-surface-muted"
            >
              <FaGoogle className="h-5 w-5" />
            </button>

            <button
              onClick={() => handleOAuthRegister("facebook")}
              className="w-full inline-flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm font-medium text-fg-muted hover:bg-surface-muted"
            >
              <FaFacebook className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
