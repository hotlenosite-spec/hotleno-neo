import Image from "next/image"
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

                        <p className="text-sm font-medium">EN</p>

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
                <DropdownMenuItem className="cursor-pointer px-4 py-3 text-sm">
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

                <DropdownMenuItem className="cursor-pointer px-4 py-3 text-sm">
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