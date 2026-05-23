"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { User02FreeIcons, PlusSignFreeIcons , MinusSignFreeIcons } from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GuestData {
  rooms: number;
  adults: number;
  children: number;
  childrenAges: number[];
}

interface GuestSelectorProps {
  guests: GuestData;
  onChange: (guests: GuestData) => void;
}

export function GuestSelector({ guests, onChange }: GuestSelectorProps) {
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);

  const updateGuests = (field: 'rooms' | 'adults' | 'children', delta: number) => {
    const newValue = Math.max(
      field === 'children' ? 0 : 1,
      guests[field] + delta
    );

    const updated = { ...guests, [field]: newValue };

    // Update children ages if children count changes
    if (field === 'children') {
      const newChildrenAges = [...guests.childrenAges];
      if (delta > 0) {
        newChildrenAges.push(12); // Default age
      } else {
        newChildrenAges.pop();
      }
      updated.childrenAges = newChildrenAges;
    }

    onChange(updated);
  };

  const _updateChildAge = (index: number, age: number) => {
    const newChildrenAges = [...guests.childrenAges];
    newChildrenAges[index] = age;
    onChange({ ...guests, childrenAges: newChildrenAges });
  };

  const getGuestSummary = () => {
    const parts = [];
    if (guests.adults > 0) {
      parts.push(`${guests.adults} ${t('adults')}`);
    }
    if (guests.children > 0) {
      parts.push(`${guests.children} ${t('children')}`);
    }
    parts.push(`${guests.rooms} ${t('rooms')}`);
    return parts.join(', ');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex h-[58px] w-full items-center justify-start border-0 bg-transparent px-4 text-[18px] font-normal text-[#808080] shadow-none hover:bg-transparent lg:h-[81px] lg:text-[24px]">
          <HugeiconsIcon icon={User02FreeIcons} className="mr-3 h-6 w-6 text-[#1865a9]" />
          <span className="truncate">
            {getGuestSummary() || t('selectGuests')}
          </span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[120%] p-4" align="start">
        <div className="space-y-4">
          {/* Rooms */}
          <div className="space-y-2">
            <Label>{t('rooms')}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateGuests('rooms', -1)}
                disabled={guests.rooms <= 1}
              >
                <HugeiconsIcon icon={MinusSignFreeIcons} className="h-4 w-4" />
              </Button>
              
              <Input
                value={guests.rooms}
                readOnly
                className="text-center"
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateGuests('rooms', 1)}
                disabled={guests.rooms >= 10}
              >
                <HugeiconsIcon icon={PlusSignFreeIcons} className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Adults */}
          <div className="space-y-2">
            <Label>{t('adults')}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateGuests('adults', -1)}
                disabled={guests.adults <= 1}
              >
                <HugeiconsIcon icon={MinusSignFreeIcons} className="h-4 w-4" />
              </Button>
              
              <Input
                value={guests.adults}
                readOnly
                className="text-center"
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateGuests('adults', 1)}
                disabled={guests.adults >= 8}
              >
                <HugeiconsIcon icon={PlusSignFreeIcons} className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Children */}
          <div className="space-y-2">
            <Label>{t('children')}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateGuests('children', -1)}
                disabled={guests.children <= 0}
              >
                <HugeiconsIcon icon={MinusSignFreeIcons} className="h-4 w-4" />
              </Button>
              
              <Input
                value={guests.children}
                readOnly
                className="text-center"
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => updateGuests('children', 1)}
                disabled={guests.children >= 6}
              >
                <HugeiconsIcon icon={PlusSignFreeIcons} className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Children Ages */}
          {guests.children > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>{t('childrenAges')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: guests.children }).map((_, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs">{t('child')} {index + 1}</Label>

                      <Select
                                                // className="w-full border rounded-md px-3 py-2 text-sm"
                        // defaultValue={guests.childrenAges[index]) || 12}
                        // onChange={(e) => updateChildAge(index, parseInt(e.target.value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('age')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Array.from({ length: 18 }).map((_, age) => (
                              <SelectItem key={age} value={`${age}`}>
                                {age === 0 ? t('underOne') : `${age} ${t('years')}`}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <Button
              onClick={() => setOpen(false)}
              className="w-full"
            >
              {t('done')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
