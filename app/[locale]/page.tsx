import SearchForm from "@/components/search/search-form";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AirplaneTakeOff01Icon,
  Hotel01Icon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <section className="relative -mt-20 min-h-screen overflow-hidden bg-[#d3e5f8]">
      <div className="absolute inset-0 bg-[linear-gradient(125deg,#d3e5f8_1%,#fce4ec_99%)]" />
      <Image
        src="/design-assets/home-hotel-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col items-center px-4 pb-20 pt-32 sm:px-8 lg:pt-40">
        <div className="mb-8 flex w-full max-w-[655px] items-center justify-between rounded-[28px] border border-[#65c3dd]/70 bg-[#d9d9d9]/70 p-3 shadow-[2px_5px_4px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          <Link
            href="./flights"
            className="flex h-[87px] flex-1 items-center justify-center gap-3 rounded-[28px] text-[28px] font-semibold text-[#052948] transition hover:bg-white/45 sm:text-[36px]"
          >
            <HugeiconsIcon
              icon={AirplaneTakeOff01Icon}
              className="h-8 w-8 sm:h-10 sm:w-10"
              aria-hidden="true"
            />
            <span>Flights</span>
          </Link>
          <div className="flex h-[87px] flex-1 items-center justify-center gap-3 rounded-[28px] bg-white text-[28px] font-semibold text-[#052948] sm:text-[36px]">
            <HugeiconsIcon
              icon={Hotel01Icon}
              className="h-8 w-8 sm:h-10 sm:w-10"
              aria-hidden="true"
            />
            <span>Hotels</span>
          </div>
        </div>

        <SearchForm />
      </div>
    </section>
  );
}
