import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { REQUIRED_STATES } from "./types";

/**
 * State configuration for a single avatar state.
 */
export interface AvatarStateConfig {
	file: string;
	duration?: number;
	transition_to?: string;
}

/**
 * UI color palette for avatar theming.
 */
export interface AvatarPalette {
	primary?: string;
	secondary?: string;
	success?: string;
	error?: string;
	background?: string;
}

/**
 * Terminal state configuration for a single avatar state.
 */
export interface TerminalStateConfig {
	frames?: string[]; // Array of ASCII frame file paths (for mode: "ascii")
	image?: string; // Single image path (for mode: "image")
}

/**
 * Terminal rendering configuration.
 */
export interface TerminalConfig {
	enabled: boolean;
	mode: "ascii" | "image";
	framerate?: number; // Default: 8fps
	size?: { width: number; height: number };
	states: Record<string, TerminalStateConfig>;
}

/**
 * Full avatar manifest schema.
 */
export interface AvatarManifest {
	name: string;
	author: string;
	version: string;
	format: string;
	resolution?: string;
	framerate?: number;
	loop?: boolean;
	states: Record<string, AvatarStateConfig>;
	palette?: AvatarPalette;
	terminal?: TerminalConfig;
}

/**
 * Result of manifest validation.
 */
export interface ManifestValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	manifest?: AvatarManifest;
}

const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStateConfig(
	stateName: string,
	config: unknown,
	definedStates: Set<string>,
	errors: string[],
): boolean {
	if (!isObject(config)) {
		errors.push(`State "${stateName}" must be an object`);
		return false;
	}

	if (typeof config.file !== "string" || config.file.length === 0) {
		errors.push(`State "${stateName}" must have a "file" property (string)`);
		return false;
	}

	if (config.duration !== undefined && typeof config.duration !== "number") {
		errors.push(`State "${stateName}.duration" must be a number`);
		return false;
	}

	if (config.transition_to !== undefined) {
		if (typeof config.transition_to !== "string") {
			errors.push(`State "${stateName}.transition_to" must be a string`);
			return false;
		}
		if (!definedStates.has(config.transition_to)) {
			errors.push(
				`State "${stateName}.transition_to" references undefined state "${config.transition_to}"`,
			);
			return false;
		}
	}

	return true;
}

/**
 * Validate a parsed manifest object.
 */
export function validateManifest(manifest: unknown): ManifestValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!isObject(manifest)) {
		return { valid: false, errors: ["Manifest must be an object"], warnings };
	}

	// Required fields
	if (typeof manifest.name !== "string" || manifest.name.length === 0) {
		errors.push('Missing or invalid required field: "name" (string)');
	} else if (!KEBAB_CASE_REGEX.test(manifest.name)) {
		errors.push(`"name" must be kebab-case (e.g., "my-avatar")`);
	}

	if (typeof manifest.author !== "string" || manifest.author.length === 0) {
		errors.push('Missing or invalid required field: "author" (string)');
	}

	if (typeof manifest.version !== "string" || manifest.version.length === 0) {
		errors.push('Missing or invalid required field: "version" (string)');
	} else if (!SEMVER_REGEX.test(manifest.version)) {
		warnings.push(
			`"version" should follow semver format (e.g., "1.0.0"), got "${manifest.version}"`,
		);
	}

	if (typeof manifest.format !== "string" || manifest.format.length === 0) {
		errors.push('Missing or invalid required field: "format" (string)');
	}

	// Optional fields type checking
	if (manifest.resolution !== undefined && typeof manifest.resolution !== "string") {
		errors.push('"resolution" must be a string');
	}

	if (manifest.framerate !== undefined && typeof manifest.framerate !== "number") {
		errors.push('"framerate" must be a number');
	}

	if (manifest.loop !== undefined && typeof manifest.loop !== "boolean") {
		errors.push('"loop" must be a boolean');
	}

	// States validation
	if (!isObject(manifest.states)) {
		errors.push('Missing or invalid required field: "states" (object)');
	} else {
		const stateKeys = Object.keys(manifest.states);
		if (stateKeys.length === 0) {
			errors.push('"states" must contain at least one state');
		} else {
			const definedStates = new Set(stateKeys);

			// Validate each state config
			for (const stateName of stateKeys) {
				validateStateConfig(stateName, manifest.states[stateName], definedStates, errors);
			}

			// Warn about missing required states
			for (const requiredState of REQUIRED_STATES) {
				if (!definedStates.has(requiredState)) {
					warnings.push(`Missing recommended state: "${requiredState}"`);
				}
			}
		}
	}

	// Palette validation
	if (manifest.palette !== undefined) {
		if (!isObject(manifest.palette)) {
			errors.push('"palette" must be an object');
		} else {
			const paletteFields = ["primary", "secondary", "success", "error", "background"];
			for (const field of paletteFields) {
				const value = manifest.palette[field];
				if (value !== undefined && typeof value !== "string") {
					errors.push(`"palette.${field}" must be a string`);
				}
			}
		}
	}

	// Terminal configuration validation
	if (manifest.terminal !== undefined) {
		if (!isObject(manifest.terminal)) {
			errors.push('"terminal" must be an object');
		} else {
			const terminal = manifest.terminal;

			if (typeof terminal.enabled !== "boolean") {
				errors.push('"terminal.enabled" must be a boolean');
			}

			if (terminal.mode !== "ascii" && terminal.mode !== "image") {
				errors.push('"terminal.mode" must be "ascii" or "image"');
			}

			if (terminal.framerate !== undefined && typeof terminal.framerate !== "number") {
				errors.push('"terminal.framerate" must be a number');
			}

			if (terminal.size !== undefined) {
				if (!isObject(terminal.size)) {
					errors.push('"terminal.size" must be an object');
				} else {
					if (typeof terminal.size.width !== "number") {
						errors.push('"terminal.size.width" must be a number');
					}
					if (typeof terminal.size.height !== "number") {
						errors.push('"terminal.size.height" must be a number');
					}
				}
			}

			if (!isObject(terminal.states)) {
				errors.push('"terminal.states" must be an object');
			} else {
				for (const [stateName, stateConfig] of Object.entries(terminal.states)) {
					if (!isObject(stateConfig)) {
						errors.push(`"terminal.states.${stateName}" must be an object`);
						continue;
					}

					const config = stateConfig as Record<string, unknown>;
					const hasFrames = config.frames !== undefined;
					const hasImage = config.image !== undefined;

					if (!hasFrames && !hasImage) {
						errors.push(
							`"terminal.states.${stateName}" must have "frames" (for ascii) or "image" (for image mode)`,
						);
					}

					if (hasFrames && !Array.isArray(config.frames)) {
						errors.push(`"terminal.states.${stateName}.frames" must be an array`);
					} else if (hasFrames) {
						const frames = config.frames as unknown[];
						for (let i = 0; i < frames.length; i++) {
							if (typeof frames[i] !== "string") {
								errors.push(`"terminal.states.${stateName}.frames[${i}]" must be a string`);
							}
						}
					}

					if (hasImage && typeof config.image !== "string") {
						errors.push(`"terminal.states.${stateName}.image" must be a string`);
					}
				}
			}
		}
	}

	if (errors.length > 0) {
		return { valid: false, errors, warnings };
	}

	return {
		valid: true,
		errors,
		warnings,
		manifest: manifest as AvatarManifest,
	};
}

/**
 * Parse and validate a JSON manifest.
 */
export function parseManifest(json: unknown): ManifestValidationResult {
	// If it's a string, try to parse it as JSON
	if (typeof json === "string") {
		try {
			json = JSON.parse(json);
		} catch {
			return {
				valid: false,
				errors: ["Invalid JSON: failed to parse"],
				warnings: [],
			};
		}
	}

	return validateManifest(json);
}

/**
 * Get state configuration with fallback to idle.
 */
export function getStateConfig(manifest: AvatarManifest, state: string): AvatarStateConfig | null {
	// Try exact state match
	if (manifest.states[state]) {
		return manifest.states[state];
	}

	// Fall back to idle
	if (manifest.states.idle) {
		return manifest.states.idle;
	}

	// No fallback available
	return null;
}

/**
 * Result of full avatar validation including file checks.
 */
export interface AvatarValidationResult extends ManifestValidationResult {
	missingFiles: string[];
}

/**
 * Validate that all files referenced in a manifest exist on disk.
 *
 * @param manifest The parsed avatar manifest
 * @param avatarDir The directory containing the avatar files
 * @returns Validation result with missing files
 */
export function validateAvatarFiles(
	manifest: AvatarManifest,
	avatarDir: string,
): AvatarValidationResult {
	const missingFiles: string[] = [];

	for (const [stateName, stateConfig] of Object.entries(manifest.states)) {
		const filePath = join(avatarDir, stateConfig.file);
		if (!existsSync(filePath)) {
			missingFiles.push(`State "${stateName}": missing file "${stateConfig.file}"`);
		}
	}

	return {
		valid: missingFiles.length === 0,
		errors: missingFiles.length > 0 ? missingFiles : [],
		warnings: [],
		manifest,
		missingFiles,
	};
}

/**
 * Fully validate an avatar directory.
 * Checks manifest exists, parses and validates it, then checks all referenced files exist.
 *
 * @param avatarDir The directory containing the avatar
 * @returns Full validation result
 */
export async function validateAvatar(avatarDir: string): Promise<AvatarValidationResult> {
	const manifestPath = join(avatarDir, "manifest.json");

	// Check manifest exists
	if (!existsSync(manifestPath)) {
		return {
			valid: false,
			errors: ["manifest.json not found"],
			warnings: [],
			missingFiles: [],
		};
	}

	// Read and parse manifest
	let manifestContent: string;
	try {
		manifestContent = await readFile(manifestPath, "utf-8");
	} catch (err) {
		return {
			valid: false,
			errors: [`Failed to read manifest.json: ${err instanceof Error ? err.message : String(err)}`],
			warnings: [],
			missingFiles: [],
		};
	}

	// Parse and validate manifest schema
	const result = parseManifest(manifestContent);
	if (!result.valid || !result.manifest) {
		return {
			valid: false,
			errors: result.errors,
			warnings: result.warnings,
			missingFiles: [],
		};
	}

	// Validate files exist
	const fileResult = validateAvatarFiles(result.manifest, avatarDir);

	// Combine schema warnings with file errors
	return {
		valid: fileResult.valid,
		errors: fileResult.errors,
		warnings: result.warnings,
		manifest: result.manifest,
		missingFiles: fileResult.missingFiles,
	};
}
