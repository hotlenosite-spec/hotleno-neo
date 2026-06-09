"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button type="button" className="rounded-2xl bg-[#0F172A] text-white hover:bg-slate-800" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
