"use client";

import { useEffect, useState } from "react";
import { OhMyOpenagentSettings } from "@/components/settings/OhMyOpenagentSettings";
import { StatusToast, type Status } from "@/components/StatusToast";

export default function OhMyOpenagentSettingsPage() {
	const [status, setStatus] = useState<Status>(null);

	useEffect(() => {
		if (!status) return;
		const timeout = window.setTimeout(() => setStatus(null), 3_500);
		return () => window.clearTimeout(timeout);
	}, [status]);

	return (
		<main className="custom-scrollbar mx-auto h-[calc(100dvh-73px)] max-w-7xl overflow-y-scroll px-6 py-8">
			<OhMyOpenagentSettings onStatusChangeAction={setStatus} />
			<StatusToast status={status} />
		</main>
	);
}
