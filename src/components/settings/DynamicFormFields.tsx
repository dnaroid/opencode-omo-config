"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { JSONSchema } from "@/lib/json-schema-types";
import { canRemoveObjectProperty, type ValidationError } from "./schema-utils";
import {
	ChevronDown,
	ChevronRight,
	Plus,
	AlertCircle,
	X,
	AlertTriangle,
	Cpu,
} from "lucide-react";
import {
	getModelProvider,
	getProviderStyle,
	ModelPicker,
} from "@/components/common/ModelPicker";
import type { OpencodeModel } from "@/types/kanban";

interface FieldProps {
	schema: JSONSchema;
	value: unknown;
	onChange: (value: unknown) => void;
	label?: string;
	path: string;
	models?: OpencodeModel[];
	modelVariants?: string[];
	entityModel?: string; // Currently selected model in this entity
	depth?: number;
	validationErrors?: ValidationError[];
	labelAction?: React.ReactNode;
}

function FieldLabel({
	label,
	action,
}: {
	label: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between pl-1">
			<div className="block text-xs font-bold text-slate-400">{label}</div>
			{action}
		</div>
	);
}

function normalizeValidationPath(path: string): string {
	if (!path || path === "/") return "";
	return path
		.replace(/^\//, "")
		.split("/")
		.filter(Boolean)
		.map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
		.join(".");
}

function getValidationTargetPath(error: ValidationError): string {
	const path = normalizeValidationPath(error.path);
	const missingProperty = error.params?.missingProperty;

	if (error.keyword === "required" && typeof missingProperty === "string") {
		return path ? `${path}.${missingProperty}` : missingProperty;
	}

	return path;
}

function getValidationErrorsForPath(
	validationErrors: ValidationError[],
	path: string,
): ValidationError[] {
	return validationErrors.filter(
		(error) => getValidationTargetPath(error) === path,
	);
}

function schemaHasPath(schema: JSONSchema, path: string): boolean {
	if (!path) return true;

	let current: JSONSchema | undefined = schema;
	for (const part of path.split(".")) {
		const propertySchema = current?.properties?.[part] as
			| JSONSchema
			| undefined;
		if (propertySchema) {
			current = propertySchema;
			continue;
		}

		const additionalSchema = current?.additionalProperties as
			| JSONSchema
			| undefined;
		if (additionalSchema && typeof additionalSchema === "object") {
			current = additionalSchema;
			continue;
		}

		return false;
	}

	return true;
}

function FieldErrors({ errors }: { errors: ValidationError[] }) {
	if (errors.length === 0) return null;

	return (
		<div className="space-y-1 pt-1">
			{errors.map((error, index) => (
				<div
					key={`${error.path}-${error.keyword}-${index}`}
					className="flex items-start gap-1.5 text-xs text-red-400 px-1"
				>
					<AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
					<span>{error.message}</span>
				</div>
			))}
		</div>
	);
}

function DynamicInputField({
	label,
	value,
	onChange,
	type = "text",
	placeholder,
	disabled,
	labelAction,
}: {
	label: string;
	value: string | number | undefined;
	onChange: (val: string) => void;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	labelAction?: React.ReactNode;
}) {
	return (
		<div className="relative space-y-1.5">
			<FieldLabel label={label} action={labelAction} />
			<div className="relative">
				<input
					type={type}
					value={value ?? ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					disabled={disabled}
					className={cn(
						"w-full bg-[#161B26] border border-slate-700 rounded-xl px-4 py-2.5",
						"text-sm text-slate-200 placeholder:text-slate-500",
						"hover:border-slate-600 transition-all",
						"focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)]",
						"disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
					)}
				/>
			</div>
		</div>
	);
}

function StyledSelect({
	value,
	onChange,
	options,
	placeholder = "Select...",
	disabled,
	className,
	allowEmpty = true,
}: {
	value: string;
	onChange: (val: string) => void;
	options: { value: string; label: string }[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	allowEmpty?: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const selectedOption = options.find((option) => option.value === value);
	const selectedLabel = selectedOption?.label ?? placeholder;
	const isPlaceholder = !selectedOption;

	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [isOpen]);

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<button
				type="button"
				disabled={disabled}
				onClick={() => setIsOpen((open) => !open)}
				className={cn(
					"group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-[#161B26] px-4 py-2.5 text-left text-sm text-slate-200",
					"shadow-sm shadow-black/20 transition-all duration-200",
					"hover:border-slate-600 hover:bg-[#1A2030] hover:shadow-lg hover:shadow-black/20",
					"focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)]",
					isOpen &&
						"border-blue-500/50 bg-[#1A2030] ring-4 ring-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
					disabled &&
						"cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-600 opacity-60 shadow-none hover:border-slate-800 hover:bg-slate-900/40 hover:shadow-none",
				)}
			>
				<span
					className={cn(
						"truncate",
						isPlaceholder && "text-slate-500",
						disabled && "text-slate-600",
					)}
				>
					{selectedLabel}
				</span>
				<ChevronDown
					className={cn(
						"h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-hover:text-blue-400",
						isOpen && "rotate-180 text-blue-400",
						disabled && "text-slate-700 group-hover:text-slate-700",
					)}
				/>
			</button>

			{isOpen && !disabled && (
				<div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-700/80 bg-[#101521] p-1 shadow-2xl shadow-black/40 ring-1 ring-blue-500/10">
					<div className="max-h-60 overflow-y-auto custom-scrollbar">
						{allowEmpty && (
							<button
								type="button"
								onClick={() => {
									onChange("");
									setIsOpen(false);
								}}
								className={cn(
									"flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-blue-500/10 hover:text-blue-300",
									value === "" && "bg-blue-500/10 text-blue-300",
								)}
							>
								{placeholder}
							</button>
						)}
						{options.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => {
									onChange(option.value);
									setIsOpen(false);
								}}
								className={cn(
									"flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-blue-500/10 hover:text-blue-200",
									option.value === value &&
										"bg-blue-500/15 text-blue-200 shadow-inner shadow-blue-500/10",
								)}
							>
								<span className="truncate">{option.label}</span>
								{option.value === value && (
									<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
								)}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function DynamicSelectField({
	label,
	value,
	onChange,
	options,
	placeholder,
	disabled,
}: {
	label?: string;
	value: string | undefined;
	onChange: (val: string) => void;
	options: string[];
	placeholder?: string;
	disabled?: boolean;
}) {
	return (
		<div className="relative space-y-1.5">
			{label && (
				<div className="block text-xs font-bold text-slate-400 pl-1">
					{label}
				</div>
			)}
			<StyledSelect
				value={value ?? ""}
				onChange={onChange}
				options={options.map((option) => ({ value: option, label: option }))}
				placeholder={placeholder}
				disabled={disabled}
			/>
		</div>
	);
}

function DynamicToggleField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: boolean | undefined;
	onChange: (val: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between py-2 px-1 hover:bg-slate-800/20 rounded-lg transition-colors group">
			<div className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
				{label}
			</div>
			<button
				type="button"
				onClick={() => onChange(!value)}
				className={cn(
					"relative w-11 h-6 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/10",
					value ? "bg-blue-600 shadow-lg shadow-blue-600/20" : "bg-slate-700",
				)}
			>
				<div
					className={cn(
						"absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
						value && "translate-x-5",
					)}
				/>
			</button>
		</div>
	);
}

function DynamicArrayField({
	label,
	value,
	onChange,
	items,
	labelAction,
}: {
	label: string;
	value: string[] | undefined;
	onChange: (val: string[]) => void;
	items?: JSONSchema;
	labelAction?: React.ReactNode;
}) {
	const arr = Array.isArray(value) ? value : [];

	const handleAdd = () => {
		onChange([...arr, ""]);
	};

	const handleRemove = (index: number) => {
		onChange(arr.filter((_, i) => i !== index));
	};

	const handleChange = (index: number, newValue: string) => {
		const updated = [...arr];
		updated[index] = newValue;
		onChange(updated);
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<FieldLabel label={label} action={labelAction} />
				<button
					type="button"
					onClick={handleAdd}
					className="text-xs font-bold text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
				>
					+ Add Item
				</button>
			</div>
			<div className="space-y-2">
				{arr.map((item, index) => {
					return (
						<div key={index} className="flex gap-2">
							{items?.enum ? (
								<StyledSelect
									value={item}
									onChange={(newValue) => handleChange(index, newValue)}
									options={items.enum.map((option) => ({
										value: String(option),
										label: String(option),
									}))}
									className="flex-1"
								/>
							) : (
								<input
									type="text"
									value={item}
									onChange={(e) => handleChange(index, e.target.value)}
									className="flex-1 bg-[#161B26] border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-slate-500"
								/>
							)}
							<button
								type="button"
								onClick={() => handleRemove(index)}
								className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg px-2 transition-colors"
							>
								×
							</button>
						</div>
					);
				})}
				{arr.length === 0 && (
					<div className="text-xs text-slate-600 italic px-1">
						No items added
					</div>
				)}
			</div>
		</div>
	);
}

function inferSchema(value: unknown): JSONSchema {
	if (value === null || value === undefined) return { type: "string" };
	if (typeof value === "boolean") return { type: "boolean" };
	if (typeof value === "number") return { type: "number" };
	if (typeof value === "string") return { type: "string" };
	if (Array.isArray(value)) {
		return {
			type: "array",
			items: inferSchema(value[0]),
		};
	}

	return {
		type: "object",
		properties: Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(
				([key, fieldValue]) => [key, inferSchema(fieldValue)],
			),
		),
	};
}

function mergeSchemaWithData(schema: JSONSchema, data: unknown): JSONSchema {
	if (!data || typeof data !== "object" || Array.isArray(data)) return schema;

	const dataProperties = Object.fromEntries(
		Object.entries(data as Record<string, unknown>).map(([key, value]) => [
			key,
			inferSchema(value),
		]),
	);

	return {
		...schema,
		properties: {
			...dataProperties,
			...(schema.properties ?? {}),
		},
	};
}

function DynamicObjectField({
	schema,
	value,
	onChange,
	path,
	label,
	labelAction,
	models,
	modelVariants,
	depth = 0,
	entityModel,
	validationErrors = [],
}: FieldProps & { depth?: number }) {
	const obj = (value as Record<string, unknown>) ?? {};

	const handleChange = (key: string, newValue: unknown) => {
		onChange({ ...obj, [key]: newValue });
	};

	// Handle defined properties
	const definedProps = schema.properties
		? Object.entries(schema.properties)
		: [];

	// Handle additionalProperties for dynamic keys (like agents.build, categories.primary)
	const additionalSchema = schema.additionalProperties as
		| JSONSchema
		| undefined;
	const dynamicKeys = Object.keys(obj).filter(
		(k) => !definedProps.some(([pk]) => pk === k),
	);

	if (definedProps.length === 0 && dynamicKeys.length === 0) return null;

	// For dynamic objects (agents, categories), render as collapsible tree
	if (depth > 0 && (definedProps.length > 0 || dynamicKeys.length > 0)) {
		return (
			<ObjectTreeNode
				schema={schema}
				value={obj}
				onChange={onChange}
				path={path}
				label={label}
				labelAction={labelAction}
				models={models}
				modelVariants={modelVariants}
				depth={depth}
				definedProps={definedProps}
				dynamicKeys={dynamicKeys}
				additionalSchema={additionalSchema}
				entityModel={entityModel}
				validationErrors={validationErrors}
			/>
		);
	}

	// Root level: render defined properties and dynamic keys
	return (
		<div className="space-y-2">
			{definedProps.map(([key, propSchema]) => (
				<DynamicField
					key={key}
					schema={propSchema as JSONSchema}
					value={obj[key]}
					onChange={(v) => handleChange(key, v)}
					label={key}
					path={`${path}.${key}`}
					models={models}
					modelVariants={modelVariants}
					depth={depth + 1}
					entityModel={obj.model as string | undefined}
					validationErrors={validationErrors}
				/>
			))}
			{dynamicKeys.map((key) => (
				<DynamicField
					key={key}
					schema={additionalSchema!}
					value={obj[key]}
					onChange={(v) => handleChange(key, v)}
					label={key}
					path={`${path}.${key}`}
					models={models}
					modelVariants={modelVariants}
					depth={depth + 1}
					entityModel={obj.model as string | undefined}
					validationErrors={validationErrors}
				/>
			))}
		</div>
	);
}

function ObjectTreeNode({
	schema,
	value,
	onChange,
	path,
	label: labelProp,
	labelAction,
	models,
	modelVariants,
	depth,
	definedProps,
	dynamicKeys,
	additionalSchema,
	validationErrors = [],
}: FieldProps & {
	depth: number;
	definedProps: [string, unknown][];
	dynamicKeys: string[];
	additionalSchema?: JSONSchema;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newKeyName, setNewKeyName] = useState("");
	const obj = (value as Record<string, unknown>) ?? {};
	const canRemoveKey = (key: string) =>
		canRemoveObjectProperty(schema, obj, key);

	const handleChange = (key: string, newValue: unknown) => {
		onChange({ ...obj, [key]: newValue });
	};

	const handleAddEntity = () => {
		if (!newKeyName.trim()) return;
		const allKeys = [...definedProps.map(([k]) => k), ...dynamicKeys];
		if (allKeys.includes(newKeyName.trim())) return;

		const defaultValue =
			additionalSchema?.type === "object"
				? {}
				: additionalSchema?.type === "array"
					? []
					: additionalSchema?.type === "string"
						? ""
						: additionalSchema?.type === "number"
							? 0
							: additionalSchema?.type === "boolean"
								? false
								: null;

		onChange({ ...obj, [newKeyName.trim()]: defaultValue });
		setNewKeyName("");
		setShowAddModal(false);
	};

	const handleRemoveDynamicKey = (key: string) => {
		if (!canRemoveKey(key)) return;
		const rest = Object.fromEntries(
			Object.entries(obj).filter(([entryKey]) => entryKey !== key),
		);
		onChange(rest);
	};

	const handleRemoveDefinedKey = (key: string) => {
		if (!canRemoveKey(key)) return;
		const rest = Object.fromEntries(
			Object.entries(obj).filter(([entryKey]) => entryKey !== key),
		);
		onChange(rest);
	};

	const hasContent = definedProps.length > 0 || dynamicKeys.length > 0;
	const canAddEntity = additionalSchema && dynamicKeys.length >= 0;
	const label = labelProp ?? path.split(".").pop() ?? "";
	const fieldLabel = schema.title ?? label;

	// Extract model and variant for header
	const itemModel = obj.model as string | undefined;
	const itemVariant = obj.variant as string | undefined;

	// Determine model styles based on provider
	const modelInfo = models?.find((m) => m.name === itemModel);
	const styledModelName = modelInfo?.name ?? itemModel;
	const styles = styledModelName ? getProviderStyle(styledModelName) : null;

	const pathErrors = validationErrors.filter((error) => {
		const targetPath = getValidationTargetPath(error);
		return targetPath === path || targetPath.startsWith(`${path}.`);
	});

	return (
		<div className="relative border border-slate-800/60 rounded-xl bg-slate-900/20">
			<div className="w-full flex items-center gap-2 px-4 py-3 bg-slate-800/40 border-b border-transparent hover:border-slate-800/60">
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex-1 flex items-center gap-2 hover:bg-slate-800/60 transition-colors rounded px-1 py-0.5 text-left"
				>
					{isExpanded ? (
						<ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
					) : (
						<ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
					)}
					<span className="text-sm font-bold text-slate-300 truncate">
						{fieldLabel}
					</span>

					{itemModel && (
						<div
							className={cn(
								"flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-md ring-1 max-w-[240px] truncate",
								styles?.bg ?? "bg-slate-800/40",
								styles?.text ?? "text-slate-300",
								"ring-opacity-20 border-none",
							)}
							style={{
								borderColor: "transparent",
								boxShadow: "none",
							}}
						>
							<Cpu
								className={cn(
									"w-3 h-3 shrink-0",
									styles?.text ?? "text-slate-400",
								)}
							/>
							<span
								className={cn(
									"text-[10px] font-bold uppercase tracking-tight truncate",
									styles?.text ?? "text-slate-300",
								)}
							>
								{itemModel.split("/").pop()}
								{itemVariant ? ` (${itemVariant})` : ""}
							</span>
							{styledModelName && styles && (
								<span
									className={cn(
										"rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1",
										styles.badge,
									)}
								>
									{getModelProvider(styledModelName)}
								</span>
							)}
						</div>
					)}

					{pathErrors.length > 0 && (
						<span className="text-xs text-red-400 ml-2 flex items-center gap-1">
							<AlertCircle className="w-3 h-3" />
							{pathErrors.length} error{pathErrors.length > 1 ? "s" : ""}
						</span>
					)}
					{!hasContent && pathErrors.length === 0 && (
						<span className="text-xs text-slate-500 ml-auto">empty</span>
					)}
				</button>
				{labelAction && <span className="ml-2">{labelAction}</span>}
			</div>
			{isExpanded && (
				<div className="p-4 space-y-4 bg-slate-900/10">
					{definedProps.map(([key, propSchema]) => {
						const isPresent = Object.prototype.hasOwnProperty.call(obj, key);
						const canRemoveDefined = isPresent && canRemoveKey(key);

						return (
							<DynamicField
								key={key}
								schema={propSchema as JSONSchema}
								value={obj[key]}
								onChange={(v) => handleChange(key, v)}
								label={key}
								path={`${path}.${key}`}
								models={models}
								modelVariants={modelVariants}
								depth={depth + 1}
								validationErrors={validationErrors}
								entityModel={obj.model as string}
								labelAction={
									canRemoveDefined ? (
										<button
											type="button"
											onClick={() => handleRemoveDefinedKey(key)}
											className="text-slate-500 hover:text-red-400 transition-colors"
											title="Remove"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									) : undefined
								}
							/>
						);
					})}
					{dynamicKeys.map((key) => {
						const valueSchema = additionalSchema ?? inferSchema(obj[key]);
						return (
							<div key={key} className="relative">
								<DynamicField
									schema={valueSchema}
									value={obj[key]}
									onChange={(v) => handleChange(key, v)}
									label={key}
									path={`${path}.${key}`}
									models={models}
									modelVariants={modelVariants}
									depth={depth + 1}
									validationErrors={validationErrors}
									entityModel={obj.model as string}
									labelAction={
										<button
											type="button"
											onClick={() => handleRemoveDynamicKey(key)}
											disabled={!canRemoveKey(key)}
											className="text-slate-500 hover:text-red-400 transition-colors"
											title="Remove"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									}
								/>
							</div>
						);
					})}
					{canAddEntity && (
						<div className="pt-2">
							{showAddModal ? (
								<div className="flex gap-2">
									<input
										type="text"
										value={newKeyName}
										onChange={(e) => setNewKeyName(e.target.value)}
										placeholder="Enter key name..."
										className="flex-1 bg-[#161B26] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
										ref={(input) => {
											if (input && showAddModal) {
												input.focus();
											}
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleAddEntity();
											if (e.key === "Escape") {
												setShowAddModal(false);
												setNewKeyName("");
											}
										}}
									/>
									<button
										type="button"
										onClick={handleAddEntity}
										disabled={!newKeyName.trim()}
										className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Add
									</button>
									<button
										type="button"
										onClick={() => {
											setShowAddModal(false);
											setNewKeyName("");
										}}
										className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-600 transition-colors"
									>
										Cancel
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setShowAddModal(true)}
									className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded hover:bg-blue-500/10 transition-colors"
								>
									<Plus className="w-3.5 h-3.5" />
									Add Entity
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function DynamicField({
	schema,
	value,
	onChange,
	label,
	path,
	models,
	modelVariants,
	depth = 0,
	labelAction,
	entityModel,
	validationErrors = [],
}: FieldProps) {
	if (!schema) return null;

	const fieldLabel = schema.title ?? label ?? path.split(".").pop() ?? "";
	const fieldErrors = getValidationErrorsForPath(validationErrors, path);
	const renderWithErrors = (field: React.ReactNode) => (
		<div className="space-y-1.5">
			{field}
			<FieldErrors errors={fieldErrors} />
		</div>
	);

	if (schema.type === "boolean") {
		return renderWithErrors(
			<DynamicToggleField
				label={fieldLabel}
				value={value as boolean | undefined}
				onChange={(v) => onChange(v)}
			/>,
		);
	}

	// Handle variant field BEFORE enum check - schema may not have enum
	if (path.endsWith(".variant") && models) {
		// entityModel may be in "provider/model#variant" format, extract model name
		const modelName = (
			entityModel?.includes("/")
				? entityModel.split("/").slice(-1)[0]
				: entityModel
		)?.split("#")?.[0];
		const modelData = models.find(
			(m) => m.name.split("/").slice(-1)[0] === modelName,
		);
		// variants is a comma-separated string
		const variantOptions = modelData?.variants
			? modelData.variants
					.split(",")
					.map((v) => v.trim())
					.filter(Boolean)
			: [];
		const hasVariants = variantOptions.length > 0;

		return renderWithErrors(
			<div className="space-y-1.5">
				<FieldLabel label={fieldLabel} action={labelAction} />
				<div className="flex gap-2">
					<DynamicSelectField
						value={value as string | undefined}
						onChange={(v) => onChange(v || undefined)}
						options={hasVariants ? variantOptions : []}
						placeholder={
							hasVariants
								? "Select variant"
								: entityModel
									? "No variants available"
									: "Select model first"
						}
						disabled={!hasVariants}
					/>
					<button
						type="button"
						onClick={() => onChange(undefined)}
						className="px-2 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title="Clear variant"
						disabled={!hasVariants}
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>,
		);
	}

	if (schema.enum && Array.isArray(schema.enum)) {
		return renderWithErrors(
			<DynamicSelectField
				label={fieldLabel}
				value={value as string | undefined}
				onChange={(v) => onChange(v || undefined)}
				options={schema.enum.map(String)}
				placeholder={schema.description}
			/>,
		);
	}

	if (schema.type === "string") {
		if (path.endsWith(".model") && models) {
			return renderWithErrors(
				<div className="space-y-1.5">
					<FieldLabel label={fieldLabel} action={labelAction} />
					<div className="flex gap-2">
						<ModelPicker
							value={typeof value === "string" ? value : null}
							models={models}
							onChange={(val) => onChange(val ?? undefined)}
							placeholder={schema.description ?? "Select model"}
							allowAuto={false}
							showVariantSelector={false}
						/>
						<button
							type="button"
							onClick={() => onChange(undefined)}
							className="px-2 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
							title="Clear model"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>,
			);
		}

		if (schema.format === "multiline" || path.includes("prompt")) {
			return renderWithErrors(
				<div className="space-y-1.5">
					<FieldLabel label={fieldLabel} action={labelAction} />
					<textarea
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value || undefined)}
						placeholder={schema.description}
						rows={4}
						className="w-full bg-[#161B26] border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 resize-none hover:border-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all custom-scrollbar"
					/>
				</div>,
			);
		}

		if (schema.format === "color" || path.endsWith(".color")) {
			return renderWithErrors(
				<div className="space-y-1.5">
					<FieldLabel label={fieldLabel} action={labelAction} />
					<div className="flex gap-3">
						<div className="relative">
							<input
								type="color"
								value={(value as string) ?? "#000000"}
								onChange={(e) => onChange(e.target.value)}
								className="w-11 h-11 rounded-xl border border-slate-700 bg-[#161B26] cursor-pointer p-1"
							/>
						</div>
						<input
							type="text"
							value={(value as string) ?? ""}
							onChange={(e) => onChange(e.target.value || undefined)}
							placeholder={schema.description ?? "#RRGGBB"}
							className="flex-1 bg-[#161B26] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all placeholder:text-slate-500"
						/>
					</div>
				</div>,
			);
		}

		return renderWithErrors(
			<DynamicInputField
				label={fieldLabel}
				value={value as string | undefined}
				onChange={(v) => onChange(v || undefined)}
				placeholder={schema.description}
				labelAction={labelAction}
			/>,
		);
	}

	if (schema.type === "number" || schema.type === "integer") {
		return renderWithErrors(
			<DynamicInputField
				label={fieldLabel}
				type="number"
				value={value as number | undefined}
				onChange={(v) => {
					const parsed = Number.parseFloat(v);
					onChange(Number.isNaN(parsed) ? undefined : parsed);
				}}
				placeholder={
					schema.description ??
					(schema.minimum !== undefined && schema.maximum !== undefined
						? `${schema.minimum} - ${schema.maximum}`
						: undefined)
				}
				labelAction={labelAction}
			/>,
		);
	}

	if (schema.type === "array") {
		return renderWithErrors(
			<DynamicArrayField
				label={fieldLabel}
				value={value as string[] | undefined}
				onChange={(v) => onChange(v.length > 0 ? v : undefined)}
				items={schema.items as JSONSchema | undefined}
				labelAction={labelAction}
			/>,
		);
	}

	if (schema.type === "object") {
		return (
			<DynamicObjectField
				schema={schema}
				value={value}
				onChange={onChange}
				path={path}
				models={models}
				modelVariants={modelVariants}
				depth={depth + 1}
				label={label}
				labelAction={labelAction}
				validationErrors={validationErrors}
			/>
		);
	}

	if (schema.oneOf || schema.anyOf) {
		const variants = (schema.oneOf || schema.anyOf) as JSONSchema[];

		const getCurrentVariantIndex = (): number => {
			if (value === null || value === undefined) return 0;
			for (let i = 0; i < variants.length; i++) {
				const v = variants[i];
				if (v.type === "array" && Array.isArray(value)) return i;
				if (
					v.type === "object" &&
					typeof value === "object" &&
					!Array.isArray(value)
				)
					return i;
				if (v.type === "string" && typeof value === "string") return i;
				if (v.type === "number" && typeof value === "number") return i;
				if (v.type === "boolean" && typeof value === "boolean") return i;
			}
			return 0;
		};

		const currentVariantIndex = getCurrentVariantIndex();
		const currentVariant = variants[currentVariantIndex];

		// Get label for variant
		const getVariantLabel = (v: JSONSchema, index: number): string => {
			if (v.title) return v.title;
			if (v.type === "array" && v.items) {
				const items = v.items as JSONSchema;
				return `Array<${items.type || "items"}>`;
			}
			const typeStr = Array.isArray(v.type) ? v.type[0] : v.type;
			return typeStr || `Variant ${index + 1}`;
		};

		return (
			<div className="space-y-2">
				{fieldLabel && <FieldLabel label={fieldLabel} action={labelAction} />}
				<StyledSelect
					value={String(currentVariantIndex)}
					onChange={(newValue) => {
						const newIndex = parseInt(newValue);
						const newVariant = variants[newIndex];
						// Initialize with default value for new type
						if (newVariant.type === "array") onChange([]);
						else if (newVariant.type === "object") onChange({});
						else if (newVariant.type === "string") onChange("");
						else if (newVariant.type === "number") onChange(0);
						else if (newVariant.type === "boolean") onChange(false);
						else onChange(null);
					}}
					options={variants.map((v, i) => ({
						value: String(i),
						label: getVariantLabel(v, i),
					}))}
					className="mb-4"
					allowEmpty={false}
				/>
				<DynamicField
					schema={currentVariant}
					value={value}
					onChange={onChange}
					path={path}
					models={models}
					modelVariants={modelVariants}
					depth={depth}
					validationErrors={validationErrors}
				/>
				<FieldErrors errors={fieldErrors} />
			</div>
		);
	}

	return null;
}

interface DynamicFormFieldsProps {
	schema: JSONSchema | null;
	data: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
	models?: OpencodeModel[];
	modelVariants?: string[];
	excludeFields?: Set<string>;
	validationErrors?: ValidationError[];
}

function CollapsibleSection({
	title,
	defaultExpanded = false,
	children,
	className,
}: {
	title: string;
	defaultExpanded?: boolean;
	children: React.ReactNode;
	className?: string;
}) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	return (
		<div
			className={cn(
				"relative border border-slate-800/60 rounded-xl bg-slate-900/10",
				className,
			)}
		>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full flex items-center gap-2 px-6 py-4 bg-slate-800/20 hover:bg-slate-800/40 transition-colors border-b border-transparent hover:border-slate-800/50"
			>
				{isExpanded ? (
					<ChevronDown className="w-4 h-4 text-slate-400" />
				) : (
					<ChevronRight className="w-4 h-4 text-slate-400" />
				)}
				<span className="text-sm font-bold text-slate-300">{title}</span>
			</button>
			{isExpanded && <div className="p-6 space-y-4">{children}</div>}
		</div>
	);
}

export function DynamicFormFields({
	schema,
	data,
	onChange,
	models,
	modelVariants,
	excludeFields = new Set(),
	validationErrors = [],
}: DynamicFormFieldsProps) {
	const effectiveSchema = schema?.properties
		? mergeSchemaWithData(schema, data)
		: inferSchema(data);

	if (!effectiveSchema.properties) {
		return (
			<div className="text-sm text-slate-500 italic p-4">
				No configuration fields available
			</div>
		);
	}

	// Separate simple fields from object/array fields (sections)
	const entries = Object.entries(effectiveSchema.properties).filter(
		([key]) => !excludeFields.has(key),
	);

	const simpleFields = entries.filter(([, propSchema]) => {
		const ps = propSchema as JSONSchema;
		return ps.type !== "object" && ps.type !== "array";
	});

	const sectionFields = entries.filter(([, propSchema]) => {
		const ps = propSchema as JSONSchema;
		return ps.type === "object" || ps.type === "array";
	});

	const topLevelValidationErrors = validationErrors.filter(
		(error) => !schemaHasPath(effectiveSchema, getValidationTargetPath(error)),
	);

	return (
		<div className="space-y-4">
			{topLevelValidationErrors.length > 0 && (
				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
								Schema validation warnings
							</h4>
							<ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
								{topLevelValidationErrors.map((error, index) => (
									<li
										key={`${error.path}-${index}`}
										className="flex items-start gap-2"
									>
										<span className="font-mono text-xs bg-amber-100 dark:bg-amber-800 px-1.5 py-0.5 rounded">
											{error.path || "root"}
										</span>
										<span>{error.message}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Simple fields section */}
			{simpleFields.length > 0 && (
				<CollapsibleSection title="General Settings">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{simpleFields
							.sort(([, a], [, b]) => {
								const order = ["string", "number", "integer", "boolean"];
								const getTypeStr = (
									t: string | string[] | undefined,
								): string => (Array.isArray(t) ? t[0] : (t ?? "string"));
								const aIdx = order.indexOf(getTypeStr((a as JSONSchema).type));
								const bIdx = order.indexOf(getTypeStr((b as JSONSchema).type));
								return aIdx - bIdx;
							})
							.map(([key, propSchema]) => {
								const ps = propSchema as JSONSchema;
								return (
									<DynamicField
										key={key}
										schema={ps}
										value={data[key]}
										onChange={(v) => onChange(key, v)}
										label={ps.title ?? key}
										path={key}
										models={models}
										modelVariants={modelVariants}
										validationErrors={validationErrors}
									/>
								);
							})}
					</div>
				</CollapsibleSection>
			)}

			{sectionFields.map(([key, propSchema]) => {
				const ps = propSchema as JSONSchema;
				const sectionTitle = ps.title ?? key;
				const canRemoveSection = canRemoveObjectProperty(
					effectiveSchema,
					data,
					key,
				);

				return (
					<DynamicField
						key={key}
						schema={ps}
						value={data[key]}
						onChange={(v) => onChange(key, v)}
						label={sectionTitle}
						path={key}
						models={models}
						modelVariants={modelVariants}
						depth={1}
						validationErrors={validationErrors}
						labelAction={
							canRemoveSection ? (
								<button
									type="button"
									onClick={() => onChange(key, undefined)}
									className="text-slate-500 hover:text-red-400 transition-colors"
									title="Remove section"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							) : undefined
						}
					/>
				);
			})}
		</div>
	);
}
