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
        avatar: user.avatar || "",
      }
    : null;

  return (
    <div className="flex gap-4">
      {isAuthenticated && userInfo ? <User user={userInfo} /> : <AuthDialog />}
    </div>
  );
}
