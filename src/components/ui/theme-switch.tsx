"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ThemeSwitch = ({
  className,
}: {
  className?: string;
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setChecked(resolvedTheme === "dark"), [resolvedTheme]);

  const handleToggle = useCallback(() => {
    const newChecked = !checked;
    setChecked(newChecked);
    setTheme(newChecked ? "dark" : "light");
  }, [checked, setTheme]);

  if (!mounted) return null;

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative flex items-center gap-1 p-1 rounded-full transition-colors",
        "bg-muted/80 hover:bg-muted border border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label={checked ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun icon */}
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200",
          !checked && "bg-background shadow-sm"
        )}
      >
        <SunIcon
          size={14}
          className={cn(
            "transition-colors",
            !checked ? "text-amber-500" : "text-muted-foreground"
          )}
        />
      </span>

      {/* Moon icon */}
      <span
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200",
          checked && "bg-background shadow-sm"
        )}
      >
        <MoonIcon
          size={14}
          className={cn(
            "transition-colors",
            checked ? "text-blue-400" : "text-muted-foreground"
          )}
        />
      </span>
    </button>
  );
};

export default ThemeSwitch;
