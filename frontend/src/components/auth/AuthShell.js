"use client";

import Image from "next/image";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FaFacebook, FaGithub, FaGoogle } from "react-icons/fa";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { config } from "@/lib/config";

/**
 * Frame for the sign-in pages: a photo panel from the landing page on wide
 * screens, the form on the right (alone on phones).
 */
export default function AuthShell({ title, subtitle, children, footer, image = "/landing/train.webp" }) {
  const { siteName } = useSiteSettings();
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="dark relative hidden overflow-hidden bg-[#090B0A] lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)]"
        aria-hidden
      >
        <Image src={image} alt="" fill priority sizes="50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p className="font-display text-4xl font-bold italic uppercase leading-[0.95] tracking-tight text-white xl:text-5xl">
            Train smarter.
            <br />
            Recover faster.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            ติดตามคำสั่งซื้อ เก็บที่อยู่ไว้ใช้ซ้ำ และรับแจ้งเตือนทุกความคืบหน้า ในบัญชีเดียวกับ {siteName}
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center bg-canvas px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          {title && <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-fg">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{subtitle}</p>}
          <div className={title ? "mt-8" : ""}>{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-fg-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

const inputClass = (error) =>
  `h-12 w-full rounded-xl border bg-surface px-4 text-[15px] text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-fg/10 ${
    error ? "border-danger focus:border-danger" : "border-border focus:border-fg"
  }`;

/** Labelled input with its error; passwords get a show/hide button. */
export const Field = forwardRef(function Field({ label, error, type = "text", id, hint, action, ...props }, ref) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={`${inputClass(error)} ${isPassword ? "pr-12" : ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-fg-subtle hover:text-fg"
            aria-label={shown ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

const PROVIDERS = [
  { id: "google", label: "Google", Icon: FaGoogle },
  { id: "facebook", label: "Facebook", Icon: FaFacebook },
  { id: "github", label: "GitHub", Icon: FaGithub },
];

/** "or continue with" and the social login buttons. */
export function SocialLogin() {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        หรือดำเนินการต่อด้วย
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              window.location.href = config.oauth.startUrl(id);
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-medium text-fg transition-colors hover:border-fg/40 hover:bg-fg/5"
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">เข้าสู่ระบบด้วย {label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const EMAIL_RULES = {
  required: "กรุณากรอกอีเมล",
  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "รูปแบบอีเมลไม่ถูกต้อง" },
};

// Mirrors the backend rule in auth.dto.js.
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const PASSWORD_HINT = "อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์ (@$!%*?&)";
