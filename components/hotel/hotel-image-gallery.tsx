"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  GridViewIcon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import type { HotelImage } from "@/types/travellanda";

interface HotelImageGalleryProps {
  images: HotelImage[];
  hotelName: string;
}

// Filter out images with empty or invalid URLs
function getValidImages(images: HotelImage[]): HotelImage[] {
  return images.filter(img => img?.Url && img.Url.trim() !== '');
}

export function HotelImageGallery({ images, hotelName }: HotelImageGalleryProps) {
  const t = useTranslations("hotels");
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter valid images only
  const validImages = getValidImages(images);

  if (!validImages || validImages.length === 0) {
    return (
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-200/70 to-transparent" />
        <div className="relative text-center text-slate-500">
          <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#F97316] shadow-sm">
            <HugeiconsIcon icon={Image01Icon} className="h-8 w-8" />
          </span>
          <p className="font-bold text-[#0F172A]">{t("noImage")}</p>
          <p className="mt-1 text-sm">{t("imagesMayBeUnavailable")}</p>
        </div>
      </div>
    );
  }

  const mainImage = validImages[0];
  const gridImages = validImages.slice(1, 5);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <>
      {/* Main Gallery Grid */}
      <div className="relative grid grid-cols-1 gap-2 overflow-hidden rounded-2xl bg-slate-100 md:grid-cols-4">
        {/* Main Large Image */}
        <div 
          className={`group relative aspect-[4/3] cursor-pointer overflow-hidden ${
            gridImages.length > 0
              ? "md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[420px]"
              : "md:col-span-4 md:aspect-[16/7]"
          }`}
          onClick={() => {
            setCurrentIndex(0);
            setIsOpen(true);
          }}
        >
          <Image
            src={mainImage.Url}
            alt={mainImage.Description || hotelName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Grid Images */}
        {gridImages.map((image, index) => (
          <div
            key={index}
            className="group relative hidden aspect-video cursor-pointer overflow-hidden md:block"
            onClick={() => {
              setCurrentIndex(index + 1);
              setIsOpen(true);
            }}
          >
            <Image
              src={image.Url}
              alt={image.Description || `${hotelName} ${index + 2}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            
            {/* Show All Photos Button on last image */}
            {index === gridImages.length - 1 && validImages.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Button variant="secondary" size="sm" className="font-bold">
                  <HugeiconsIcon icon={GridViewIcon} className="me-2 h-4 w-4" />
                  +{validImages.length - 5} {t("more")}
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Mobile: Show overlay with photo count */}
        <div 
          className="absolute bottom-4 end-4 md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Button variant="secondary" size="sm" className="font-bold shadow-lg">
            <HugeiconsIcon icon={GridViewIcon} className="me-2 h-4 w-4" />
            {validImages.length} {t("photos")}
          </Button>
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="h-[90vh] w-[calc(100%-1rem)] max-w-6xl overflow-hidden border-none bg-black/95 p-0"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">
            {t("imagePosition", {
              hotel: hotelName,
              current: currentIndex + 1,
              total: validImages.length,
            })}
          </DialogTitle>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute end-4 top-4 z-50 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
            aria-label={t("closeGallery")}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-6 w-6" />
          </Button>

          {/* Main Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={validImages[currentIndex]?.Url || '/hotel-image-placeholder.jpg'}
              alt={validImages[currentIndex]?.Description || `${hotelName} ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />

            {/* Navigation Arrows */}
            {validImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute start-2 top-1/2 h-11 w-11 -translate-y-1/2 text-white hover:bg-white/20 sm:start-4 sm:h-12 sm:w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  aria-label={t("previousImage")}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-2 top-1/2 h-11 w-11 -translate-y-1/2 text-white hover:bg-white/20 sm:end-4 sm:h-12 sm:w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  aria-label={t("nextImage")}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white">
              {currentIndex + 1} / {validImages.length}
            </div>

            {/* Image Description */}
            {validImages[currentIndex]?.Description && (
              <div className="absolute bottom-16 left-1/2 max-w-2xl -translate-x-1/2 px-4 text-center text-sm text-white">
                <p className="bg-black/50 px-4 py-2 rounded-lg">
                  {validImages[currentIndex].Description}
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {validImages.length > 1 && (
            <div className="absolute bottom-20 left-1/2 flex max-w-full -translate-x-1/2 gap-2 overflow-x-auto px-4 pb-2">
              {validImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-white ring-2 ring-white/50' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={image.Url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
