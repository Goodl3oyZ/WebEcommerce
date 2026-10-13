"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import AuthShell, { Field, PASSWORD_HINT, STRONG_PASSWORD } from "@/components/auth/AuthShell";
import { authAPI } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  const onSubmit = async ({ newPassword, confirmPassword }) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      await authAPI.resetPassword({ token, newPassword, confirmPassword });
      toast.success("ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ");
      router.push("/auth/login");
    } catch {
      setFormError("ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้ที่หน้าลืมรหัสผ่าน");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <Link href="/auth/login" className="font-semibold text-fg underline-offset-4 hover:underline">
      กลับไปหน้าเข้าสู่ระบบ
    </Link>
  );

  if (token === "") {
    return (
      <AuthShell title="ลิงก์ไม่สมบูรณ์" subtitle="ลิงก์ตั้งรหัสผ่านนี้ขาดข้อมูลบางส่วน" image="/landing/recover.webp" footer={footer}>
        <Link
          href="/auth/forgot-password"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-fg text-base font-semibold text-canvas"
        >
          ขอลิงก์ใหม่
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="ตั้งรหัสผ่านใหม่"
      subtitle="ตั้งรหัสผ่านใหม่แล้วเข้าสู่ระบบได้ทันที อุปกรณ์อื่นที่ล็อกอินอยู่จะถูกออกจากระบบ"
      image="/landing/recover.webp"
      footer={footer}
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {formError}{" "}
            <Link href="/auth/forgot-password" className="underline underline-offset-2">
              ขอลิงก์ใหม่
            </Link>
          </p>
        )}
        <Field
          id="newPassword"
          label="รหัสผ่านใหม่"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={errors.newPassword?.message}
          {...register("newPassword", {
            required: "กรุณากรอกรหัสผ่านใหม่",
            pattern: { value: STRONG_PASSWORD, message: PASSWORD_HINT },
          })}
        />
        <Field
          id="confirmPassword"
          label="ยืนยันรหัสผ่านใหม่"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "กรุณายืนยันรหัสผ่าน",
            validate: (value, formValues) => value === formValues.newPassword || "รหัสผ่านไม่ตรงกัน",
          })}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || token === null}>
          {isSubmitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
        </Button>
      </form>
    </AuthShell>
  );
}
