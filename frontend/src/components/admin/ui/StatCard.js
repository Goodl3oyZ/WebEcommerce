"use client";

const TONE_STYLES = {
  success: {
    wrap: "from-success-soft to-surface",
    icon: "bg-success-soft text-success",
  },
  info: {
    wrap: "from-info-soft to-surface",
    icon: "bg-info-soft text-info",
  },
  warning: {
    wrap: "from-warning-soft to-surface",
    icon: "bg-warning-soft text-warning",
  },
  purple: {
    wrap: "from-accent-soft to-surface",
    icon: "bg-accent-soft text-accent",
  },
  danger: {
    wrap: "from-danger-soft to-surface",
    icon: "bg-danger-soft text-danger",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon,
  tone = "info",
  className = "",
}) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.info;

  return (
    <article
      className={`group relative flex min-h-[132px] flex-col gap-2 rounded-2xl border border-border bg-gradient-to-br p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${styles.wrap} ${className}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${styles.icon}`}
      >
        {icon}
      </div>
      <p className="text-xs font-medium text-fg-muted">{title}</p>
      <p className="text-2xl font-bold tracking-tight text-fg">{value ?? 0}</p>
      {description ? (
        <p className="mt-auto text-xs text-fg-subtle">{description}</p>
      ) : null}
    </article>
  );
}
