"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AuthDialog } from "@/components/features/auth/auth-dialog";
import { User } from "@/components/shared/user";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthButtons() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Skeleton className="h-12 w-52 rounded-full" />;
  }

  const userInfo = user
    ? {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
      }
    : null;

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated && userInfo ? (
        <User user={userInfo} />
      ) : (
        <>
          <AuthDialog defaultTab="login" triggerVariant="outline" />
          <AuthDialog defaultTab="register" triggerVariant="solid" />
        </>
      )}
    </div>
  );
}
