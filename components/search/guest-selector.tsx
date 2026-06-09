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

const MAX_ROOMS = 6;
const MAX_ADULTS_PER_ROOM = 6;
const MAX_CHILDREN_PER_ROOM = 4;

export function GuestSelector({ guests, onChange }: GuestSelectorProps) {
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const updateGuests = (field: 'rooms' | 'adults' | 'children', delta: number) => {
    const maxValue =
      field === "rooms"
        ? MAX_ROOMS
        : field === "adults"
          ? MAX_ADULTS_PER_ROOM
          : MAX_CHILDREN_PER_ROOM;
    const attemptedValue = guests[field] + delta;
    const newValue = Math.min(maxValue, Math.max(
      field === 'children' ? 0 : 1,
      attemptedValue
    ));

    if (delta > 0 && attemptedValue > maxValue) {
      setValidationMessage(
        field === "rooms"
          ? "You can select up to 6 rooms."
          : field === "adults"
            ? "Each room can include up to 6 adults."
            : "Each room can include up to 4 children.",
      );
      return;
    }

    setValidationMessage("");

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
        <Button variant="outline" className="flex h-11 w-full items-center justify-start border-0 bg-transparent px-1 text-base font-black text-[#0F172A] shadow-none hover:bg-transparent">
          <HugeiconsIcon icon={User02FreeIcons} className="mr-2 h-5 w-5 shrink-0 text-[#F97316] rtl:ml-2 rtl:mr-0" />
          <span className="truncate">
            {getGuestSummary() || t('selectGuests')}
          </span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[320px] rounded-2xl border-[#E5E7EB] p-4 shadow-xl" align="start">
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
                disabled={guests.rooms >= MAX_ROOMS}
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
                disabled={guests.adults >= MAX_ADULTS_PER_ROOM}
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
                disabled={guests.children >= MAX_CHILDREN_PER_ROOM}
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
                        value={`${guests.childrenAges[index] ?? 12}`}
                        onValueChange={(value) =>
                          _updateChildAge(index, Number.parseInt(value, 10))
                        }
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

          {validationMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {validationMessage}
            </p>
          )}

          <div className="pt-4">
            <Button
              onClick={() => setOpen(false)}
              className="w-full bg-[#F97316] font-bold text-white hover:bg-[#EA580C]"
            >
              {t('done')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
