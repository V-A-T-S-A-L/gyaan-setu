"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroSection } from "@/components/landing/hero-section"
import { FeatureSection } from "@/components/landing/feature-section"
import { TestimonialSection } from "@/components/landing/testimonial-section"
import { useTheme } from "next-themes"
import { ChevronDown, Moon, Sun, User } from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Header } from "@/components/header";


export default function Home() {
  const [authOpen, setAuthOpen] = useState(false)
  const { user, logout } = useAuth()
  const supabase = createClient();

  const { theme, setTheme } = useTheme()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* <header className="sticky top-0 z-40 px-8 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Gyaan Setu</span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link href="#features" className="text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#testimonials" className="text-muted-foreground hover:text-foreground">
              Testimonials
            </Link>
            <Link href="#about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {user ? (
              <UserMenu user={user} logout={logout} />
            ) : (
              <Button
                variant="ghost"
                className="rounded-full px-3"
                onClick={() => setAuthOpen(true)}
              >
                <User className="h-5 w-5" />
                <span className="ml-2 hidden sm:inline">Sign in</span>
              </Button>
            )}

            <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
          </div>
        </div>
      </header> */}
      <main className="flex-1">
        <HeroSection />
        <FeatureSection />
        <TestimonialSection />
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 EduEase. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function UserMenu({ user, logout }: { user: any, logout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 rounded-full px-3 hover:bg-muted">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <ChevronDown className="h-4 w-4 opacity-60 hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground">{user.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer">Profile</Link></DropdownMenuItem>
        <DropdownMenuItem onClick={logout} className="cursor-pointer">Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}