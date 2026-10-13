"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaGithub, FaGoogle, FaFacebook } from "react-icons/fa";
import { config } from "@/lib/config";
import VerifyEmailNotice from "@/components/auth/VerifyEmailNotice";

export default function LoginPage() {
  const { login } = useAuth();
  const [retryAfter, setRetryAfter] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  // Messages from the email-verification link (backend redirects here).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      toast.success("ยืนยันอีเมลเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ", { duration: 5000 });
    } else if (params.get("verifyError")) {
      toast.error(
        params.get("verifyError") === "TOKEN_EXPIRED"
          ? "ลิงก์ยืนยันอีเมลหมดอายุแล้ว"
          : "ลิงก์ยืนยันอีเมลไม่ถูกต้อง",
        { duration: 5000 }
      );
    }
  }, []);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const result = await login(data);

      if (result.success) {
        toast.success("ล็อกอินสำเร็จ!", { duration: 3000 });
        // Return to where the user came from (same-site paths only).
        const next = new URLSearchParams(window.location.search).get("redirect");
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      } else if (result.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(data.email.trim());
      } else {
        toast.error(result.error || "ล็อกอินไม่สำเร็จ", {
          duration: 5000,
          position: "top-center",
        });

        if (result.validationErrors) {
          Object.entries(result.validationErrors).forEach(([field, msg]) => {
            setError(field, { type: "manual", message: msg });
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("เกิดข้อผิดพลาดที่ไม่คาดคิด", { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = config.oauth.startUrl(provider);
  };

  if (unverifiedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <VerifyEmailNotice
            email={unverifiedEmail}
            title="ยืนยันอีเมลก่อนเข้าสู่ระบบ"
            sentAlready={false}
            onBack={() => setUnverifiedEmail(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-fg">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-fg-muted">
            Or{" "}
            <Link
              href="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-gray-500 text-fg rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email address"
                disabled={retryAfter > 0}
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
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border placeholder-gray-500 text-fg rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password"
                disabled={retryAfter > 0}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end text-sm">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </Link>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full" size="lg"
              disabled={isSubmitting || retryAfter > 0}
            >
              {isSubmitting
                ? "Signing in..."
                : retryAfter > 0
                ? `Please wait ${retryAfter}s`
                : "Sign in"}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-fg-muted">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              onClick={() => handleOAuthLogin("github")}
              className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm text-fg-muted hover:bg-surface-muted"
            >
              <FaGithub className="h-5 w-5" />
            </button>

            <button
              onClick={() => handleOAuthLogin("google")}
              className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm text-fg-muted hover:bg-surface-muted"
            >
              <FaGoogle className="h-5 w-5" />
            </button>

            <button
              onClick={() => handleOAuthLogin("facebook")}
              className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-surface text-sm text-fg-muted hover:bg-surface-muted"
            >
              <FaFacebook className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
