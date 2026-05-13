import $RefParser from "@apidevtools/json-schema-ref-parser";
import type { FileInfo } from "@apidevtools/json-schema-ref-parser";
import { invoke } from "@tauri-apps/api/core";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import type { JSONSchema } from "./json-schema-types";
import type { OpencodeModel } from "@/types/kanban";

type RawModel = {
	name: string;
	variants?: string[];
	contextLimit?: number;
	connected?: boolean;
};

type ReadConfigResponse = {
	path: string;
	content: string;
	backupExists: boolean;
};

type SchemaObject = Record<string, unknown>;

function parseMaybeJsonc(content: string): unknown {
	const errors: ParseError[] = [];
	const result = parseJsonc(content, errors, { allowTrailingComma: true });
	if (errors.length > 0) {
		throw new Error(`Failed to parse JSONC: ${errors.length} error(s)`);
	}
	return result;
}

function forceAdditionalPropertiesFalse(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return schema;
	if (Array.isArray(schema)) return schema.map(forceAdditionalPropertiesFalse);

	const obj = schema as SchemaObject;
	const result: SchemaObject = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = forceAdditionalPropertiesFalse(value);
	}
	if (obj.type === "object" && !("additionalProperties" in obj)) {
		result.additionalProperties = false;
	}
	return result;
}

async function readConfig(
	kind: "opencode" | "omc",
	path?: string,
): Promise<{ config: unknown; path?: string; backupExists?: boolean }> {
	const response = await invoke<ReadConfigResponse>("read_config", {
		kind,
		path,
	});
	return {
		path: response.path,
		config: parseMaybeJsonc(response.content),
		backupExists: response.backupExists,
	};
}

class ApiClient {
	readonly schema = {
		fetch: async (url: string): Promise<{ schema: JSONSchema }> => {
			const rawSchema = await invoke<unknown>("fetch_schema", { url });
			try {
				const resolved = await $RefParser.dereference(rawSchema as object, {
					resolve: {
						http: {
							canRead: /^https?:\/\//i,
							read: async (file: FileInfo) => {
								const schema = await invoke<unknown>("fetch_schema", {
									url: file.url,
								});
								return JSON.stringify(schema);
							},
						},
					},
					continueOnError: false,
				});
				return {
					schema: forceAdditionalPropertiesFalse(resolved) as JSONSchema,
				};
			} catch {
				return {
					schema: forceAdditionalPropertiesFalse(rawSchema) as JSONSchema,
				};
			}
		},
	};

	readonly opencodeConfig = {
		readConfig: async ({ path }: { path?: string }) =>
			readConfig("opencode", path),
		saveConfig: async ({
			path,
			config,
		}: {
			path: string;
			config: unknown;
		}): Promise<{ ok: boolean }> =>
			invoke<{ ok: boolean }>("save_config", {
				kind: "opencode",
				path,
				config,
			}),
		backup: async ({
			path,
		}: {
			path: string;
		}): Promise<{ ok: boolean; backupPath: string }> =>
			invoke<{ ok: boolean; backupPath: string }>("backup_config", {
				kind: "opencode",
				path,
			}),
		restore: async ({ path }: { path: string }): Promise<{ ok: boolean }> =>
			invoke<{ ok: boolean }>("restore_config", { kind: "opencode", path }),
	};

	readonly omc = {
		readConfig: async ({ path }: { path?: string }) => readConfig("omc", path),
		saveConfig: async ({
			path,
			config,
		}: {
			path: string;
			config: unknown;
		}): Promise<{ ok: boolean }> =>
			invoke<{ ok: boolean }>("save_config", {
				kind: "omc",
				path,
				config,
			}),
		listPresets: async ({
			path,
		}: {
			path: string;
		}): Promise<{ presets: string[]; matchingPreset: string | null }> =>
			invoke<{ presets: string[]; matchingPreset: string | null }>(
				"list_presets",
				{ path },
			),
		savePreset: async ({
			path,
			presetName,
			config,
		}: {
			path: string;
			presetName: string;
			config: unknown;
		}): Promise<{ ok: boolean; presetPath?: string }> =>
			invoke<{ ok: boolean; presetPath?: string }>("save_preset", {
				path,
				presetName,
				config,
			}),
		loadPreset: async ({
			path,
			presetName,
		}: {
			path: string;
			presetName: string;
		}): Promise<{ config: unknown }> => {
			const response = await invoke<{ content: string }>("load_preset", {
				path,
				presetName,
			});
			return { config: parseMaybeJsonc(response.content) };
		},
		backup: async ({
			path,
		}: {
			path: string;
		}): Promise<{ ok: boolean; backupPath: string }> =>
			invoke<{ ok: boolean; backupPath: string }>("backup_config", {
				kind: "omc",
				path,
			}),
		restore: async ({ path }: { path: string }): Promise<{ ok: boolean }> =>
			invoke<{ ok: boolean }>("restore_config", { kind: "omc", path }),
	};

	readonly opencode = {
		listModels: async (): Promise<{ models: OpencodeModel[] }> => {
			const response = await invoke<{ models: RawModel[] }>("list_models");
			return {
				models: response.models
					.filter((model) => model.connected)
					.map((model) => ({
						name: model.name,
						variants: model.variants?.join(","),
						contextLimit: model.contextLimit,
						connected: model.connected,
						enabled: true,
						difficulty: "medium",
					})),
			};
		},
	};
}

export const api = new ApiClient();
