"use client";

import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Film,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAtom } from "jotai";
import { hasPlayButtonClickAtom } from "@/lib/store";
import Image from "next/image";
import Link from "next/link";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  movieInfo?: {
    name: string;
    posterUrl: string;
    tmdbId: number;
  };
}

export default function AppHeader({ user, movieInfo }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasPlayButtonClick, setHasPlayButtonClick] = useAtom(
    hasPlayButtonClickAtom
  );

  const isMovieDetailPage =
    pathname.includes("/movies/") && pathname !== "/movies";

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const handleSettings = () => {
    // TODO: 实现设置页面导航
    console.log("Settings clicked");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {isMovieDetailPage ? (
            <AnimatePresence mode="wait">
              {hasPlayButtonClick && movieInfo ? (
                <motion.div
                  key="movie-info"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-3"
                >
                  <Link href="/movies">
                    <Button variant="ghost" size="sm" className="p-2">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  <motion.div
                    layoutId={`movie-${movieInfo.tmdbId}`}
                    className="w-8 h-8 rounded-md overflow-hidden"
                  >
                    <Image
                      src={movieInfo.posterUrl}
                      alt={`Poster for ${movieInfo.name}`}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </motion.div>
                  <motion.h2
                    layoutId={`title-${movieInfo.tmdbId}`}
                    className="font-semibold text-sm truncate max-w-48"
                  >
                    {movieInfo.name}
                  </motion.h2>
                </motion.div>
              ) : (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => router.push("/movies")}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                    <Film className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-heading font-bold tracking-tight">
                    NextMovie
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <Film className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-heading font-bold tracking-tight">
                NextMovie
              </span>
            </div>
          )}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-auto px-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm font-medium">
                    {user.name?.charAt(0).toUpperCase() ||
                      user.email?.charAt(0).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-none">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
