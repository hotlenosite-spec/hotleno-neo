"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  CheckmarkBadge01Icon,
  ClockIcon,
  AlertCircleIcon,
  Home01Icon,
  Share08Icon,
  PrinterIcon
} from "@hugeicons/core-free-icons";
import { formatCurrency } from "@/hooks/use-hotels-enhanced";
import type { HotelBookingResponse } from "@/types/travellanda";
import { formatBookingStatus } from "@/lib/booking-status";
import {
  isDevPreviewAllPagesEnabled,
  warnDevPreviewAllPagesEnabled,
} from "@/lib/security/dev-flags";

export default function BookingConfirmationPage() {
  const router = useRouter();
  const t = useTranslations("bookingConfirmation");
  const _locale = useLocale();
  const _searchParams = useSearchParams();
  const isDevPreviewAllPages = isDevPreviewAllPagesEnabled();
  const [booking, _setBooking] = useState<HotelBookingResponse | null>(() => {
    if (typeof window === 'undefined') return null;
    const confirmationData = localStorage.getItem('bookingConfirmation');
    if (!confirmationData) return null;
    return JSON.parse(confirmationData);
  });
  const [contactInfo, _setContactInfo] = useState<{ email: string; phone?: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    const confirmationData = localStorage.getItem('bookingConfirmation');
    if (!confirmationData) return null;
    return JSON.parse(confirmationData).contactInfo;
  });
  const [loading] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (isDevPreviewAllPages) return false;
    return localStorage.getItem('bookingConfirmation') === null;
  });

  useEffect(() => {
    if (isDevPreviewAllPages) {
      warnDevPreviewAllPagesEnabled();
    }

    if (booking === null && typeof window !== 'undefined') {
      if (isDevPreviewAllPages) {
        return;
      }

      router.push('/');
    }
  }, [booking, isDevPreviewAllPages, router]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'supplier_booking_confirmed':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} className="mr-1 h-3 w-3" />
            {formatBookingStatus(status)}
          </Badge>
        );
      case 'pending':
      case 'onrequest':
      case 'pending_payment':
      case 'payment_succeeded':
      case 'supplier_booking_processing':
      case 'supplier_booking_pending':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <HugeiconsIcon icon={ClockIcon} className="mr-1 h-3 w-3" />
            {formatBookingStatus(status)}
          </Badge>
        );
      case 'rejected':
      case 'supplier_booking_failed':
      case 'manual_review_required':
      case 'refund_required':
      case 'refunded':
        return (
          <Badge variant="destructive">
            <HugeiconsIcon icon={AlertCircleIcon} className="mr-1 h-3 w-3" />
            {formatBookingStatus(status)}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isDevPreviewAllPages && !booking) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-dashed">
          <CardContent className="space-y-4 py-12 text-center">
            <Badge variant="secondary">{t("devPreview")}</Badge>
            <HugeiconsIcon icon={AlertCircleIcon} className="mx-auto h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-bold">{t("devPreviewTitle")}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {t("devPreviewDescription")}
            </p>
            <Button onClick={() => router.push('/')}>{t("backHome")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <HugeiconsIcon icon={AlertCircleIcon} className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("notFoundTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("notFoundDescription")}</p>
            <Button onClick={() => router.push('/')}>{t("backHome")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookingStatus = booking.BookingStatus?.toLowerCase() || '';
  const isConfirmed = ['confirmed', 'supplier_booking_confirmed'].includes(bookingStatus);
  const isPending = [
    'pending',
    'onrequest',
    'pending_payment',
    'payment_succeeded',
    'supplier_booking_processing',
    'supplier_booking_pending',
  ].includes(bookingStatus);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Success Banner */}
      <Card className={`mb-6 ${isConfirmed ? 'border-green-500' : isPending ? 'border-amber-500' : ''}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className={`p-4 rounded-full ${isConfirmed ? 'bg-green-100' : isPending ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <HugeiconsIcon 
                icon={isConfirmed ? CheckmarkBadge01Icon : isPending ? ClockIcon : AlertCircleIcon} 
                className={`h-10 w-10 ${isConfirmed ? 'text-green-600' : isPending ? 'text-amber-600' : 'text-gray-600'}`}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">
                {isConfirmed ? t("confirmedTitle") : isPending ? t("sentTitle") : t("statusTitle")}
              </h1>
              <p className="text-muted-foreground">
                {isConfirmed 
                  ? t("confirmedDescription")
                  : isPending 
                    ? t("pendingDescription")
                    : t("statusDescription")
                }
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {getStatusBadge(booking.BookingStatus)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Booking Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Booking Reference */}
          <Card>
            <CardHeader>
              <CardTitle>{t("bookingDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("bookingNumber")}</p>
                  <p className="font-mono font-semibold text-lg">{booking.BookingReference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("yourReference")}</p>
                  <p className="font-semibold">{booking.YourReference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("bookingDate")}</p>
                  <p>{new Date(booking.BookingDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("hotel")}</p>
                  <p className="font-semibold">{booking.HotelName}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("checkIn")}</p>
                  <p className="font-semibold">{new Date(booking.CheckInDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("checkOut")}</p>
                  <p className="font-semibold">{new Date(booking.CheckOutDate).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("roomDetails")}</p>
                {booking.Rooms?.map((room, idx) => (
                  <div key={idx} className="flex justify-between py-2">
                    <span>{room.RoomName}</span>
                    <span className="text-muted-foreground">
                      {t("adultCount", { count: room.Adults })}
                      {room.Children > 0 && `، ${t("childCount", { count: room.Children })}`}
                    </span>
                  </div>
                ))}
              </div>

              {booking.LeadGuest && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("leadGuest")}</p>
                    <p className="font-semibold">{booking.LeadGuest}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          {contactInfo && (
            <Card>
              <CardHeader>
                <CardTitle>{t("contactInfo")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("email")}</p>
                    <p>{contactInfo.email}</p>
                  </div>
                  {contactInfo.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("phone")}</p>
                      <p>{contactInfo.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Important Information */}
          {((booking.Alerts && booking.Alerts.length > 0) || (booking.Restrictions && booking.Restrictions.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("importantInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.Alerts?.map((alert, idx) => (
                  <Alert key={idx} className="border-amber-500">
                    <AlertTitle>{alert.Type}</AlertTitle>
                    <AlertDescription>{alert.Description}</AlertDescription>
                  </Alert>
                ))}
                {booking.Restrictions?.map((restriction, idx) => (
                  <Alert key={idx} variant="default">
                    <AlertTitle>{restriction.Type}</AlertTitle>
                    <AlertDescription>{restriction.Description}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t("priceSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("totalPrice")}</span>
                  <span className="font-bold text-xl">
                    {formatCurrency(booking.TotalPrice, booking.Currency)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("paymentPolicy")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handlePrint}
              >
                <HugeiconsIcon icon={PrinterIcon} className="mr-2 h-4 w-4" />
                {t("printConfirmation")}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: t("shareTitle", { hotel: booking.HotelName }),
                      text: t("shareText", { hotel: booking.HotelName }),
                      url: window.location.href,
                    });
                  }
                }}
              >
                <HugeiconsIcon icon={Share08Icon} className="mr-2 h-4 w-4" />
                {t("shareBooking")}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/')}
              >
                <HugeiconsIcon icon={Home01Icon} className="mr-2 h-4 w-4" />
                {t("backHome")}
              </Button>
            </CardContent>
          </Card>

          {/* Need Help */}
          <Card className="bg-muted">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">{t("needHelpTitle")}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t("needHelpDescription")}
              </p>
              <Button variant="link" className="p-0 h-auto">
                {t("contactSupport")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>{t("printFooterTitle")}</p>
        <p>{t("printFooterBookingNumber", { reference: booking.BookingReference })}</p>
        <p>{t("printedAt", { date: new Date().toLocaleString() })}</p>
      </div>
    </div>
  );
}
