import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "처리 중...",
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx("btn", `btn--${variant}`, size === "sm" && "btn--sm", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
