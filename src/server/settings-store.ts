import os from "os";
import path from "path";
import fs from "fs/promises";

export async function getDefaultOpencodeConfigPath(): Promise<string | null> {
	const homeDir = os.homedir();
	const candidate = path.join(getOpencodeConfigDir(homeDir), "opencode.json");

	try {
		await fs.access(candidate);
		return candidate;
	} catch {
		return null;
	}
}

export async function getDefaultOhMyOpenagentConfigPath(): Promise<
	string | null
> {
	const homeDir = os.homedir();
	const candidate = path.join(
		getOpencodeConfigDir(homeDir),
		"oh-my-openagent.json",
	);

	try {
		await fs.access(candidate);
		return candidate;
	} catch {
		return null;
	}
}

function getOpencodeConfigDir(homeDir: string) {
	return process.platform === "win32"
		? path.join(
				process.env.APPDATA ?? path.join(homeDir, "AppData", "Roaming"),
				"opencode",
			)
		: path.join(homeDir, ".config", "opencode");
}

export async function resolveConfigPath(
	kind: "opencode" | "omc",
	pathFromRequest?: string | null,
): Promise<string | null> {
	if (pathFromRequest && pathFromRequest.trim().length > 0) {
		return pathFromRequest.trim();
	}

	if (kind === "opencode") {
		return await getDefaultOpencodeConfigPath();
	}

	return await getDefaultOhMyOpenagentConfigPath();
}
