import type { Metadata } from "next";
import { ExternalLink, Settings as SettingsIcon } from "lucide-react";
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
						<div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20">
									<SettingsIcon className="h-5 w-5 animate-spin-slow" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-black uppercase leading-none tracking-[0.2em] text-blue-400">
											Runtime Environment
										</span>
										<a
											href="https://github.com/code-yeongyu/oh-my-openagent"
											target="_blank"
											rel="noopener noreferrer"
											className="ml-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#60a5fa] transition-colors hover:text-[#93bbfd]"
										>
											<svg
												viewBox="0 0 24 24"
												aria-hidden="true"
												className="h-3 w-3 fill-current"
											>
												<path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.51.47-3.16-.63-3.36-1.2-.11-.29-.6-1.19-1.03-1.43-.35-.19-.85-.66-.01-.67.79-.01 1.35.74 1.54 1.05.9 1.55 2.34 1.11 2.91.85.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.98c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.07.36.32.68.93.68 1.89 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.18 10.18 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
											</svg>
											OH-MY-OPENAGENT
											<ExternalLink className="h-2.5 w-2.5" />
										</a>
									</div>
									<p className="mt-1 text-xl font-black leading-none tracking-tight text-white">
										Configuration <span className="text-slate-600">File</span>
									</p>
								</div>
							</div>
							<AppNav />
						</div>
					</header>
					{children}
				</div>
			</body>
		</html>
	);
}
