"use client";

import Image from "next/image"
import { useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// shadcn-ui
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    Avatar ,  
    AvatarImage 
} from "@/components/ui/avatar";
import {
    Button
} from "@/components/ui/button"
// images
import English from "@/public/gb.svg";
import Arabic from "@/public/sa.svg"
// icons
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

const SwitchLanguage = () => {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const languageCode = locale === "ar" ? "AR" : "EN";

    const switchLocale = (nextLocale: "ar" | "en") => {
        const segments = pathname.split("/");
        if (segments[1] === "ar" || segments[1] === "en") {
            segments[1] = nextLocale;
        } else {
            segments.splice(1, 0, nextLocale);
        }

        const query = searchParams.toString();
        router.push(`${segments.join("/") || `/${nextLocale}`}${query ? `?${query}` : ""}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="relative h-12 px-1 rounded-full transition-colors duration-200"
                >
                    <div className="flex items-center space-x-3 pr-2">
                        <Avatar className="h-9 w-9">
                            <AvatarImage 
                                src="/gb.svg"
                                alt="state-en" 
                            />
                        </Avatar>

                        <p className="text-sm font-medium">{languageCode}</p>

                        <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            className={`h-4 w-4 transition-transform duration-200 ${
                                false ? "rotate-180" : ""
                            }`}
                        />
                    </div>
                </Button>
            </DropdownMenuTrigger>


            <DropdownMenuContent align="center" className="rounded-box shadow-lg w-36">
                <DropdownMenuItem
                    onClick={() => switchLocale("en")}
                    className="cursor-pointer px-4 py-3 text-sm"
                >
                    <Image 
                        src={English} 
                        alt="state-en" 
                        className="mr-3"
                        width={24} 
                        height={24} 
                    />
                    
                    English
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => switchLocale("ar")}
                    className="cursor-pointer px-4 py-3 text-sm"
                >
                    <Image 
                        src={Arabic} 
                        alt="state-en" 
                        className="mr-3"
                        width={24} 
                        height={24} 
                    />
                
                    العربية
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default SwitchLanguage;
