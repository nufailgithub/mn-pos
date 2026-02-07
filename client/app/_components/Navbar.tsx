"use client";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
    const router = useRouter();
    const { data: session } = useSession();
    
    const handleLogout = async () => {
        try {
            await signOut({ redirect: false });
            toast.success("Logged out successfully");
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Failed to logout");
        }
    };
    
    return (
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 border-b bg-background sticky top-0 z-30">
            <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
            
            <div className="flex-1 lg:flex-none">
                <h1 className="text-lg font-semibold text-center lg:text-left">MN Collection</h1>
            </div>
            
            <div className="flex items-center gap-2">
                <ModeToggle /> 
                {session?.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">{session.user.name}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{session.user.name}</p>
                                    <p className="text-xs text-muted-foreground">{session.user.email}</p>
                                    <p className="text-xs text-muted-foreground capitalize">Role: {session.user.role}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    )
}