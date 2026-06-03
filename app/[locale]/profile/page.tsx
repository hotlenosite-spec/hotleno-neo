"use client";

// react
import { useState, useEffect, useRef } from "react";
// next
import { useRouter } from "next/navigation";
// next-intl
import { useTranslations } from "next-intl";
// providers & hooks
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
// icons
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  MailIcon,
  CalendarIcon,
  ShieldIcon,
  SettingsIcon,
  Edit02Icon,
  CheckmarkCircle02Icon,
  ClockIcon,
  ArrowLeftIcon,
  CameraIcon,
  KeyIcon,
  HotelIcon,
  Ticket01Icon,
  Sun02Icon,
  Moon02Icon,
  CloudUploadIcon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";
// utilities
import { format } from "date-fns";
// sonner
import { toast } from "sonner";
import {
  CANCELLABLE_BOOKING_STATUSES,
  ACTIVE_BOOKING_STATUSES,
  formatBookingStatus,
  type BookingStatus,
} from "@/lib/booking-status";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

interface Booking {
  _id: string;
  bookingReference: string;
  hotelName: string;
  location: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  createdAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  birthDate?: string;
  nationality?: string;
  preferences: {
    currency: string;
    language: string;
    emailNotifications: boolean;
    priceAlerts: boolean;
    newsletter: boolean;
    theme: "light" | "dark" | "system";
  };
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const t = useTranslations("profile");
  const {
    user: _authUser,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();
  const { setTheme, resolvedTheme: _resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    nationality: "",
  });
  const [birthDateObj, setBirthDateObj] = useState<Date | undefined>(undefined);

  const [preferences, setPreferences] = useState({
    currency: "USD",
    language: "en",
    emailNotifications: true,
    priceAlerts: false,
    newsletter: true,
    theme: "system" as "light" | "dark" | "system",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Fetch profile data
  useEffect(() => {
    if (isDevPreviewAllPages) {
      warnDevPreviewAllPagesEnabled();
    }

    if (!authLoading && !isAuthenticated) {
      if (isDevPreviewAllPages) {
        setIsLoadingProfile(false);
        setIsLoadingBookings(false);
        return;
      }

      router.push("/");
      return;
    }

    if (isAuthenticated) {
      fetchProfile();
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, isDevPreviewAllPages, router]);

  // Sync theme with preferences
  useEffect(() => {
    if (profile?.preferences?.theme) {
      setTheme(profile.preferences.theme);
    }
  }, [profile, setTheme]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoadingProfile(false);
        return;
      }

      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setFormData({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          birthDate: data.user.birthDate
            ? format(new Date(data.user.birthDate), "yyyy-MM-dd")
            : "",
          nationality: data.user.nationality || "",
        });
        if (data.user.birthDate) {
          const parsed = new Date(data.user.birthDate);
          setBirthDateObj(parsed);
        } else {
          setBirthDateObj(undefined);
        }
        if (data.user.preferences) {
          setPreferences(data.user.preferences);
        }
      }
    } catch (_err) {
      console.error("Error fetching profile:", _err);
      toast.error(t("failedLoadProfile"));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoadingBookings(false);
        return;
      }

      const response = await fetch("/api/user/bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (_err) {
      console.error("Error fetching bookings:", _err);
      toast.error(t("failedLoadBookings"));
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "supplier_booking_confirmed":
        return <Badge className="bg-green-500">{formatBookingStatus(status)}</Badge>;
      case "pending_payment":
      case "payment_succeeded":
      case "supplier_booking_processing":
      case "supplier_booking_pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            {formatBookingStatus(status)}
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">{t("cancelled")}</Badge>;
      case "supplier_booking_failed":
      case "manual_review_required":
      case "refund_required":
      case "refunded":
        return <Badge variant="destructive">{formatBookingStatus(status)}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("notAuthenticated"));
        return;
      }

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        toast.success(t("profileUpdated"));
        setIsEditing(false);
      } else {
        toast.error(data.error || t("failedUpdateProfile"));
      }
    } catch (_err) {
      toast.error(t("errorOccurred"));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error(t("passwordsNotMatch"));
      return;
    }

    if (passwordForm.new.length < 6) {
      toast.error(t("passwordMinLength"));
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("notAuthenticated"));
        return;
      }

      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowPasswordDialog(false);
        setPasswordForm({ current: "", new: "", confirm: "" });
        toast.success(t("passwordChanged"));
      } else {
        toast.error(data.error || t("failedChangePassword"));
      }
    } catch (_err) {
      toast.error(t("errorOccurred"));
    }
  };

  const handleSavePreferences = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("notAuthenticated"));
        return;
      }

      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t("preferencesSaved"));
      } else {
        toast.error(data.error || t("failedSavePreferences"));
      }
    } catch (_err) {
      toast.error(t("errorOccurred"));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t("fileTooLarge"));
        return;
      }

      if (
        !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
          file.type,
        )
      ) {
        toast.error(t("invalidFileType"));
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
      setShowAvatarDialog(true);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) return;

    setIsUploadingAvatar(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("notAuthenticated"));
        return;
      }

      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setProfile((prev) => (prev ? { ...prev, avatar: data.avatar } : null));
        toast.success(t("avatarUpdated"));
        setShowAvatarDialog(false);
        setPreviewAvatar(null);
        setSelectedFile(null);
      } else {
        toast.error(data.error || t("failedUploadAvatar"));
      }
    } catch (_err) {
      toast.error(t("errorOccurred"));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setPreferences((prev) => ({ ...prev, theme: newTheme }));
  };

  const handleBirthDateChange = (date: Date | undefined) => {
    setBirthDateObj(date);
    setFormData((prev) => ({
      ...prev,
      birthDate: date ? format(date, "yyyy-MM-dd") : "",
    }));
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(t("notAuthenticated"));
        return;
      }

      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success(t("accountDeleted"));
        // Log out and redirect
        localStorage.removeItem("token");
        router.push("/");
      } else {
        const data = await response.json();
        toast.error(data.error || t("failedDeleteAccount"));
      }
    } catch (_err) {
      toast.error(t("errorOccurred"));
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (authLoading || isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-48 w-full rounded-xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full md:col-span-2" />
        </div>
      </div>
    );
  }

  if (isDevPreviewAllPages && (!isAuthenticated || !profile)) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Card className="border-dashed">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="secondary">معاينة المطور</Badge>
            <h1 className="text-2xl font-bold">الملف الشخصي يحتاج بيانات مستخدم حقيقية</h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              هذه الصفحة مفتوحة لأن `NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES` مفعل
              في التطوير المحلي. لا يتم حقن مستخدم تجريبي أو بيانات ملف شخصي
              مضللة. سجّل الدخول بحساب محلي لمعاينة الحالة المعبأة.
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              العودة للموقع
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6 -ml-2"
        onClick={() => router.back()}
      >
        <HugeiconsIcon icon={ArrowLeftIcon} className="mr-2 h-4 w-4" />
        {t("back")}
      </Button>

      {/* Profile Header */}
      <Card className="mb-8 pt-0 overflow-hidden">
        <div className="h-32 bg-linear-to-r from-primary/20 via-primary/10 to-background" />
        <CardContent className="relative pt-0">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-12 mb-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <HugeiconsIcon icon={CameraIcon} className="h-4 w-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <HugeiconsIcon icon={MailIcon} className="h-4 w-4" />
                {profile.email}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                <HugeiconsIcon
                  icon={isEditing ? CheckmarkCircle02Icon : Edit02Icon}
                  className="mr-2 h-4 w-4"
                />
                {isEditing ? t("cancel") : t("editProfile")}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{bookings.length}</div>
                <div className="text-xs text-muted-foreground">
                  {t("totalBookings")}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {
                    bookings.filter((b) =>
                      ACTIVE_BOOKING_STATUSES.includes(b.status),
                    ).length
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("upcoming")}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {
                    bookings.filter(
                      (b) => b.status === "supplier_booking_confirmed",
                    ).length
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatBookingStatus("supplier_booking_confirmed")}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold capitalize">
                  {profile.role}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("accountType")}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-fit">
          <TabsTrigger className="cursor-pointer" value="overview">
            <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
            {t("overview")}
          </TabsTrigger>

          <TabsTrigger className="cursor-pointer" value="bookings">
            <HugeiconsIcon icon={Ticket01Icon} className="mr-2 h-4 w-4" />
            {t("bookings")}
          </TabsTrigger>

          <TabsTrigger className="cursor-pointer" value="preferences">
            <HugeiconsIcon icon={SettingsIcon} className="mr-2 h-4 w-4" />
            {t("preferences")}
          </TabsTrigger>

          <TabsTrigger className="cursor-pointer" value="security">
            <HugeiconsIcon icon={ShieldIcon} className="mr-2 h-4 w-4" />
            {t("security")}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("personalInfo")}</CardTitle>
              <CardDescription>{t("personalInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("fullName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailAddress")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled={true}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("emailCannotChange")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder={t("phonePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">{t("dateOfBirth")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={!isEditing}
                      >
                        {birthDateObj ? (
                          format(birthDateObj, "PPP")
                        ) : (
                          <span>{t("pickDate")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={birthDateObj}
                        onSelect={handleBirthDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">{t("nationality")}</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder={t("nationalityPlaceholder")}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form data to original profile values
                      setFormData({
                        name: profile.name || "",
                        email: profile.email || "",
                        phone: profile.phone || "",
                        birthDate: profile.birthDate
                          ? format(new Date(profile.birthDate), "yyyy-MM-dd")
                          : "",
                        nationality: profile.nationality || "",
                      });
                      setBirthDateObj(
                        profile.birthDate
                          ? new Date(profile.birthDate)
                          : undefined,
                      );
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? t("saving") : t("saveChanges")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("accountInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{t("memberSince")}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.createdAt
                      ? format(new Date(profile.createdAt), "MMMM d, yyyy")
                      : "N/A"}
                  </p>
                </div>
                <HugeiconsIcon
                  icon={CalendarIcon}
                  className="h-5 w-5 text-muted-foreground"
                />
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{t("accountStatus")}</p>
                  <p className="text-sm text-muted-foreground">{t("active")}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="mr-1 h-3 w-3"
                  />
                  {t("active")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("bookingHistory")}</CardTitle>
                  <CardDescription>{t("bookingDescription")}</CardDescription>
                </div>
                <Button variant="outline" onClick={() => router.push("/")}>
                  <HugeiconsIcon icon={HotelIcon} className="mr-2 h-4 w-4" />
                  {t("bookNewHotel")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <HugeiconsIcon
                    icon={Ticket01Icon}
                    className="h-12 w-12 text-muted-foreground mx-auto mb-4"
                  />
                  <h3 className="text-lg font-semibold mb-2">
                    {t("noBookings")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("startExploring")}
                  </p>
                  <Button onClick={() => router.push("/")}>
                    {t("searchHotels")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking._id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          <div className="bg-muted h-32 md:h-auto md:w-48 flex items-center justify-center">
                            <HugeiconsIcon
                              icon={HotelIcon}
                              className="h-12 w-12 text-muted-foreground"
                            />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg">
                                    {booking.hotelName}
                                  </h3>
                                  {getStatusBadge(booking.status)}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {booking.location}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <HugeiconsIcon
                                      icon={CalendarIcon}
                                      className="h-4 w-4 text-muted-foreground"
                                    />
                                    <span>
                                      {format(
                                        new Date(booking.checkInDate),
                                        "MMM d",
                                      )}{" "}
                                      -{" "}
                                      {format(
                                        new Date(booking.checkOutDate),
                                        "MMM d, yyyy",
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <HugeiconsIcon
                                      icon={ClockIcon}
                                      className="h-4 w-4 text-muted-foreground"
                                    />
                                    <span>
                                      {calculateNights(
                                        booking.checkInDate,
                                        booking.checkOutDate,
                                      )}{" "}
                                      nights
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Ref: {booking.bookingReference}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold">
                                  {booking.currency} {booking.totalPrice}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <Button size="sm" variant="outline">
                                    {t("viewDetails")}
                                  </Button>
                                  {CANCELLABLE_BOOKING_STATUSES.includes(
                                    booking.status,
                                  ) && (
                                    <Button size="sm" variant="destructive">
                                      {t("cancel")}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Appearance / Theme */}
          <Card>
            <CardHeader>
              <CardTitle>{t("appearance")}</CardTitle>
              <CardDescription>{t("appearanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div className="space-y-4">
                <Label>{t("theme")}</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      preferences.theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={Sun02Icon}
                      className="h-8 w-8 text-yellow-500"
                    />
                    <span className="text-sm font-medium">{t("light")}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      preferences.theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={Moon02Icon}
                      className="h-8 w-8 text-[#F97316]"
                    />
                    <span className="text-sm font-medium">{t("dark")}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange("system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      preferences.theme === "system"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex -space-x-2">
                      <HugeiconsIcon
                        icon={Sun02Icon}
                        className="h-6 w-6 text-yellow-500"
                      />
                      <HugeiconsIcon
                        icon={Moon02Icon}
                        className="h-6 w-6 text-[#F97316]"
                      />
                    </div>
                    <span className="text-sm font-medium">{t("system")}</span>
                  </button>
                </div>
              </div>

              <Separator />

              {/* Currency & Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">{t("preferredCurrency")}</Label>

                  <Select
                    value={preferences.currency}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, currency: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر العملة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="USD">USD - الدولار الأمريكي</SelectItem>
                        <SelectItem value="EUR">EUR - اليورو</SelectItem>
                        <SelectItem value="GBP">GBP - الجنيه الإسترليني</SelectItem>
                        <SelectItem value="AED">AED - الدرهم الإماراتي</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t("preferredLanguage")}</Label>

                  <Select
                    value={preferences.language}
                    onValueChange={(value) =>
                      setPreferences({ ...preferences, language: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر اللغة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="en">الإنجليزية</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Notification Preferences using Switch */}
              <div className="space-y-4">
                <Label>{t("notifications")}</Label>
                <div className="space-y-4">
                  <Field
                    orientation="horizontal"
                    className="flex items-center justify-between"
                  >
                    <FieldContent>
                      <FieldLabel htmlFor="email-notifications">
                        {t("emailNotifications")}
                      </FieldLabel>
                      <FieldDescription>
                        {t("emailNotificationsDesc")}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="email-notifications"
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          emailNotifications: checked,
                        })
                      }
                    />
                  </Field>

                  <Field
                    orientation="horizontal"
                    className="flex items-center justify-between"
                  >
                    <FieldContent>
                      <FieldLabel htmlFor="price-alerts">
                        {t("priceAlerts")}
                      </FieldLabel>
                      <FieldDescription>
                        {t("priceAlertsDesc")}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="price-alerts"
                      checked={preferences.priceAlerts}
                      onCheckedChange={(checked) =>
                        setPreferences({ ...preferences, priceAlerts: checked })
                      }
                    />
                  </Field>

                  <Field
                    orientation="horizontal"
                    className="flex items-center justify-between"
                  >
                    <FieldContent>
                      <FieldLabel htmlFor="newsletter">
                        {t("newsletter")}
                      </FieldLabel>
                      <FieldDescription>{t("newsletterDesc")}</FieldDescription>
                    </FieldContent>
                    <Switch
                      id="newsletter"
                      checked={preferences.newsletter}
                      onCheckedChange={(checked) =>
                        setPreferences({ ...preferences, newsletter: checked })
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePreferences}>
                  {t("savePreferences")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("password")}</CardTitle>
              <CardDescription>{t("passwordDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPasswordDialog(true)}>
                <HugeiconsIcon icon={KeyIcon} className="mr-2 h-4 w-4" />
                {t("changePassword")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("twoFactorAuth")}</CardTitle>
              <CardDescription>{t("twoFactorDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">الحالة</p>
                  <p className="text-sm text-muted-foreground">
                    {t("notEnabled")}
                  </p>
                </div>
                <Button variant="outline">{t("enable2FA")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">
                {t("dangerZone")}
              </CardTitle>
              <CardDescription>{t("dangerZoneDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("deleteAccount")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("deleteAccountDesc")}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  {t("deleteAccount")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Avatar Upload Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("updateProfilePicture")}</DialogTitle>
            <DialogDescription>
              {t("updateProfilePictureDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {previewAvatar && (
              <Avatar className="h-32 w-32">
                <AvatarImage src={previewAvatar} alt="معاينة" />
                <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
            )}
            {selectedFile && (
              <p className="text-sm text-muted-foreground text-center">
                {selectedFile.name} • {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAvatarDialog(false);
                setPreviewAvatar(null);
                setSelectedFile(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleAvatarUpload} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("uploading")}
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={CloudUploadIcon}
                    className="mr-2 h-4 w-4"
                  />
                  {t("upload")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("changePassword")}</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الحالية وكلمة مرور جديدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current">{t("currentPassword")}</Label>
              <Input
                id="current"
                type="password"
                value={passwordForm.current}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">{t("newPassword")}</Label>
              <Input
                id="new"
                type="password"
                value={passwordForm.new}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{t("confirmPassword")}</Label>
              <Input
                id="confirm"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handlePasswordChange}>
              {t("changePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <HugeiconsIcon icon={Delete01Icon} />
            </AlertDialogMedia>

            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>

            <AlertDialogDescription>
              {t("deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              variant="destructive"
            >
              {t("deleteAccount")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
