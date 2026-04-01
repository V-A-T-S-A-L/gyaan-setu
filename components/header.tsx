"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, ChevronDown, Menu } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AuthDialog } from "./auth-dialog"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_ITEMS = [
	{ name: "Rings", href: "/collections/rings" },
	{ name: "Necklaces", href: "/collections/necklaces" },
	{ name: "Earrings", href: "/collections/earrings" },
	{ name: "Bracelets", href: "/collections/bracelets" },
]

type UserRole = "admin" | "customer"

export function Header() {
	const { user, logout } = useAuth()
	const [authOpen, setAuthOpen] = useState(false)
	const [isScrolled, setIsScrolled] = useState(false)
	const [role, setRole] = useState<UserRole>("customer");
	const supabase = createClient();


	const pathname = usePathname()
	const isAdmin = pathname.startsWith("/admin")


	useEffect(() => {
		if (isAdmin) return

		const onScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}
		window.addEventListener("scroll", onScroll)
		return () => window.removeEventListener("scroll", onScroll)
	}, [])

	const effectiveScrolled = isAdmin ? false : isScrolled

	useEffect(() => {
		if (!user) {
			setRole("customer")
			return
		}

		const fetchProfile = async () => {
			const { data, error } = await supabase
				.from("profiles")
				.select(
					`role`,
				)
				.eq("user_id", user?.id)
				.single();

			if (error && error.code !== "PGRST116") {
				console.error("Error fetching profile:", error);
				return;
			}

			if (data) {
				setRole(data.role);
			}
		};

		fetchProfile();
	}, [user]);


	return (
		<>
			{/* Wrapper to prevent content jump */}
			<div className="h-18 w-full" />

			<header
				className={`
                    fixed top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out
                    ${effectiveScrolled
						? "top-4 w-[95%] max-w-7xl rounded-2xl border bg-background/80 backdrop-blur-xl shadow-lg h-16"
						: "top-0 w-full border-b bg-background h-18"}
                `}
			>
				<div className="container mx-auto h-full px-4">
					<div className="relative flex h-full items-center justify-between">

						{/* Logo - Kept centered or transitioned smoothly */}
						<Link
							href="/"
							className="group flex flex-col leading-none text-center transition-all duration-500"
						>
							<span className="font-serif text-2xl font-bold tracking-wide">
								ICONIC
							</span>
							<span className="text-[11px] tracking-[0.25em] text-muted-foreground group-hover:text-primary transition">
								JEWELLERY
							</span>
						</Link>

						{/* Desktop Navigation (Left side) */}
						<nav className="hidden md:flex items-center gap-8">
							{NAV_ITEMS.map((item) => (
								<NavLink key={item.name} item={item} />
							))}
						</nav>

						{/* Right actions */}
						<div className="flex items-center gap-2">
							{/* Mobile Nav */}
							<div className="md:hidden">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<Menu className="h-5 w-5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										{NAV_ITEMS.map((item) => (
											<DropdownMenuItem key={item.name} asChild>
												<Link href={item.href}>{item.name}</Link>
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							{/* Auth & Cart */}
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

							{user && role === "admin" && (
								<div className="ml-4">
									<Link href="/admin" className="text-md font-bold uppercase text-primary hover:underline sm:text-sm">
										Admin
									</Link>
								</div>)}
						</div>
					</div>
				</div>
			</header>

			<AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
		</>
	)
}

function NavLink({ item }: { item: typeof NAV_ITEMS[0] }) {
	return (
		<Link
			href={item.href}
			className="relative text-sm font-medium text-foreground transition hover:text-primary group"
		>
			{item.name}
			<span className="absolute -bottom-1 left-0 h-[1.5px] w-0 bg-primary transition-all duration-300 group-hover:w-full" />
		</Link>
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
				<DropdownMenuItem asChild><Link href="/orders" className="cursor-pointer">Orders</Link></DropdownMenuItem>
				<DropdownMenuItem onClick={logout} className="cursor-pointer">Sign Out</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}