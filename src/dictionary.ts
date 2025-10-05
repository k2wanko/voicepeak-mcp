// Dictionary management for VOICEPEAK pronunciation customization
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	type BinaryDicEntry,
	parseBinaryDic,
	writeBinaryDic,
} from "./dic-binary.js";
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
	private isBinaryFormat: boolean;

	constructor() {
		this.dictionaryPath = getDictionaryPath();
		// Windows uses binary .dic format, macOS/Linux use JSON format
		this.isBinaryFormat = this.dictionaryPath.endsWith(".dic");
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
				if (this.isBinaryFormat) {
					// Windows: Read binary .dic format
					return this.readBinaryDictionary();
				}
				// macOS/Linux: Read JSON format
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
	 * Read binary dictionary (Windows)
	 */
	private readBinaryDictionary(): DictionaryEntry[] {
		const binaryEntries = parseBinaryDic(this.dictionaryPath);

		// Convert BinaryDicEntry to DictionaryEntry
		// Note: Binary format doesn't store surface form, only reading
		return binaryEntries.map((entry) => ({
			sur: entry.reading, // Use reading as surface form (limitation)
			pron: entry.reading,
			pos: "Japanese_Futsuu_meishi",
			priority: entry.priority,
			accentType: 0,
			lang: "ja",
		}));
	}

	/**
	 * Write dictionary entries
	 */
	async writeDictionary(entries: DictionaryEntry[]): Promise<void> {
		try {
			// Ensure dictionary directory exists
			const dir = path.dirname(this.dictionaryPath);
			await fs.mkdir(dir, { recursive: true });

			if (this.isBinaryFormat) {
				// Windows: Write binary .dic format
				this.writeBinaryDictionary(entries);
				return;
			}

			// macOS/Linux: Write JSON format
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
	 * Write binary dictionary (Windows)
	 */
	private writeBinaryDictionary(entries: DictionaryEntry[]): void {
		// Convert DictionaryEntry to BinaryDicEntry
		const binaryEntries: BinaryDicEntry[] = entries.map((entry) => ({
			leftId: 9683, // Default values from CSV analysis
			rightId: 13557,
			cost: -5000,
			pos: "名詞",
			posDetail: "普通名詞",
			reading: entry.pron,
			accent: this.generateAccent(entry.pron),
			priority: entry.priority ?? 5,
		}));

		writeBinaryDic(this.dictionaryPath, binaryEntries);
	}

	/**
	 * Generate accent pattern from reading
	 * Simplified version - returns flat accent pattern
	 */
	private generateAccent(reading: string): string {
		// Count mora (approximate by counting characters)
		const moraCount = reading.length;
		// Generate simple LH pattern (Low-High at position 0)
		return `${"H".repeat(moraCount)}@0`;
	}

	/**
	 * Add a new entry to the dictionary
	 */
	async addEntry(entry: DictionaryEntry): Promise<void> {
		const entries = await this.readDictionary();

		// For binary format, compare by pronunciation (since surface form = pronunciation)
		// For JSON format, compare by surface form
		const compareKey = this.isBinaryFormat ? "pron" : "sur";
		const searchValue = this.isBinaryFormat ? entry.pron : entry.sur;

		// Check if entry already exists
		const existingIndex = entries.findIndex(
			(e) =>
				e[compareKey] === searchValue &&
				e.lang === (entry.lang || DEFAULT_ENTRY.lang),
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
	 * @param surface - Surface form (or pronunciation for binary format)
	 * @param lang - Language code
	 */
	async removeEntry(surface: string, lang = "ja"): Promise<boolean> {
		const entries = await this.readDictionary();

		// For binary format, match by pronunciation
		// For JSON format, match by surface form
		const compareKey = this.isBinaryFormat ? "pron" : "sur";

		const filteredEntries = entries.filter(
			(e) => !(e[compareKey] === surface && e.lang === lang),
		);

		if (filteredEntries.length === entries.length) {
			return false; // No entry was removed
		}

		await this.writeDictionary(filteredEntries);
		return true;
	}

	/**
	 * Find entries by surface form (or pronunciation for binary format)
	 */
	async findEntry(surface: string): Promise<DictionaryEntry[]> {
		const entries = await this.readDictionary();

		// For binary format, search by pronunciation
		// For JSON format, search by surface form
		const compareKey = this.isBinaryFormat ? "pron" : "sur";

		return entries.filter((e) => e[compareKey] === surface);
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
