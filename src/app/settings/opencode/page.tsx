"use client";

import { useEffect, useState } from "react";
import { OpencodeConfigSettings } from "@/components/settings/OpencodeConfigSettings";
import { StatusToast, type Status } from "@/components/StatusToast";

export default function OpencodeSettingsPage() {
	const [status, setStatus] = useState<Status>(null);

	useEffect(() => {
		if (!status) return;
		const timeout = window.setTimeout(() => setStatus(null), 3_500);
		return () => window.clearTimeout(timeout);
	}, [status]);

	return (
		<main className="custom-scrollbar mx-auto h-[calc(100dvh-73px)] max-w-7xl overflow-y-scroll px-6 py-8">
			<OpencodeConfigSettings onStatusChangeAction={setStatus} />
			<StatusToast status={status} />
		</main>
	);
}
