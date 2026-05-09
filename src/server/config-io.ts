import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";

export const OMC_PRESET_SUFFIX = ".oh-my-openagent.json";
export const OMC_ORIGINAL_PRESET_NAME = `_original${OMC_PRESET_SUFFIX}`;

export function parseMaybeJsonc(content: string): unknown {
	const errors: ParseError[] = [];
	const result = parseJsonc(content, errors, { allowTrailingComma: true });
	if (errors.length > 0) {
		throw new Error(`Failed to parse JSONC: ${errors.length} error(s)`);
	}
	return result;
}

export async function readConfig(pathToConfig: string): Promise<unknown> {
	const content = await fs.readFile(pathToConfig, "utf-8");
	return parseMaybeJsonc(content);
}

export async function saveConfig(pathToConfig: string, config: unknown) {
	await fs.mkdir(path.dirname(pathToConfig), { recursive: true });
	await fs.writeFile(pathToConfig, JSON.stringify(config, null, 2), "utf-8");
}

export async function backupConfig(pathToConfig: string) {
	const backupPath = `${pathToConfig}.backup`;
	const content = await fs.readFile(pathToConfig, "utf-8");
	await fs.writeFile(backupPath, content, "utf-8");
	return backupPath;
}

export async function configBackupExists(pathToConfig: string) {
	try {
		await fs.access(`${pathToConfig}.backup`);
		return true;
	} catch {
		return false;
	}
}

export async function restoreConfig(pathToConfig: string) {
	const backupPath = `${pathToConfig}.backup`;
	const content = await fs.readFile(backupPath, "utf-8");
	await fs.writeFile(pathToConfig, content, "utf-8");
}

export async function listPresets(pathToConfig: string): Promise<string[]> {
	const presetDir = path.dirname(pathToConfig);
	const baseConfigName = path.basename(pathToConfig);
	const entries = await fs.readdir(presetDir);

	return entries
		.filter(
			(entry) =>
				entry.endsWith(OMC_PRESET_SUFFIX) &&
				entry !== OMC_ORIGINAL_PRESET_NAME &&
				entry !== baseConfigName,
		)
		.map((entry) => entry.replace(OMC_PRESET_SUFFIX, ""))
		.sort((a, b) => a.localeCompare(b));
}

export function buildPresetPath(
	pathToConfig: string,
	presetName: string,
): string {
	return path.join(
		path.dirname(pathToConfig),
		`${presetName.replace(/\.oh-my-openagent\.json$/i, "")}${OMC_PRESET_SUFFIX}`,
	);
}

function sortObjectKeys(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) return value.map(sortObjectKeys);
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value).sort()) {
		sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
	}
	return sorted;
}

function stableHash(value: unknown) {
	return crypto
		.createHash("sha256")
		.update(JSON.stringify(sortObjectKeys(value)))
		.digest("hex");
}

export async function detectMatchingPreset(
	pathToConfig: string,
): Promise<string | null> {
	const current = await readConfig(pathToConfig);
	const currentHash = stableHash(current);
	for (const presetName of await listPresets(pathToConfig)) {
		const preset = await readConfig(buildPresetPath(pathToConfig, presetName));
		if (stableHash(preset) === currentHash) return presetName;
	}
	return null;
}
