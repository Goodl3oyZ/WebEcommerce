"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import AuthShell, { EMAIL_RULES, Field, SocialLogin } from "@/components/auth/AuthShell";
import VerifyEmailNotice from "@/components/auth/VerifyEmailNotice";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Messages from the email-verification link (backend redirects here).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      toast.success("ยืนยันอีเมลเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ", { duration: 5000 });
    } else if (params.get("verifyError")) {
      toast.error(
        params.get("verifyError") === "TOKEN_EXPIRED" ? "ลิงก์ยืนยันอีเมลหมดอายุแล้ว" : "ลิงก์ยืนยันอีเมลไม่ถูกต้อง",
        { duration: 5000 }
      );
    }
  }, []);

  const onSubmit = async (data) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      const result = await login(data);
      if (result.success) {
        toast.success("เข้าสู่ระบบสำเร็จ");
        // Return to where the user came from (same-site paths only).
        const next = new URLSearchParams(window.location.search).get("redirect");
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      } else if (result.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(data.email.trim());
      } else {
        setFormError(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch {
      setFormError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (unverifiedEmail) {
    return (
      <AuthShell>
        <VerifyEmailNotice
          email={unverifiedEmail}
          title="ยืนยันอีเมลก่อนเข้าสู่ระบบ"
          sentAlready={false}
          onBack={() => setUnverifiedEmail(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="ยินดีต้อนรับกลับมา"
      subtitle="เข้าสู่ระบบเพื่อดูคำสั่งซื้อ ที่อยู่ และการแจ้งเตือนของคุณ"
      footer={
        <>
          ยังไม่มีบัญชี?{" "}
          <Link href="/auth/register" className="font-semibold text-fg underline-offset-4 hover:underline">
            สมัครสมาชิก
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <Field
          id="email"
          label="อีเมล"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", EMAIL_RULES)}
        />
        <Field
          id="password"
          label="รหัสผ่าน"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          action={
            <Link href="/auth/forgot-password" className="text-xs font-medium text-fg-muted hover:text-fg">
              ลืมรหัสผ่าน?
            </Link>
          }
          {...register("password", { required: "กรุณากรอกรหัสผ่าน" })}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </Button>
      </form>
      <SocialLogin />
    </AuthShell>
  );
}
