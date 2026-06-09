import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  InboxIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

type ContentStateProps = {
  type: "empty" | "error" | "loading";
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export function ContentState({
  type,
  title,
  description,
  action,
  compact = false,
}: ContentStateProps) {
  const icon =
    type === "error"
      ? Alert02Icon
      : type === "loading"
        ? Loading03Icon
        : InboxIcon;

  const tone =
    type === "error"
      ? "bg-red-50 text-red-600"
      : type === "loading"
        ? "bg-orange-50 text-orange-600"
        : "bg-slate-100 text-slate-500";

  return (
    <div
      className={`rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center ${
        compact ? "py-9" : "py-12"
      }`}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}
      >
        <HugeiconsIcon
          icon={icon}
          className={`h-6 w-6 ${type === "loading" ? "animate-spin" : ""}`}
        />
      </span>
      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
