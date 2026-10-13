"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import AuthShell, { EMAIL_RULES, Field } from "@/components/auth/AuthShell";
import { authAPI } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (error) {
      setFormError(error.status === 429 ? "ขอบ่อยเกินไป กรุณารอสักครู่" : "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  const back = (
    <Link href="/auth/login" className="font-semibold text-fg underline-offset-4 hover:underline">
      กลับไปหน้าเข้าสู่ระบบ
    </Link>
  );

  if (sentTo) {
    return (
      <AuthShell footer={back} image="/landing/recover.webp">
        <div role="status" className="rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-fg" aria-hidden>
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-fg">ตรวจสอบอีเมลของคุณ</h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            ถ้า <span className="font-medium text-fg break-all">{sentTo}</span> มีบัญชีอยู่ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว
            ลิงก์ใช้ได้ 30 นาทีและใช้ได้ครั้งเดียว
          </p>
          <p className="mt-3 text-xs text-fg-subtle">ไม่เจออีเมล? ลองดูในโฟลเดอร์สแปมหรือโปรโมชัน</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      subtitle="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้"
      image="/landing/recover.webp"
      footer={back}
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
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
        </Button>
      </form>
    </AuthShell>
  );
}
