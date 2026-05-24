"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface AuthDialogProps {
  defaultTab?: "login" | "register";
  triggerLabel?: string;
  triggerVariant?: "outline" | "solid";
}

export function AuthDialog({
  defaultTab = "login",
  triggerLabel,
  triggerVariant = "outline",
}: AuthDialogProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isAr = locale === "ar";
  const { login, register } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const labels = {
    login: isAr ? "تسجيل الدخول" : t("signIn"),
    register: isAr ? "إنشاء حساب" : t("signUp"),
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(loginEmail, loginPassword);

    if (result.success) {
      setIsOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setError(result.error || t("loginFailed"));
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await register(
      registerName,
      registerEmail,
      registerPassword,
    );

    if (result.success) {
      setIsOpen(false);
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
    } else {
      setError(result.error || t("registrationFailed"));
    }

    setIsLoading(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setActiveTab(defaultTab);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant === "solid" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-10 rounded-full px-5 text-sm font-black",
            triggerVariant === "solid"
              ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/20 hover:bg-[#EA580C]"
              : "border-[#E5E7EB] bg-white text-[#0F172A] hover:border-[#F97316] hover:bg-orange-50 hover:text-[#F97316]",
          )}
        >
          {triggerLabel || labels[defaultTab === "register" ? "register" : "login"]}
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl border-[#E5E7EB] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[#0F172A]">
            {t("welcome")}
          </DialogTitle>
          <DialogDescription>{t("welcomeDescription")}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "login" | "register")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-[#F8FAFC]">
            <TabsTrigger value="login" className="rounded-xl">
              {labels.login}
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl">
              {labels.register}
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t("email")}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">{t("password")}</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#F97316] font-black text-white hover:bg-[#EA580C]"
                disabled={isLoading}
              >
                {isLoading ? t("signingIn") : labels.login}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">{t("fullName")}</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">{t("email")}</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">{t("password")}</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#F97316] font-black text-white hover:bg-[#EA580C]"
                disabled={isLoading}
              >
                {isLoading ? t("creatingAccount") : labels.register}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
