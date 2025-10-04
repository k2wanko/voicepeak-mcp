import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { ErrorCode, VoicepeakError } from "./errors.js";
import { CONFIG } from "./types.js";

export class TempFileManager {
	private tempFiles = new Set<string>();
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor() {
		// Register cleanup handlers
		process.on("SIGINT", () => this.cleanupAll());
		process.on("SIGTERM", () => this.cleanupAll());
		process.on("exit", () => this.cleanupAll());

		// Periodic cleanup every 5 minutes
		this.cleanupTimer = setInterval(
			() => {
				this.cleanupStale();
			},
			5 * 60 * 1000,
		);
	}

	async create(prefix: string = CONFIG.TEMP_FILE.PREFIX): Promise<string> {
		const tempDir = tmpdir();
		const fileName = `${prefix}-${Date.now()}-${randomUUID()}${CONFIG.TEMP_FILE.EXTENSION}`;
		const tempPath = path.join(tempDir, fileName);

		this.tempFiles.add(tempPath);
		return tempPath;
	}

	async cleanup(filePath: string): Promise<void> {
		if (!this.tempFiles.has(filePath)) {
			return; // Not our file, don't touch it
		}

		try {
			await fs.unlink(filePath);
			this.tempFiles.delete(filePath);
		} catch (error) {
			// Only log if file exists but couldn't be deleted
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				console.error(`Failed to delete temp file ${filePath}:`, error);
			}
			// Remove from tracking regardless
			this.tempFiles.delete(filePath);
		}
	}

	async cleanupAll(): Promise<void> {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}

		const cleanupPromises = Array.from(this.tempFiles).map(
			(file) => this.cleanup(file).catch(() => {}), // Ignore individual failures
		);

		await Promise.allSettled(cleanupPromises);
		this.tempFiles.clear();
	}

	/**
	 * Clean up files older than 1 hour
	 */
	private async cleanupStale(): Promise<void> {
		const staleAge = 60 * 60 * 1000; // 1 hour
		const now = Date.now();

		for (const filePath of this.tempFiles) {
			try {
				const stats = await fs.stat(filePath);
				if (now - stats.mtimeMs > staleAge) {
					await this.cleanup(filePath);
				}
			} catch {
				// File doesn't exist or can't be accessed, remove from tracking
				this.tempFiles.delete(filePath);
			}
		}
	}

	/**
	 * Ensures temp file was created and exists
	 */
	async ensureExists(filePath: string): Promise<void> {
		try {
			const stats = await fs.stat(filePath);
			if (!stats.isFile()) {
				throw new VoicepeakError(
					"Temporary file creation failed",
					ErrorCode.TEMP_FILE_ERROR,
				);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new VoicepeakError(
					"Temporary file was not created",
					ErrorCode.TEMP_FILE_ERROR,
				);
			}
			throw error;
		}
	}

	get fileCount(): number {
		return this.tempFiles.size;
	}
}

// Singleton instance
export const tempFileManager = new TempFileManager();
