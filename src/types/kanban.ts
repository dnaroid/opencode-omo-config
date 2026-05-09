export type Difficulty = "easy" | "medium" | "hard" | "epic";

export type OpencodeModel = {
	name: string;
	variants?: string;
	difficulty: Difficulty;
	enabled: boolean;
	contextLimit?: number;
	connected?: boolean;
};
