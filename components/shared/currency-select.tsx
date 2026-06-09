"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  CURRENCY_CHANGE_EVENT,
  DEFAULT_CURRENCY_CODE,
  currencies,
  getCurrencyByCode,
  getStoredCurrencyCode,
  saveStoredCurrencyCode,
} from "@/lib/data/currencies";
import { cn } from "@/lib/utils";

type CurrencySelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  compact?: boolean;
};

export function CurrencySelect({
  value,
  onChange,
  className,
  compact = false,
}: CurrencySelectProps) {
  const locale = useLocale();
  const t = useTranslations("currency");
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(() => getStoredCurrencyCode());

  useEffect(() => {
    if (value) return;

    const syncCurrency = () => setInternalValue(getStoredCurrencyCode());
    window.addEventListener("storage", syncCurrency);
    window.addEventListener(CURRENCY_CHANGE_EVENT, syncCurrency);
    return () => {
      window.removeEventListener("storage", syncCurrency);
      window.removeEventListener(CURRENCY_CHANGE_EVENT, syncCurrency);
    };
  }, [value]);

  const selectedCode = value || internalValue;
  const selectedCurrency =
    getCurrencyByCode(selectedCode) || getCurrencyByCode(DEFAULT_CURRENCY_CODE)!;
  const filteredCurrencies = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return currencies;

    return currencies.filter((currency) =>
      [
        currency.code,
        currency.symbol,
        currency.nameEn,
        currency.nameAr,
      ].some((part) => part.toLowerCase().includes(term)),
    );
  }, [query]);

  const selectCurrency = (code: string) => {
    setInternalValue(code);
    saveStoredCurrencyCode(code);
    onChange?.(code);
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
            "h-10 justify-between rounded-full border-slate-200 bg-white px-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50",
            compact ? "w-[112px]" : "w-[172px]",
            className,
          )}
          aria-label={t("select")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-slate-500">{selectedCurrency.symbol}</span>
            <span className="truncate">{selectedCurrency.code}</span>
            {!compact && (
              <span className="truncate text-xs font-bold text-slate-500">
                {isAr ? selectedCurrency.nameAr : selectedCurrency.nameEn}
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs text-slate-400" aria-hidden="true">
            ▾
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[290px] p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("searchPlaceholder")}
          />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            <CommandGroup heading={t("heading")}>
              {filteredCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={currency.code}
                  onSelect={() => selectCurrency(currency.code)}
                  className="flex items-center gap-3"
                >
                  <span className="w-8 shrink-0 text-sm font-black text-slate-500">
                    {currency.symbol}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-900">
                      {currency.code}
                    </span>
                    <span className="block truncate text-xs font-semibold text-slate-500">
                      {isAr ? currency.nameAr : currency.nameEn}
                    </span>
                  </span>
                  <span className="w-4 shrink-0 text-[#F97316]" aria-hidden="true">
                    {currency.code === selectedCurrency.code ? "✓" : ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
