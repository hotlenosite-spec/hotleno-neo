"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";
import { AuthDialog } from "./auth-dialog";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();

  useEffect(() => {
    warnDevPreviewAllPagesEnabled();
  }, []);

  if (isDevPreviewAllPages) {
    return <>{children}</>;
  }

  // Show a proper loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="mt-4">Checking authentication...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>

        <p className="mb-6">Please sign in to access this page.</p>

        <AuthDialog />
      </div>
    );
  }

  return <>{children}</>;
}
