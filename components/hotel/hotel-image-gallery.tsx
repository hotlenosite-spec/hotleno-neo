"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  GridViewIcon
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
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter valid images only
  const validImages = getValidImages(images);

  if (!validImages || validImages.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center">
        <p className="text-muted-foreground">No images available</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden">
        {/* Main Large Image */}
        <div 
          className="md:col-span-2 md:row-span-2 relative aspect-[4/3] md:aspect-auto cursor-pointer group"
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
            className="relative aspect-video cursor-pointer group hidden md:block"
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
                <Button variant="secondary" size="sm">
                  <HugeiconsIcon icon={GridViewIcon} className="mr-2 h-4 w-4" />
                  +{validImages.length - 5} more
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Mobile: Show overlay with photo count */}
        <div 
          className="md:hidden absolute bottom-4 right-4"
          onClick={() => setIsOpen(true)}
        >
          <Button variant="secondary" size="sm">
            <HugeiconsIcon icon={GridViewIcon} className="mr-2 h-4 w-4" />
            {validImages.length} photos
          </Button>
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-6xl w-full h-[90vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">
            {hotelName} - Image {currentIndex + 1} of {validImages.length}
          </DialogTitle>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
              {currentIndex + 1} / {validImages.length}
            </div>

            {/* Image Description */}
            {validImages[currentIndex]?.Description && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-center max-w-2xl px-4">
                <p className="bg-black/50 px-4 py-2 rounded-lg">
                  {validImages[currentIndex].Description}
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {validImages.length > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 px-4 overflow-x-auto max-w-full pb-2">
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
