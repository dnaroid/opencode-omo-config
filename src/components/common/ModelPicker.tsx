import { useState } from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpencodeModel } from "@/types/kanban";

export const DIFFICULTY_STYLES = {
	easy: {
		text: "text-emerald-400",
		border: "border-emerald-500/50",
		bg: "bg-emerald-500/10",
		badge: "bg-emerald-500/20 text-emerald-400",
		glow: "shadow-[0_0_10px_rgba(16,185,129,0.2)]",
		hover:
			"hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5",
	},
	medium: {
		text: "text-blue-400",
		border: "border-blue-500/50",
		bg: "bg-blue-500/10",
		badge: "bg-blue-500/20 text-blue-400",
		glow: "shadow-[0_0_10px_rgba(59,130,246,0.2)]",
		hover: "hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5",
	},
	hard: {
		text: "text-amber-400",
		border: "border-amber-500/50",
		bg: "bg-amber-500/10",
		badge: "bg-amber-500/20 text-amber-400",
		glow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]",
		hover:
			"hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5",
	},
	epic: {
		text: "text-purple-400",
		border: "border-purple-500/50",
		bg: "bg-purple-500/10",
		badge: "bg-purple-500/20 text-purple-400",
		glow: "shadow-[0_0_10px_rgba(168,85,247,0.2)]",
		hover:
			"hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5",
	},
} as const;

interface ModelPickerProps {
	value: string | null;
	models: OpencodeModel[];
	onChange: (value: string | null) => void;
	placeholder?: string;
	className?: string;
	allowAuto?: boolean;
	difficulty?: string;
	showVariantSelector?: boolean;
	disabled?: boolean;
	borderless?: boolean;
}

const getModelDisplayName = (name: string) => name.split("/").pop() || name;
export const getModelProvider = (name: string) => name.split("/")[0] || "local";

const PROVIDER_STYLES = [
	{
		text: "text-cyan-300",
		border: "border-cyan-400/50",
		bg: "bg-cyan-400/10",
		badge: "bg-cyan-400/15 text-cyan-200 ring-cyan-300/20",
		glow: "shadow-[0_0_12px_rgba(34,211,238,0.2)]",
		hover: "hover:text-cyan-200 hover:border-cyan-400/50 hover:bg-cyan-400/10",
	},
	{
		text: "text-rose-300",
		border: "border-rose-400/50",
		bg: "bg-rose-400/10",
		badge: "bg-rose-400/15 text-rose-200 ring-rose-300/20",
		glow: "shadow-[0_0_12px_rgba(251,113,133,0.2)]",
		hover: "hover:text-rose-200 hover:border-rose-400/50 hover:bg-rose-400/10",
	},
	{
		text: "text-amber-300",
		border: "border-amber-400/50",
		bg: "bg-amber-400/10",
		badge: "bg-amber-400/15 text-amber-200 ring-amber-300/20",
		glow: "shadow-[0_0_12px_rgba(251,191,36,0.2)]",
		hover:
			"hover:text-amber-200 hover:border-amber-400/50 hover:bg-amber-400/10",
	},
	{
		text: "text-violet-300",
		border: "border-violet-400/50",
		bg: "bg-violet-400/10",
		badge: "bg-violet-400/15 text-violet-200 ring-violet-300/20",
		glow: "shadow-[0_0_12px_rgba(167,139,250,0.2)]",
		hover:
			"hover:text-violet-200 hover:border-violet-400/50 hover:bg-violet-400/10",
	},
	{
		text: "text-lime-300",
		border: "border-lime-400/50",
		bg: "bg-lime-400/10",
		badge: "bg-lime-400/15 text-lime-200 ring-lime-300/20",
		glow: "shadow-[0_0_12px_rgba(163,230,53,0.2)]",
		hover: "hover:text-lime-200 hover:border-lime-400/50 hover:bg-lime-400/10",
	},
	{
		text: "text-fuchsia-300",
		border: "border-fuchsia-400/50",
		bg: "bg-fuchsia-400/10",
		badge: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-300/20",
		glow: "shadow-[0_0_12px_rgba(232,121,249,0.2)]",
		hover:
			"hover:text-fuchsia-200 hover:border-fuchsia-400/50 hover:bg-fuchsia-400/10",
	},
	{
		text: "text-orange-300",
		border: "border-orange-400/50",
		bg: "bg-orange-400/10",
		badge: "bg-orange-400/15 text-orange-200 ring-orange-300/20",
		glow: "shadow-[0_0_12px_rgba(251,146,60,0.2)]",
		hover:
			"hover:text-orange-200 hover:border-orange-400/50 hover:bg-orange-400/10",
	},
	{
		text: "text-teal-300",
		border: "border-teal-400/50",
		bg: "bg-teal-400/10",
		badge: "bg-teal-400/15 text-teal-200 ring-teal-300/20",
		glow: "shadow-[0_0_12px_rgba(45,212,191,0.2)]",
		hover: "hover:text-teal-200 hover:border-teal-400/50 hover:bg-teal-400/10",
	},
] as const;

function hashProvider(provider: string) {
	let hash = 0;
	for (const char of provider) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}
	return hash;
}

export function getProviderStyle(modelName: string) {
	const provider = getModelProvider(modelName).toLowerCase();
	return PROVIDER_STYLES[hashProvider(provider) % PROVIDER_STYLES.length];
}

export function ModelPicker({
	value,
	models,
	onChange,
	placeholder = "Select Model",
	className,
	allowAuto = false,
	difficulty,
	showVariantSelector = true,
	disabled = false,
	borderless,
}: ModelPickerProps) {
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const [hoveredModel, setHoveredModel] = useState<string | null>(null);

	const [baseName, variant] = value ? value.split("#") : [null, null];
	const currentModel = models.find((m) => m.name === baseName);

	const displayDifficulty = (currentModel?.difficulty ||
		difficulty ||
		"easy") as keyof typeof DIFFICULTY_STYLES;
	const modelStyles = currentModel
		? getProviderStyle(currentModel.name)
		: DIFFICULTY_STYLES[displayDifficulty] || DIFFICULTY_STYLES.easy;

	const handleSelectModel = (modelName: string | null, variant?: string) => {
		if (modelName === null) {
			onChange(null);
		} else {
			const fullId = variant ? `${modelName}#${variant}` : modelName;
			onChange(fullId);
		}
		setIsPickerOpen(false);
	};

	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			<div className="relative" onMouseLeave={() => setIsPickerOpen(false)}>
				<button
					type="button"
					disabled={disabled}
					onClick={() => !disabled && setIsPickerOpen(!isPickerOpen)}
					className={cn(
						"w-max flex items-center justify-between text-[11px] transition-all whitespace-nowrap cursor-pointer",
						borderless
							? "px-1 py-0.5 rounded-md"
							: "px-3 h-8 rounded-lg border",
						disabled && "opacity-50 cursor-not-allowed pointer-events-none",
						!disabled &&
							(isPickerOpen
								? cn(
										modelStyles.bg,
										modelStyles.text,
										!borderless && modelStyles.border,
										!borderless && modelStyles.glow,
									)
								: cn(
										borderless
											? "text-slate-400"
											: "bg-slate-800/50 border-slate-700",
										modelStyles.text,
										!borderless && modelStyles.border,
										!borderless && modelStyles.hover,
									)),
					)}
				>
					<div className="flex items-center gap-1.5">
						<Cpu className="w-3 h-3" />
						{currentModel ? (
							<>
								<span className="font-semibold tracking-tight">
									{getModelDisplayName(currentModel.name)}
								</span>
								<span
									className={cn(
										"rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1",
										getProviderStyle(currentModel.name).badge,
									)}
								>
									{getModelProvider(currentModel.name)}
								</span>
							</>
						) : (
							<span className="text-slate-500 italic">
								{allowAuto ? "Auto" : placeholder}
							</span>
						)}
					</div>
					<ChevronDown
						className={cn(
							"w-3 h-3 ml-2 opacity-50 transition-transform",
							isPickerOpen && "rotate-180",
						)}
					/>
				</button>

				{isPickerOpen && (
					<div className="absolute left-0 top-full mt-0 min-w-full w-max max-h-64 overflow-y-auto no-scrollbar bg-[#161B26] border border-slate-800 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
						{models.length === 0 ? (
							<div className="px-3 py-4 text-center text-xs text-slate-500 italic">
								No models available.
							</div>
						) : (
							<>
								{allowAuto && (
									<button
										type="button"
										onClick={() => handleSelectModel(null)}
										onMouseEnter={() => setHoveredModel("auto")}
										onMouseLeave={() => setHoveredModel(null)}
										className={cn(
											"w-full flex items-center px-3 py-2 rounded-lg text-xs transition-all text-left",
											!value || hoveredModel === "auto"
												? cn(modelStyles.bg, modelStyles.text)
												: "text-slate-400 opacity-70",
										)}
									>
										<span className="italic">Auto (based on difficulty)</span>
									</button>
								)}
								{models.map((model) => {
									const isSelected = baseName === model.name;
									const isHovered = hoveredModel === model.name;
									const styles = getProviderStyle(model.name);
									return (
										<button
											type="button"
											key={model.name}
											onClick={() => {
												const variants = model.variants
													? model.variants.split(",").map((v) => v.trim())
													: [];
												const defaultVariant =
													showVariantSelector && variants.length > 0
														? variants[0]
														: undefined;
												handleSelectModel(model.name, defaultVariant);
											}}
											onMouseEnter={() => setHoveredModel(model.name)}
											onMouseLeave={() => setHoveredModel(null)}
											className={cn(
												"w-full flex items-center px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer",
												isSelected || isHovered
													? cn(styles.bg, styles.text)
													: cn(styles.text, "opacity-70"),
											)}
										>
											<span className="font-medium">
												{getModelDisplayName(model.name)}
											</span>
											<span
												className={cn(
													"ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1",
													styles.badge,
												)}
											>
												{getModelProvider(model.name)}
											</span>
										</button>
									);
								})}
							</>
						)}
					</div>
				)}
			</div>

			{showVariantSelector && currentModel && currentModel.variants && (
				<div className="relative group/variant">
					<select
						disabled={disabled}
						value={variant || currentModel.variants.split(",")[0].trim()}
						onChange={(e) =>
							handleSelectModel(currentModel.name, e.target.value)
						}
						className={cn(
							"appearance-none rounded-lg pl-2 pr-6 text-[10px] font-bold uppercase tracking-wider text-blue-400 cursor-pointer outline-none transition-all",
							borderless
								? "bg-transparent border-0 h-auto py-0.5"
								: "bg-slate-800/40 border border-slate-700/50 h-8 hover:bg-slate-800/60 hover:border-blue-500/30",
							"group-hover/variant:border-blue-500/30",
							disabled && "opacity-50 cursor-not-allowed pointer-events-none",
						)}
					>
						{currentModel.variants.split(",").map((v) => {
							const vName = v.trim();
							return (
								<option
									key={vName}
									value={vName}
									className="bg-[#161B26] text-slate-300"
								>
									{vName}
								</option>
							);
						})}
					</select>
					<div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover/variant:text-blue-400 transition-colors">
						<svg
							aria-hidden="true"
							width="8"
							height="6"
							viewBox="0 0 8 6"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M1 1.5L4 4.5L7 1.5"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
				</div>
			)}
		</div>
	);
}
