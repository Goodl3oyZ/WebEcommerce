"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { authAPI } from "@/lib/api/auth";

// Mirrors the backend rule in auth.dto.js.
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  const onSubmit = async ({ newPassword, confirmPassword }) => {
    try {
      setIsSubmitting(true);
      await authAPI.resetPassword({ token, newPassword, confirmPassword });
      toast.success("รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบ");
      router.push("/auth/login");
    } catch (error) {
      toast.error(error.message || "ลิงก์ไม่ถูกต้องหรือหมดอายุ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Choose a new password
        </h2>

        {token === "" ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            This reset link is incomplete.{" "}
            <Link href="/auth/forgot-password" className="font-medium underline">
              Request a new one
            </Link>
            .
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="newPassword" className="sr-only">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                className={inputClass}
                {...register("newPassword", {
                  required: "Password is required",
                  pattern: {
                    value: STRONG_PASSWORD,
                    message:
                      "At least 8 characters with upper and lower case letters, a number and a symbol (@$!%*?&)",
                  },
                })}
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                className={inputClass}
                {...register("confirmPassword", {
                  validate: (value) => value === watch("newPassword") || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || token === null}
            >
              {isSubmitting ? "Saving..." : "Reset password"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
