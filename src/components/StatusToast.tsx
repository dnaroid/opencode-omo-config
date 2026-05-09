"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StatusType } from "@/lib/types";

export type Status = { message: string; type: StatusType } | null;

export function StatusToast({ status }: { status: Status }) {
	if (!status) return null;
	const Icon =
		status.type === "success"
			? CheckCircle2
			: status.type === "error"
				? XCircle
				: Info;

	return (
		<div
			className={cn(
				"fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur",
				status.type === "success" &&
					"border-emerald-500/30 bg-emerald-950/80 text-emerald-100",
				status.type === "error" &&
					"border-rose-500/30 bg-rose-950/80 text-rose-100",
				status.type === "info" &&
					"border-blue-500/30 bg-blue-950/80 text-blue-100",
			)}
		>
			<Icon className="h-5 w-5 shrink-0" />
			{status.message}
		</div>
	);
}
