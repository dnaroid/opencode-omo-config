"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	FileJson,
	Layers,
	RotateCcw,
	Save,
	ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { OpencodeModel } from "@/types/kanban";
import type { OhMyOpenagentConfig } from "./OhMyOpenagentTypes";
import { DynamicFormFields } from "./DynamicFormFields";
import { EngagedModelsSummary } from "./EngagedModelsSummary";
import type { JSONSchema } from "@/lib/json-schema-types";
import { validateSchema } from "./schema-utils";

type OhMyOpenagentSettingsProps = {
	onStatusChangeAction: (status: {
		message: string;
		type: "info" | "error" | "success";
	}) => void;
};

export function OhMyOpenagentSettings({
	onStatusChangeAction,
}: OhMyOpenagentSettingsProps) {
	const [configPath, setConfigPath] = useState<string | null>(null);
	const [config, setConfig] = useState<OhMyOpenagentConfig | null>(null);
	const [models, setModels] = useState<OpencodeModel[]>([]);
	const [modelsLoading, setModelsLoading] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [hasBackup, setHasBackup] = useState(false);
	const [unsavedChanges, setUnsavedChanges] = useState(false);
	const [presets, setPresets] = useState<string[]>([]);
	const [selectedPreset, setSelectedPreset] = useState("");
	const [newPresetName, setNewPresetName] = useState("");
	const [schema, setSchema] = useState<JSONSchema | null>(null);

	const loadPresets = useCallback(async (path: string) => {
		try {
			const response = await api.omc.listPresets({ path });
			setPresets(response.presets);
			setSelectedPreset((prev) => {
				if (response.matchingPreset) return response.matchingPreset;
				return prev && !response.presets.includes(prev) ? "" : prev;
			});
		} catch (error) {
			console.error("Failed to load presets:", error);
		}
	}, []);

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
				const response = await api.omc.readConfig({ path });
				const config = response.config as OhMyOpenagentConfig;
				if (response.path) {
					setConfigPath(response.path);
				}
				setConfig(config);
				setUnsavedChanges(false);
				setHasBackup(response.backupExists ?? false);
				if (config.$schema) {
					await loadSchema(config.$schema);
				}
				await loadPresets(response.path ?? path);
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
		[loadPresets, onStatusChangeAction, loadSchema],
	);

	const loadConfigPath = useCallback(async () => {
		try {
			const response = await api.omc.readConfig({});
			if (response.path) {
				setConfigPath(response.path);
			}
			const config = response.config as OhMyOpenagentConfig;
			setConfig(config);
			setUnsavedChanges(false);
			setHasBackup(response.backupExists ?? false);
			if (config.$schema) {
				await loadSchema(config.$schema);
			}
			if (response.path) {
				await loadPresets(response.path);
			}
		} catch (error) {
			console.error("Failed to load config path:", error);
			onStatusChangeAction({
				message: "No oh-my-openagent config found at known path",
				type: "info",
			});
		}
	}, [loadPresets, loadSchema, onStatusChangeAction]);

	const loadModels = useCallback(async () => {
		try {
			setModelsLoading(true);
			const response = await api.opencode.listModels();
			const difficultyOrder: Record<string, number> = {
				easy: 0,
				medium: 1,
				hard: 2,
				epic: 3,
			};
			const enabledModels = response.models.filter((model) => model.enabled);
			const sortedModels = [...enabledModels].sort((a, b) => {
				const aOrder = difficultyOrder[a.difficulty] ?? Number.MAX_SAFE_INTEGER;
				const bOrder = difficultyOrder[b.difficulty] ?? Number.MAX_SAFE_INTEGER;
				return aOrder - bOrder;
			});
			setModels(sortedModels);
		} catch (error) {
			console.error("Failed to load models:", error);
		} finally {
			setModelsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadConfigPath();
		void loadModels();
	}, [loadConfigPath, loadModels]);

	// Warn on route change when there are unsaved changes
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
			await api.omc.saveConfig({ path: configPath, config });
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

	const handleSavePreset = async () => {
		if (!config || !configPath || !newPresetName.trim()) return;
		const presetName = newPresetName
			.trim()
			.replace(/\.oh-my-openagent\.json$/i, "");
		try {
			await api.omc.savePreset({ path: configPath, presetName, config });
			setNewPresetName("");
			setSelectedPreset(presetName);
			await loadPresets(configPath);
			onStatusChangeAction({
				message: `Preset saved as ${presetName}`,
				type: "success",
			});
		} catch (error) {
			console.error("Failed to save preset:", error);
			onStatusChangeAction({ message: "Failed to save preset", type: "error" });
		}
	};

	const handleLoadPreset = async (presetName?: string) => {
		const name = presetName ?? selectedPreset;
		if (!configPath || !name) return;
		try {
			setIsLoading(true);
			const response = await api.omc.loadPreset({
				path: configPath,
				presetName: name,
			});
			setConfig(response.config as OhMyOpenagentConfig);
			setUnsavedChanges(true);
			onStatusChangeAction({
				message: `Preset loaded: ${name}`,
				type: "success",
			});
		} catch (error) {
			console.error("Failed to load preset:", error);
			onStatusChangeAction({ message: "Failed to load preset", type: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackup = async () => {
		if (!configPath) return;
		try {
			const response = await api.omc.backup({ path: configPath });
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
			await api.omc.restore({ path: configPath });
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
			return { ...prev, [key]: value };
		});
		setUnsavedChanges(true);
		setSelectedPreset("");
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
						Known Oh-My-OpenAgent config was not found
					</h3>
					<p className="mt-3 text-xs text-slate-500 max-w-sm leading-relaxed">
						Create ~/.config/opencode/oh-my-openagent.json and reload this page.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div className="flex-none bg-[#0B0E14] border-b border-slate-800/60 pb-6 mb-6 shrink-0 flex justify-end">
				<div className="flex items-center gap-3 flex-wrap justify-end">
					{/* Preset Section */}
					<div className="flex items-center bg-[#161B26] border border-slate-700 rounded-xl p-1 shadow-sm">
						<div className="flex items-center gap-2 px-2">
							<Layers className="w-4 h-4 text-slate-500" />
							<div className="relative">
								<select
									value={selectedPreset}
									disabled={isLoading}
									onChange={(e) => {
										const value = e.target.value;
										setSelectedPreset(value);
										if (value) void handleLoadPreset(value);
									}}
									className="bg-transparent text-[11px] font-bold text-slate-200 pr-6 py-1 focus:outline-none appearance-none cursor-pointer min-w-[120px] max-w-[180px] truncate hover:bg-slate-800/50 hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<option value="" className="bg-[#161B26]">
										Select Preset...
									</option>
									{presets.map((preset) => (
										<option
											key={preset}
											value={preset}
											className="bg-[#161B26]"
										>
											{preset}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
							</div>
						</div>

						<div className="w-px h-4 bg-slate-700 mx-1" />

						<div className="flex items-center gap-1 pl-1">
							<input
								value={newPresetName}
								onChange={(e) => setNewPresetName(e.target.value)}
								placeholder="New name..."
								className="bg-transparent text-[11px] text-slate-300 px-2 py-1 focus:outline-none w-24 placeholder:text-slate-600"
							/>
							<button
								type="button"
								onClick={() => void handleSavePreset()}
								disabled={!newPresetName.trim() || !config}
								className={cn(
									"h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
									newPresetName.trim() && config
										? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 ring-1 ring-emerald-500/30"
										: "text-slate-600 cursor-not-allowed",
								)}
							>
								Save
							</button>
						</div>
					</div>

					<div className="w-px h-8 bg-slate-800/60 mx-1" />

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

				<EngagedModelsSummary
					config={config}
					models={models}
					isLoading={modelsLoading}
				/>

				{config ? (
					<div className="space-y-8 pb-20">
						<DynamicFormFields
							schema={schema}
							data={config as unknown as Record<string, unknown>}
							onChange={handleChange}
							excludeFields={new Set(["$schema"])}
							models={models}
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
							The known Oh-My-OpenAgent config path is not available.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
