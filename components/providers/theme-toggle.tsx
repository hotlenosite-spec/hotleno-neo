"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Switch } from "@/components/ui/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun02Icon, Moon02Icon } from "@hugeicons/core-free-icons";

interface ThemeToggleProps {
  showLabel?: boolean;
}

export function ThemeToggle({ showLabel = true }: ThemeToggleProps) {
  const { setTheme, resolvedTheme, mounted } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-4 w-4" />
        <div className="h-5 w-10 bg-muted rounded-full" />
        <div className="h-4 w-4" />
        {showLabel && <div className="h-4 w-20 bg-muted rounded" />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <HugeiconsIcon
        icon={Sun02Icon}
        className={`h-4 w-4 ${!isDark ? "text-yellow-500" : "text-muted-foreground"}`}
      />

      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle theme"
      />

      <HugeiconsIcon
        icon={Moon02Icon}
        className={`h-4 w-4 ${isDark ? "text-blue-400" : "text-muted-foreground"}`}
      />

      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {isDark ? "Dark" : "Light"} Mode
        </span>
      )}
    </div>
  );
}

export function ThemeToggleSimple() {
  const { setTheme, resolvedTheme, mounted } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="inline-flex items-center justify-center rounded-md h-9 w-9 bg-muted"
        aria-label="Toggle theme"
        disabled
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <HugeiconsIcon icon={Sun02Icon} className="h-5 w-5 text-yellow-500" />
      ) : (
        <HugeiconsIcon icon={Moon02Icon} className="h-5 w-5 text-blue-400" />
      )}
    </button>
  );
}
