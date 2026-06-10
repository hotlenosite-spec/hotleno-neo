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
  roomDetails?: Array<{
    adults: number;
    children: number;
    childrenAges: number[];
  }>;
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

  const normalizedRooms = Array.from({ length: guests.rooms }, (_, index) => (
    guests.roomDetails?.[index] || { adults: index === 0 ? guests.adults : 1, children: 0, childrenAges: [] }
  ));
  const totals = normalizedRooms.reduce(
    (sum, room) => ({
      adults: sum.adults + room.adults,
      children: sum.children + room.children,
      childrenAges: [...sum.childrenAges, ...room.childrenAges.slice(0, room.children)],
    }),
    { adults: 0, children: 0, childrenAges: [] as number[] },
  );

  const emitRooms = (rooms: typeof normalizedRooms) => {
    const nextTotals = rooms.reduce(
      (sum, room) => ({
        adults: sum.adults + room.adults,
        children: sum.children + room.children,
        childrenAges: [...sum.childrenAges, ...room.childrenAges.slice(0, room.children)],
      }),
      { adults: 0, children: 0, childrenAges: [] as number[] },
    );

    onChange({
      rooms: rooms.length,
      adults: nextTotals.adults,
      children: nextTotals.children,
      childrenAges: nextTotals.childrenAges,
      roomDetails: rooms,
    });
  };

  const updateRoomCount = (delta: number) => {
    const attemptedValue = guests.rooms + delta;
    const newValue = Math.min(MAX_ROOMS, Math.max(1, attemptedValue));

    if (delta > 0 && attemptedValue > MAX_ROOMS) {
      setValidationMessage("You can select up to 6 rooms.");
      return;
    }

    setValidationMessage("");
    const nextRooms =
      delta > 0
        ? [...normalizedRooms, { adults: 1, children: 0, childrenAges: [] }]
        : normalizedRooms.slice(0, newValue);
    emitRooms(nextRooms);
  };

  const updateRoomGuests = (
    roomIndex: number,
    field: "adults" | "children",
    delta: number,
  ) => {
    const maxValue =
      field === "adults"
          ? MAX_ADULTS_PER_ROOM
          : MAX_CHILDREN_PER_ROOM;
    const room = normalizedRooms[roomIndex];
    const attemptedValue = room[field] + delta;
    const newValue = Math.min(maxValue, Math.max(
      field === 'children' ? 0 : 1,
      attemptedValue
    ));

    if (delta > 0 && attemptedValue > maxValue) {
      setValidationMessage(
        field === "adults"
            ? "Each room can include up to 6 adults."
            : "Each room can include up to 4 children.",
      );
      return;
    }

    setValidationMessage("");

    const nextRooms = normalizedRooms.map((item, index) =>
      index === roomIndex ? { ...item, [field]: newValue } : item,
    );
    if (field === 'children') {
      const newChildrenAges = [...room.childrenAges];
      if (delta > 0) {
        newChildrenAges.push(12); // Default age
      } else {
        newChildrenAges.pop();
      }
      nextRooms[roomIndex] = { ...nextRooms[roomIndex], childrenAges: newChildrenAges };
    }

    emitRooms(nextRooms);
  };

  const _updateChildAge = (roomIndex: number, childIndex: number, age: number) => {
    const nextRooms = normalizedRooms.map((room, index) => {
      if (index !== roomIndex) return room;
      const childrenAges = [...room.childrenAges];
      childrenAges[childIndex] = age;
      return { ...room, childrenAges };
    });
    emitRooms(nextRooms);
  };

  const getGuestSummary = () => {
    const parts = [];
    if (totals.adults > 0) {
      parts.push(`${totals.adults} ${t('adults')}`);
    }
    if (totals.children > 0) {
      parts.push(`${totals.children} ${t('children')}`);
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
                onClick={() => updateRoomCount(-1)}
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
                onClick={() => updateRoomCount(1)}
                disabled={guests.rooms >= MAX_ROOMS}
              >
                <HugeiconsIcon icon={PlusSignFreeIcons} className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {normalizedRooms.map((room, roomIndex) => (
            <div key={roomIndex} className="space-y-4 rounded-xl border border-slate-200 p-3">
              <Label>{t('rooms')} {roomIndex + 1}</Label>
              <div className="space-y-2">
                <Label>{t('adults')}</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => updateRoomGuests(roomIndex, 'adults', -1)} disabled={room.adults <= 1}>
                    <HugeiconsIcon icon={MinusSignFreeIcons} className="h-4 w-4" />
                  </Button>
                  <Input value={room.adults} readOnly className="text-center" />
                  <Button type="button" variant="outline" size="icon" onClick={() => updateRoomGuests(roomIndex, 'adults', 1)} disabled={room.adults >= MAX_ADULTS_PER_ROOM}>
                    <HugeiconsIcon icon={PlusSignFreeIcons} className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('children')}</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => updateRoomGuests(roomIndex, 'children', -1)} disabled={room.children <= 0}>
                    <HugeiconsIcon icon={MinusSignFreeIcons} className="h-4 w-4" />
                  </Button>
                  <Input value={room.children} readOnly className="text-center" />
                  <Button type="button" variant="outline" size="icon" onClick={() => updateRoomGuests(roomIndex, 'children', 1)} disabled={room.children >= MAX_CHILDREN_PER_ROOM}>
                    <HugeiconsIcon icon={PlusSignFreeIcons} className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {room.children > 0 && (
                <div className="space-y-2">
                  <Label>{t('childrenAges')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: room.children }).map((_, childIndex) => (
                      <div key={childIndex} className="space-y-1">
                        <Label className="text-xs">{t('child')} {childIndex + 1}</Label>
                        <Select
                          value={`${room.childrenAges[childIndex] ?? 12}`}
                          onValueChange={(value) =>
                            _updateChildAge(roomIndex, childIndex, Number.parseInt(value, 10))
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
              )}
            </div>
          ))}

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
