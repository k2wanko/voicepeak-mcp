import { readFileSync, writeFileSync } from "node:fs";

/**
 * Binary dictionary entry structure
 */
export interface BinaryDicEntry {
	leftId: number; // uint16
	rightId: number; // uint16
	cost: number; // int16 (signed)
	pos: string; // Part of speech
	posDetail: string; // Part of speech detail
	reading: string; // Reading in kana
	accent: string; // Accent pattern
	priority: number; // Priority
}

/**
 * Binary dictionary header structure
 */
interface DicHeader {
	magic: Buffer; // 8 bytes
	version: number; // uint32
	entryCount: number; // uint32
	charset: string; // "utf-8"
}

const _HEADER_SIZE = 0x30;
const ENTRY_METADATA_OFFSET = 0xc30;
const ENTRY_METADATA_SIZE = 32; // 32 bytes per entry
const STRING_DATA_OFFSET = 0xc50;

/**
 * Parse VOICEPEAK binary dictionary file
 */
export function parseBinaryDic(filePath: string): BinaryDicEntry[] {
	const data = readFileSync(filePath);

	// Parse header
	const header = parseHeader(data);

	// Parse entries
	const entries: BinaryDicEntry[] = [];

	// Read string data
	let stringOffset = STRING_DATA_OFFSET;
	for (let i = 0; i < header.entryCount; i++) {
		// Find null terminator
		const nullPos = data.indexOf(0, stringOffset);
		if (nullPos === -1) {
			throw new Error(`Entry ${i}: null terminator not found`);
		}

		const entryStr = data.subarray(stringOffset, nullPos).toString("utf-8");
		stringOffset = nullPos + 1;

		// Parse entry metadata (at ENTRY_METADATA_OFFSET + i * ENTRY_METADATA_SIZE)
		const metadataOffset = ENTRY_METADATA_OFFSET + i * ENTRY_METADATA_SIZE;
		const leftId = data.readUInt16LE(metadataOffset);
		const rightId = data.readUInt16LE(metadataOffset + 2);
		const _unknown = data.readUInt16LE(metadataOffset + 4);
		const cost = data.readInt16LE(metadataOffset + 6);
		const _dataSize = data.readUInt32LE(metadataOffset + 8);

		// Parse entry string: "品詞,詳細品詞,読み,アクセント,*,*,優先度"
		const parts = entryStr.split(",");
		if (parts.length < 7) {
			throw new Error(`Entry ${i}: invalid format: ${entryStr}`);
		}

		entries.push({
			leftId,
			rightId,
			cost,
			pos: parts[0] ?? "",
			posDetail: parts[1] ?? "",
			reading: parts[2] ?? "",
			accent: parts[3] ?? "",
			priority: Number.parseInt(parts[6] ?? "5", 10),
		});
	}

	return entries;
}

/**
 * Write VOICEPEAK binary dictionary file
 */
export function writeBinaryDic(
	filePath: string,
	entries: BinaryDicEntry[],
): void {
	// Build string data section
	const stringBuffers: Buffer[] = [];
	let totalStringSize = 0;

	for (const entry of entries) {
		const entryStr = formatEntryString(entry);
		const entryBuf = Buffer.from(`${entryStr}\0`, "utf-8");
		stringBuffers.push(entryBuf);
		totalStringSize += entryBuf.length;
	}

	// Calculate file size
	// Header (0x00-0x2f) + padding to 0xc30 + metadata + padding to 0xc50 + strings
	const _metadataSize = entries.length * ENTRY_METADATA_SIZE;
	const fileSize = STRING_DATA_OFFSET + totalStringSize;

	// Create buffer
	const buffer = Buffer.alloc(fileSize);
	buffer.fill(0);

	// Write header
	writeHeader(buffer, entries.length);

	// Write entry metadata
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const stringBuf = stringBuffers[i];
		if (!entry || !stringBuf) continue;

		const offset = ENTRY_METADATA_OFFSET + i * ENTRY_METADATA_SIZE;
		const stringSize = stringBuf.length - 1; // excluding null terminator

		buffer.writeUInt16LE(entry.leftId, offset);
		buffer.writeUInt16LE(entry.rightId, offset + 2);
		buffer.writeUInt16LE(1, offset + 4); // unknown field, always 1
		buffer.writeInt16LE(entry.cost, offset + 6);
		buffer.writeUInt32LE(stringSize, offset + 8);

		// Write duplicate metadata at offset+16 (pattern observed in original file)
		buffer.writeUInt16LE(entry.leftId, offset + 16);
		buffer.writeUInt16LE(entry.rightId, offset + 18);
		buffer.writeUInt16LE(1, offset + 20);
		buffer.writeInt16LE(entry.cost, offset + 22);
		buffer.writeUInt32LE(0, offset + 24);
	}

	// Write string data
	let stringOffset = STRING_DATA_OFFSET;
	for (const stringBuf of stringBuffers) {
		stringBuf.copy(buffer, stringOffset);
		stringOffset += stringBuf.length;
	}

	// Write to file
	writeFileSync(filePath, buffer);
}

/**
 * Parse dictionary header
 */
function parseHeader(data: Buffer): DicHeader {
	const magic = data.subarray(0, 8);
	const version = data.readUInt32LE(0x08);
	const entryCount = data.readUInt32LE(0x0c);
	const charset = data.subarray(0x28, 0x28 + 5).toString("ascii");

	return {
		magic,
		version,
		entryCount,
		charset,
	};
}

/**
 * Write dictionary header
 */
function writeHeader(buffer: Buffer, entryCount: number): void {
	// Magic number (observed from original file)
	const magic = Buffer.from([0xc0, 0x83, 0x71, 0xef, 0x66, 0x00, 0x00, 0x00]);
	magic.copy(buffer, 0);

	// Version
	buffer.writeUInt32LE(1, 0x08);

	// Entry count
	buffer.writeUInt32LE(entryCount, 0x0c);

	// Other header fields (observed values from original file)
	buffer.writeUInt32LE(15626, 0x10); // 0x3d0a
	buffer.writeUInt32LE(15388, 0x14); // 0x3c1c
	buffer.writeUInt32LE(3048, 0x18); // 0x0be8
	buffer.writeUInt32LE(32, 0x1c);
	buffer.writeUInt32LE(103, 0x20);
	buffer.writeUInt32LE(0, 0x24);

	// Charset
	buffer.write("utf-8", 0x28, "ascii");

	// More metadata sections (simplified, may need adjustment)
	buffer.writeUInt32LE(2, 0x270);
	buffer.writeUInt32LE(1, 0x274);

	buffer.writeInt32LE(-258, 0x2a0);
	buffer.writeUInt32LE(75, 0x2a4);
	buffer.writeUInt32LE(75, 0x2a8);
	buffer.writeUInt32LE(2, 0x2ac);

	buffer.writeUInt32LE(4, 0x308);
	buffer.writeUInt32LE(1, 0x30c);
	buffer.writeUInt32LE(3, 0x310);
	buffer.writeUInt32LE(4, 0x314);

	// 0x400 section (Double Array data - simplified)
	const daData = [18, 20, 7, 18, 20, 3, 123, 7];
	for (let i = 0; i < daData.length; i++) {
		const value = daData[i];
		if (value !== undefined) {
			buffer.writeUInt32LE(value, 0x400 + i * 4);
		}
	}
	buffer.writeInt32LE(-258, 0x420);
	buffer.writeUInt32LE(123, 0x424);
}

/**
 * Format entry as string for binary storage
 */
function formatEntryString(entry: BinaryDicEntry): string {
	return `${entry.pos},${entry.posDetail},${entry.reading},${entry.accent},*,*,${entry.priority}`;
}

/**
 * Add entry to binary dictionary
 */
export function addEntryToBinaryDic(
	filePath: string,
	newEntry: BinaryDicEntry,
): void {
	const entries = parseBinaryDic(filePath);
	entries.push(newEntry);
	writeBinaryDic(filePath, entries);
}

/**
 * Remove entry from binary dictionary by reading
 */
export function removeEntryFromBinaryDic(
	filePath: string,
	reading: string,
): boolean {
	const entries = parseBinaryDic(filePath);
	const initialLength = entries.length;

	const filteredEntries = entries.filter((e) => e.reading !== reading);

	if (filteredEntries.length === initialLength) {
		return false; // No entry was removed
	}

	writeBinaryDic(filePath, filteredEntries);
	return true;
}

/**
 * List all entries in binary dictionary
 */
export function listBinaryDicEntries(filePath: string): BinaryDicEntry[] {
	return parseBinaryDic(filePath);
}
