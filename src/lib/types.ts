export type StatusType = "info" | "error" | "success";

export type ConfigKind = "opencode" | "omc";

export type OpencodeModel = {
	name: string;
	variants: string[];
	contextLimit?: number;
	connected: boolean;
};

export type OpencodeModelsResponse = {
	models: OpencodeModel[];
	baseUrl: string;
};

export type ConfigResponse = {
	path: string;
	config: unknown;
};

export type PresetsResponse = {
	presets: string[];
	matchingPreset: string | null;
};
