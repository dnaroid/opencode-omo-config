"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/settings/opencode", label: "OpenCode" },
	{ href: "/settings/oh-my-openagent", label: "Oh-My-OpenAgent" },
];

export function AppNav() {
	const pathname = usePathname();

	return (
		<nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
			{navItems.map((item) => {
				const isActive = pathname === item.href;

				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"rounded-lg px-3 py-2 transition-all hover:bg-slate-800/60 hover:text-slate-200",
							isActive &&
								"bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/25 shadow-[0_0_18px_rgba(59,130,246,0.12)]",
						)}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
