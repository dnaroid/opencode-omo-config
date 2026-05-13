import { spawn } from "child_process";
import type { OpencodeModel } from "@/lib/types";

const DEFAULT_PORT = 4096;
const KNOWN_PORTS = [DEFAULT_PORT, 3000, 8080, 4000];

type ProviderModelPayload = {
	id?: string;
	variants?: Record<string, unknown>;
	limit?: { context?: number };
};

type ProviderPayload = {
	id?: string;
	models?: Record<string, ProviderModelPayload>;
};

type ProviderListPayload = {
	all?: ProviderPayload[];
	providers?: ProviderPayload[];
	connected?: string[];
};

async function isReachable(baseUrl: string) {
	try {
		const response = await fetch(`${baseUrl}/health`, {
			signal: AbortSignal.timeout(1_500),
		});
		if (response.ok) return true;
	} catch {
		// try root below
	}

	try {
		await fetch(baseUrl, { signal: AbortSignal.timeout(1_500) });
		return true;
	} catch {
		return false;
	}
}

async function discoverRunningBaseUrl() {
	if (
		process.env.OPENCODE_URL &&
		(await isReachable(process.env.OPENCODE_URL))
	) {
		return process.env.OPENCODE_URL;
	}

	for (const port of KNOWN_PORTS) {
		const baseUrl = `http://127.0.0.1:${port}`;
		if (await isReachable(baseUrl)) return baseUrl;
	}

	return null;
}

async function startOpenCodeServer() {
	const existing = await discoverRunningBaseUrl();
	if (existing) return existing;

	const child = spawn("opencode", ["serve", "--port", String(DEFAULT_PORT)], {
		detached: true,
		stdio: "ignore",
		env: process.env,
	});
	child.unref();

	const baseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
	for (let attempt = 0; attempt < 15; attempt += 1) {
		if (await isReachable(baseUrl)) return baseUrl;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}

	throw new Error("Failed to start or discover `opencode serve`");
}

async function fetchProviderPayload(
	baseUrl: string,
): Promise<ProviderListPayload> {
	const directory = encodeURIComponent(process.cwd());
	for (const route of ["/provider", "/config/providers"]) {
		const response = await fetch(`${baseUrl}${route}?directory=${directory}`, {
			headers: { Accept: "application/json" },
		});
		if (response.ok) return (await response.json()) as ProviderListPayload;
	}
	throw new Error("OpenCode provider API did not return models");
}

export async function listModelsFromOpenCode(): Promise<{
	baseUrl: string;
	models: OpencodeModel[];
}> {
	const baseUrl = await startOpenCodeServer();
	const payload = await fetchProviderPayload(baseUrl);
	const providers = payload.all ?? payload.providers ?? [];
	const connected = new Set(
		payload.connected ?? providers.map((provider) => provider.id ?? ""),
	);
	const models = new Map<string, OpencodeModel>();

	for (const provider of providers) {
		if (!provider.id) continue;
		for (const model of Object.values(provider.models ?? {})) {
			if (!model.id) continue;
			const name = `${provider.id}/${model.id}`;
			const variants = Object.keys(model.variants ?? {})
				.filter(Boolean)
				.sort();
			models.set(name, {
				name,
				variants,
				contextLimit:
					typeof model.limit?.context === "number" && model.limit.context > 0
						? model.limit.context
						: undefined,
				connected: connected.has(provider.id),
			});
		}
	}

	return {
		baseUrl,
		models: [...models.values()]
			.filter((m) => m.connected)
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
}
