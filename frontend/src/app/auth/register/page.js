"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import AuthShell, { EMAIL_RULES, Field, PASSWORD_HINT, STRONG_PASSWORD, SocialLogin } from "@/components/auth/AuthShell";
import VerifyEmailNotice from "@/components/auth/VerifyEmailNotice";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setFormError("");
    setIsLoading(true);
    try {
      const result = await registerUser({ ...data, email: data.email.trim() });
      if (result?.success && result?.user) {
        // Signing in waits until the emailed link is clicked.
        setRegisteredEmail(result.user.email);
        return;
      }
      setFormError(result?.error || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } catch (error) {
      setFormError(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <AuthShell>
        <VerifyEmailNotice
          email={registeredEmail}
          title="สมัครสมาชิกสำเร็จ ยืนยันอีเมลของคุณ"
          onBack={() => router.push("/auth/login")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="สร้างบัญชีใหม่"
      subtitle="สมัครฟรี ใช้เวลาไม่ถึงนาที แล้วยืนยันอีเมลเพื่อเริ่มสั่งซื้อ"
      image="/landing/track-run.webp"
      footer={
        <>
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/auth/login" className="font-semibold text-fg underline-offset-4 hover:underline">
            เข้าสู่ระบบ
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <p role="alert" className="whitespace-pre-line rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <Field
          id="name"
          label="ชื่อ"
          autoComplete="name"
          placeholder="ชื่อที่ใช้แสดง"
          error={errors.name?.message}
          {...register("name", {
            required: "กรุณากรอกชื่อ",
            minLength: { value: 2, message: "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร" },
          })}
        />
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
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={errors.password?.message}
          {...register("password", {
            required: "กรุณากรอกรหัสผ่าน",
            pattern: { value: STRONG_PASSWORD, message: PASSWORD_HINT },
          })}
        />
        <Field
          id="confirmPassword"
          label="ยืนยันรหัสผ่าน"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "กรุณายืนยันรหัสผ่าน",
            validate: (value, formValues) => value === formValues.password || "รหัสผ่านไม่ตรงกัน",
          })}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}
        </Button>
      </form>
      <SocialLogin />
    </AuthShell>
  );
}
