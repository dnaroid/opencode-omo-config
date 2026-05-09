import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
	title: "OC Config",
	description: "Standalone OpenCode and Oh-My-OpenAgent settings",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<div className="min-h-dvh bg-[#0B0E14]">
					<header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#0B0E14]/90 backdrop-blur">
						<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
							<Link
								href="/settings/opencode"
								className="flex items-center gap-3"
							>
								<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
									<Settings2 className="h-5 w-5" />
								</div>
								<div>
									<div className="text-sm font-bold uppercase tracking-[0.24em] text-slate-100">
										OC Config
									</div>
									<div className="text-xs text-slate-500">
										OpenCode and Oh-My-OpenAgent settings
									</div>
								</div>
							</Link>
							<AppNav />
						</div>
					</header>
					{children}
				</div>
			</body>
		</html>
	);
}
