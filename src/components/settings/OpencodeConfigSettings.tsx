"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	FileJson,
	RotateCcw,
	Save,
	Settings as SettingsIcon,
	ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { DynamicFormFields } from "./DynamicFormFields";
import type { JSONSchema } from "@/lib/json-schema-types";
import { applyTopLevelConfigChange } from "./config-utils";
import { validateSchema } from "./schema-utils";

type OpencodeConfigSettingsProps = {
	onStatusChangeAction: (status: {
		message: string;
		type: "info" | "error" | "success";
	}) => void;
};

const EXCLUDE_FIELDS = new Set(["$schema"]);

export function OpencodeConfigSettings({
	onStatusChangeAction,
}: OpencodeConfigSettingsProps) {
	const [configPath, setConfigPath] = useState<string | null>(null);
	const [config, setConfig] = useState<Record<string, unknown> | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [hasBackup, setHasBackup] = useState(false);
	const [unsavedChanges, setUnsavedChanges] = useState(false);
	const [schema, setSchema] = useState<JSONSchema | null>(null);
	const initialLoadDone = useRef(false);

	const loadSchema = useCallback(async (schemaUrl: string) => {
		try {
			const response = await api.schema.fetch(schemaUrl);
			setSchema(response.schema);
		} catch (error) {
			console.error("Failed to load schema:", error);
			setSchema(null);
		}
	}, []);

	const loadConfig = useCallback(
		async (path: string) => {
			try {
				setIsLoading(true);
				const response = await api.opencodeConfig.readConfig({ path });
				const config = response.config as Record<string, unknown>;
				if (response.path) {
					setConfigPath(response.path);
				}
				setConfig(config);
				setUnsavedChanges(false);
				setHasBackup(response.backupExists ?? false);
				if (config?.$schema && typeof config.$schema === "string") {
					await loadSchema(config.$schema);
				}
			} catch (error) {
				console.error("Failed to load config:", error);
				onStatusChangeAction({
					message: "Failed to load config",
					type: "error",
				});
			} finally {
				setIsLoading(false);
			}
		},
		[onStatusChangeAction, loadSchema],
	);

	const loadConfigPath = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await api.opencodeConfig.readConfig({});
			const loadedConfig = response.config as Record<string, unknown>;
			if (response.path) {
				setConfigPath(response.path);
			}
			setConfig(loadedConfig);
			setUnsavedChanges(false);
			setHasBackup(response.backupExists ?? false);
			if (loadedConfig?.$schema && typeof loadedConfig.$schema === "string") {
				await loadSchema(loadedConfig.$schema);
			}
		} catch {
			onStatusChangeAction({
				message: "No config found at default path",
				type: "info",
			});
		} finally {
			setIsLoading(false);
		}
	}, [loadSchema, onStatusChangeAction]);

	useEffect(() => {
		if (initialLoadDone.current) return;
		initialLoadDone.current = true;
		void loadConfigPath();
	}, [loadConfigPath]);

	useEffect(() => {
		if (!unsavedChanges) return;

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			return "";
		};

		const handlePopState = (e: PopStateEvent) => {
			e.preventDefault();
			const confirmed = window.confirm(
				"You have unsaved changes. Are you sure you want to leave?",
			);
			if (!confirmed) {
				window.history.pushState(null, "", window.location.href);
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		window.addEventListener("popstate", handlePopState);
		window.history.pushState(null, "", window.location.href);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			window.removeEventListener("popstate", handlePopState);
		};
	}, [unsavedChanges]);

	const handleSave = async () => {
		if (!config || !configPath) return;
		try {
			await api.opencodeConfig.saveConfig({ path: configPath, config });
			setUnsavedChanges(false);
			onStatusChangeAction({
				message: "CONFIGURATION SYNCHRONIZED",
				type: "success",
			});
		} catch (error) {
			console.error("Failed to save config:", error);
			onStatusChangeAction({
				message: "SYNCHRONIZATION FAILED",
				type: "error",
			});
		}
	};

	const handleBackup = async () => {
		if (!configPath) return;
		try {
			const response = await api.opencodeConfig.backup({ path: configPath });
			setHasBackup(true);
			onStatusChangeAction({
				message: `Backup created at ${response.backupPath}`,
				type: "success",
			});
		} catch (error) {
			console.error("Failed to create backup:", error);
			onStatusChangeAction({
				message: "Failed to create backup",
				type: "error",
			});
		}
	};

	const handleRestore = async () => {
		if (!configPath || !hasBackup) return;
		try {
			await api.opencodeConfig.restore({ path: configPath });
			await loadConfig(configPath);
			onStatusChangeAction({
				message: "Config restored from backup",
				type: "success",
			});
		} catch (error) {
			console.error("Failed to restore backup:", error);
			onStatusChangeAction({
				message: "Failed to restore backup",
				type: "error",
			});
		}
	};

	const handleChange = useCallback((key: string, value: unknown) => {
		setConfig((prev) => {
			if (!prev) return null;
			return applyTopLevelConfigChange(prev, key, value);
		});
		setUnsavedChanges(true);
	}, []);

	const validationErrors = useMemo(() => {
		if (!schema || !config) return [];
		return validateSchema(schema, config);
	}, [schema, config]);

	if (isLoading && !config) {
		return (
			<div className="flex items-center justify-center h-96">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	if (!configPath) {
		return (
			<div className="flex flex-col items-center justify-center h-96 space-y-6 text-center">
				<div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
					<FileJson className="w-8 h-8" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-white tracking-tight leading-none">
						Known OpenCode config was not found
					</h3>
					<p className="mt-3 text-xs text-slate-500 max-w-sm leading-relaxed">
						Create ~/.config/opencode/opencode.json and reload this page.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div className="flex-none bg-[#0B0E14] border-b border-slate-800/60 pb-6 mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
						<SettingsIcon className="w-5 h-5 animate-spin-slow" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none">
								Runtime Environment
							</span>
						</div>
						<p className="text-xl font-black text-white tracking-tight leading-none mt-1">
							Configuration <span className="text-slate-600">File</span>
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					{/* Config Section */}
					<div className="flex items-center bg-[#161B26] border border-slate-700 rounded-xl p-1 shadow-sm">
						<div className="h-8 px-3 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
							<FileJson className="w-3.5 h-3.5 text-slate-400" />
							Config
						</div>
						<div className="w-px h-4 bg-slate-700 mx-1" />
						<div
							className="px-3 text-[10px] text-slate-500 font-mono truncate max-w-[100px]"
							title={configPath || ""}
						>
							{configPath?.split("/").pop()}
						</div>
					</div>

					{/* Action Buttons */}
					<button
						type="button"
						onClick={() => {
							void handleSave();
						}}
						disabled={!unsavedChanges}
						className={cn(
							"h-10 px-5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg",
							unsavedChanges
								? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500"
								: "bg-slate-800/40 text-slate-500 cursor-not-allowed shadow-none",
						)}
					>
						<Save className="w-4 h-4" />
						{unsavedChanges ? "Apply" : "Synced"}
					</button>

					<div className="flex items-center bg-[#161B26] border border-slate-700 rounded-xl p-1 shadow-sm">
						<button
							type="button"
							onClick={() => {
								void handleBackup();
							}}
							className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
							title="Create Backup"
						>
							<RotateCcw className="w-4 h-4" />
						</button>
						<button
							type="button"
							onClick={() => {
								void handleRestore();
							}}
							disabled={!hasBackup}
							className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
							title="Restore from Backup"
						>
							<ShieldAlert className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>

			<div className="flex-1 relative">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
				<div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

				{config ? (
					<div className="space-y-8 pb-20">
						<DynamicFormFields
							schema={schema}
							data={config}
							onChange={handleChange}
							excludeFields={EXCLUDE_FIELDS}
							validationErrors={validationErrors}
						/>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-full text-center p-8">
						<div className="w-24 h-24 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-6 ring-1 ring-slate-700/50">
							<FileJson className="w-10 h-10 text-slate-600" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">
							No Configuration Loaded
						</h3>
						<p className="text-slate-400 max-w-md leading-relaxed">
							The known OpenCode config path is not available.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
