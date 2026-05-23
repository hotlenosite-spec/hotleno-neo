"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
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

export default function BookingConfirmationPage() {
  const router = useRouter();
  const _locale = useLocale();
  const _searchParams = useSearchParams();
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
  const [loading, _setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('bookingConfirmation') === null;
  });

  useEffect(() => {
    if (booking === null && typeof window !== 'undefined') {
      router.push('/');
    }
  }, [booking, router]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        );
      case 'pending':
      case 'onrequest':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <HugeiconsIcon icon={ClockIcon} className="mr-1 h-3 w-3" />
            Pending Confirmation
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <HugeiconsIcon icon={AlertCircleIcon} className="mr-1 h-3 w-3" />
            Rejected
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

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <HugeiconsIcon icon={AlertCircleIcon} className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground mb-6">Unable to retrieve your booking details</p>
            <Button onClick={() => router.push('/')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfirmed = booking.BookingStatus?.toLowerCase() === 'confirmed';
  const isPending = ['pending', 'onrequest'].includes(booking.BookingStatus?.toLowerCase() || '');

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
                {isConfirmed ? 'Booking Confirmed!' : isPending ? 'Booking Submitted' : 'Booking Status'}
              </h1>
              <p className="text-muted-foreground">
                {isConfirmed 
                  ? 'Your reservation has been confirmed. Check your email for details.'
                  : isPending 
                    ? 'Your booking is being processed. You will receive confirmation shortly.'
                    : 'Please check your booking status for more details.'
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
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="font-mono font-semibold text-lg">{booking.BookingReference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Reference</p>
                  <p className="font-semibold">{booking.YourReference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking Date</p>
                  <p>{new Date(booking.BookingDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hotel</p>
                  <p className="font-semibold">{booking.HotelName}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-semibold">{new Date(booking.CheckInDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-semibold">{new Date(booking.CheckOutDate).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Room Details</p>
                {booking.Rooms?.map((room, idx) => (
                  <div key={idx} className="flex justify-between py-2">
                    <span>{room.RoomName}</span>
                    <span className="text-muted-foreground">
                      {room.Adults} Adult{room.Adults !== 1 ? 's' : ''}
                      {room.Children > 0 && `, ${room.Children} Child${room.Children !== 1 ? 'ren' : ''}`}
                    </span>
                  </div>
                ))}
              </div>

              {booking.LeadGuest && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Guest</p>
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
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p>{contactInfo.email}</p>
                  </div>
                  {contactInfo.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
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
                <CardTitle>Important Information</CardTitle>
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
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price</span>
                  <span className="font-bold text-xl">
                    {formatCurrency(booking.TotalPrice, booking.Currency)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Payment will be processed according to the hotel&apos;s policy
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
                Print Confirmation
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `Booking Confirmation - ${booking.HotelName}`,
                      text: `My booking at ${booking.HotelName}`,
                      url: window.location.href,
                    });
                  }
                }}
              >
                <HugeiconsIcon icon={Share08Icon} className="mr-2 h-4 w-4" />
                Share Booking
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/')}
              >
                <HugeiconsIcon icon={Home01Icon} className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </CardContent>
          </Card>

          {/* Need Help */}
          <Card className="bg-muted">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                If you have any questions about your booking, please contact our support team.
              </p>
              <Button variant="link" className="p-0 h-auto">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>Hotleno Booking Confirmation</p>
        <p>Booking Reference: {booking.BookingReference}</p>
        <p>Printed on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
