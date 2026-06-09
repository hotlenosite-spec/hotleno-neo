"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countries, getCountryByCode } from "@/lib/data/countries";
import { cn } from "@/lib/utils";

type CountrySelectProps = {
  value?: string;
  onChange: (value: string) => void;
  mode?: "country" | "nationality";
  className?: string;
  placeholder?: string;
};

export function CountrySelect({
  value,
  onChange,
  mode = "country",
  className,
  placeholder,
}: CountrySelectProps) {
  const locale = useLocale();
  const t = useTranslations("checkout");
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCountry = getCountryByCode(value);
  const selectedLabel = selectedCountry
    ? mode === "nationality"
      ? isAr
        ? selectedCountry.nationalityAr
        : selectedCountry.nationalityEn
      : isAr
        ? selectedCountry.nameAr
        : selectedCountry.nameEn
    : "";

  const filteredCountries = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries;

    return countries.filter((country) =>
      [
        country.code,
        country.nameEn,
        country.nameAr,
        country.nationalityEn,
        country.nationalityAr,
        country.phoneCode,
      ].some((part) => part.toLowerCase().includes(term)),
    );
  }, [query]);

  const pickCountry = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-between rounded-xl border-[#E5E7EB] bg-white px-3 text-start font-semibold text-[#0F172A] hover:bg-slate-50",
            className,
          )}
        >
          <span className="truncate">
            {selectedCountry
              ? `${selectedCountry.code} - ${selectedLabel}`
              : placeholder || (mode === "nationality" ? t("selectNationality") : t("selectCountry"))}
          </span>
          <span className="shrink-0 text-xs text-slate-400" aria-hidden="true">
            ▾
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(320px,calc(100vw-2rem))] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={mode === "nationality" ? t("searchNationality") : t("searchCountry")}
          />
          <CommandList>
            <CommandEmpty>{t("noCountries")}</CommandEmpty>
            <CommandGroup heading={mode === "nationality" ? t("nationalities") : t("countries")}>
              {filteredCountries.map((country) => {
                const displayName =
                  mode === "nationality"
                    ? isAr
                      ? country.nationalityAr
                      : country.nationalityEn
                    : isAr
                      ? country.nameAr
                      : country.nameEn;

                return (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => pickCountry(country.code)}
                    className="flex items-center gap-3"
                  >
                    <span className="w-10 shrink-0 text-xs font-black text-slate-500">
                      {country.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-900">
                        {displayName}
                      </span>
                      <span className="block truncate text-xs font-semibold text-slate-500">
                        {country.phoneCode} · {isAr ? country.nameAr : country.nameEn}
                      </span>
                    </span>
                    <span className="w-4 text-[#F97316]" aria-hidden="true">
                      {country.code === selectedCountry?.code ? "✓" : ""}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
