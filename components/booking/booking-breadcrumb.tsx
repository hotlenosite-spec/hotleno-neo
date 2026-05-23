"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface BookingBreadcrumbProps {
  currentStep: "search" | "results" | "hotel" | "review" | "checkout";
  hotelName?: string;
}

export function BookingBreadcrumb({ currentStep, hotelName }: BookingBreadcrumbProps) {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();

  const steps = [
    { id: "search", label: t('navigation.home'), href: `/${locale}` },
    { id: "results", label: t('hotels.results'), href: `/${locale}/results` },
    { id: "hotel", label: t('hotels.hotel'), href: "#" },
    { id: "review", label: t('booking.review'), href: `/${locale}/booking/review` },
    { id: "checkout", label: t('booking.checkout'), href: `/${locale}/booking/checkout` },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home Link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/${locale}`}>
              <HugeiconsIcon icon={Home01Icon} className="h-4 w-4 mr-1" />
              {t('navigation.home')}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Steps */}
        {steps.map((step, index) => {
          // Only show steps up to current
          if (index > currentStepIndex) return null;

          const isCurrent = index === currentStepIndex;
          const isClickable = index < currentStepIndex;

          return (
            <div key={step.id} className="contents">
              <BreadcrumbSeparator>
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>
                    {step.id === "hotel" && hotelName ? hotelName : step.label}
                  </BreadcrumbPage>
                ) : isClickable ? (
                  <BreadcrumbLink asChild>
                    <Link href={step.href}>{step.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground">{step.label}</span>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
