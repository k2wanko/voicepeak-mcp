// Dictionary management for VOICEPEAK pronunciation customization
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ErrorCode, VoicepeakError } from "./errors.js";
import { getDictionaryPath } from "./os.js";

export interface DictionaryEntry {
	sur: string; // Surface form (the text to be replaced)
	pron: string; // Pronunciation (in Japanese kana)
	pos?: string; // Part of speech (default: "Japanese_Futsuu_meishi")
	priority?: number; // Priority (default: 5)
	accentType?: number; // Accent type (default: 0)
	lang?: string; // Language (default: "ja")
}

// Default values for dictionary entries
const DEFAULT_ENTRY: Partial<DictionaryEntry> = {
	pos: "Japanese_Futsuu_meishi",
	priority: 5,
	accentType: 0,
	lang: "ja",
};

export class DictionaryManager {
	private dictionaryPath: string;

	constructor() {
		this.dictionaryPath = getDictionaryPath();
	}

	/**
	 * Read the current dictionary entries
	 */
	async readDictionary(): Promise<DictionaryEntry[]> {
		try {
			// Ensure dictionary directory exists
			const dir = path.dirname(this.dictionaryPath);
			await fs.mkdir(dir, { recursive: true });

			// Check if dictionary file exists
			try {
				const content = await fs.readFile(this.dictionaryPath, "utf-8");
				return JSON.parse(content) as DictionaryEntry[];
			} catch (error) {
				// File doesn't exist, return empty array
				if ((error as NodeJS.ErrnoException).code === "ENOENT") {
					return [];
				}
				throw error;
			}
		} catch (error) {
			throw new VoicepeakError(
				`Failed to read dictionary: ${error}`,
				ErrorCode.FILE_NOT_FOUND,
			);
		}
	}

	/**
	 * Write dictionary entries
	 */
	async writeDictionary(entries: DictionaryEntry[]): Promise<void> {
		try {
			// Ensure dictionary directory exists
			const dir = path.dirname(this.dictionaryPath);
			await fs.mkdir(dir, { recursive: true });

			// Validate and normalize entries
			const normalizedEntries = entries.map((entry) => ({
				...DEFAULT_ENTRY,
				...entry,
			}));

			// Write with pretty formatting
			const content = JSON.stringify(normalizedEntries, null, 2);
			await fs.writeFile(this.dictionaryPath, content, "utf-8");
		} catch (error) {
			throw new VoicepeakError(
				`Failed to write dictionary: ${error}`,
				ErrorCode.FILE_WRITE_ERROR,
			);
		}
	}

	/**
	 * Add a new entry to the dictionary
	 */
	async addEntry(entry: DictionaryEntry): Promise<void> {
		const entries = await this.readDictionary();

		// Check if entry already exists
		const existingIndex = entries.findIndex(
			(e) =>
				e.sur === entry.sur && e.lang === (entry.lang || DEFAULT_ENTRY.lang),
		);

		if (existingIndex >= 0) {
			// Update existing entry
			entries[existingIndex] = {
				...DEFAULT_ENTRY,
				...entry,
			};
		} else {
			// Add new entry
			entries.push({
				...DEFAULT_ENTRY,
				...entry,
			});
		}

		await this.writeDictionary(entries);
	}

	/**
	 * Remove an entry from the dictionary
	 */
	async removeEntry(surface: string, lang = "ja"): Promise<boolean> {
		const entries = await this.readDictionary();
		const filteredEntries = entries.filter(
			(e) => !(e.sur === surface && e.lang === lang),
		);

		if (filteredEntries.length === entries.length) {
			return false; // No entry was removed
		}

		await this.writeDictionary(filteredEntries);
		return true;
	}

	/**
	 * Find entries by surface form
	 */
	async findEntry(surface: string): Promise<DictionaryEntry[]> {
		const entries = await this.readDictionary();
		return entries.filter((e) => e.sur === surface);
	}

	/**
	 * Clear all dictionary entries
	 */
	async clearDictionary(): Promise<void> {
		await this.writeDictionary([]);
	}

	/**
	 * Get the dictionary file path
	 */
	getPath(): string {
		return this.dictionaryPath;
	}
}

// Singleton instance
export const dictionaryManager = new DictionaryManager();
