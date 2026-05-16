import { execFile } from "child_process";
import { promisify } from "util";
import type { OpencodeModel } from "@/lib/types";

const execFileAsync = promisify(execFile);
const MAX_OUTPUT_BUFFER = 20 * 1024 * 1024;
const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;

type CliModelMetadata = {
	id?: string;
	providerID?: string;
	variants?: Record<string, unknown>;
	limit?: { context?: number };
};

function stripAnsi(input: string) {
	return input.replace(ANSI_PATTERN, "");
}

function parseVerboseModels(output: string): OpencodeModel[] {
	const models = new Map<string, OpencodeModel>();
	const lines = stripAnsi(output).split(/\r?\n/);

	for (let index = 0; index < lines.length; index += 1) {
		const fallbackName = lines[index]?.trim();
		if (!fallbackName || fallbackName.startsWith("{") || !fallbackName.includes("/")) {
			continue;
		}

		while (lines[index + 1]?.trim() === "") index += 1;
		if (!lines[index + 1]?.trimStart().startsWith("{")) {
			models.set(fallbackName, {
				name: fallbackName,
				variants: [],
				connected: true,
			});
			continue;
		}

		const jsonLines: string[] = [];
		let depth = 0;
		let inString = false;
		let escaped = false;

		while (index + 1 < lines.length) {
			index += 1;
			const line = lines[index] ?? "";
			jsonLines.push(line);

			for (const char of line) {
				if (escaped) {
					escaped = false;
					continue;
				}
				if (inString && char === "\\") {
					escaped = true;
					continue;
				}
				if (char === '"') {
					inString = !inString;
					continue;
				}
				if (!inString && char === "{") depth += 1;
				if (!inString && char === "}") depth -= 1;
			}

			if (depth === 0 && jsonLines.length > 0) break;
		}

		try {
			const metadata = JSON.parse(jsonLines.join("\n")) as CliModelMetadata;
			const name =
				metadata.providerID && metadata.id
					? `${metadata.providerID}/${metadata.id}`
					: fallbackName;
			models.set(name, {
				name,
				variants: Object.keys(metadata.variants ?? {}).filter(Boolean).sort(),
				contextLimit:
					typeof metadata.limit?.context === "number" && metadata.limit.context > 0
						? metadata.limit.context
						: undefined,
				connected: true,
			});
		} catch {
			models.set(fallbackName, {
				name: fallbackName,
				variants: [],
				connected: true,
			});
		}
	}

	return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function parsePlainModels(output: string): OpencodeModel[] {
	return stripAnsi(output)
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line && line.includes("/"))
		.sort((a, b) => a.localeCompare(b))
		.map((name) => ({
			name,
			variants: [],
			connected: true,
		}));
}

async function runOpenCodeModels(args: string[]) {
	const { stdout } = await execFileAsync("opencode", args, {
		env: { ...process.env, NO_COLOR: "1" },
		maxBuffer: MAX_OUTPUT_BUFFER,
	});
	return stdout;
}

export async function listModelsFromOpenCode(): Promise<{
	baseUrl: string;
	models: OpencodeModel[];
}> {
	const verboseOutput = await runOpenCodeModels(["models", "--verbose"]);
	let models = parseVerboseModels(verboseOutput);
	if (models.length === 0) {
		models = parsePlainModels(await runOpenCodeModels(["models"]));
	}
	return { baseUrl: "opencode models --verbose", models };
}
