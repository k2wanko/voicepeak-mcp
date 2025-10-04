// OS-specific configurations and utilities
import * as os from "node:os";
import * as path from "node:path";
import { ErrorCode, VoicepeakError } from "./errors.js";

type Platform = "darwin" | "win32" | "linux";

interface PlatformConfig {
	voicepeakPath: string;
	playCommand: string;
	playArgs: (filePath: string) => string[];
	dictionaryPath: string;
}

// Runtime configuration overrides
let customVoicepeakPath: string | undefined;
let customPlayCommand: string | undefined;

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
	darwin: {
		voicepeakPath: "/Applications/voicepeak.app/Contents/MacOS/voicepeak",
		playCommand: "afplay",
		playArgs: (filePath) => [filePath],
		dictionaryPath: path.join(
			os.homedir(),
			"Library/Application Support/Dreamtonics/Voicepeak/settings/dic.json",
		),
	},
	win32: {
		voicepeakPath: "C:\\Program Files\\VOICEPEAK\\voicepeak.exe",
		playCommand: "powershell",
		playArgs: (filePath) => [
			"-Command",
			`(New-Object Media.SoundPlayer '${filePath}').PlaySync()`,
		],
		dictionaryPath: path.join(
			os.homedir(),
			"AppData/Roaming/Dreamtonics/Voicepeak/settings/dic.json",
		),
	},
	linux: {
		voicepeakPath: "/usr/local/bin/voicepeak",
		playCommand: "aplay",
		playArgs: (filePath) => [filePath],
		dictionaryPath: path.join(
			os.homedir(),
			".config/Dreamtonics/Voicepeak/settings/dic.json",
		),
	},
};

function getPlatform(): Platform {
	const platform = process.platform;
	if (platform === "darwin" || platform === "win32" || platform === "linux") {
		return platform;
	}
	throw new VoicepeakError(
		`Unsupported platform: ${platform}`,
		ErrorCode.UNKNOWN_ERROR,
	);
}

export function getPlatformConfig(): PlatformConfig {
	const platform = getPlatform();
	return PLATFORM_CONFIGS[platform] as PlatformConfig;
}

export function setVoicepeakPath(path: string): void {
	customVoicepeakPath = path;
}

export function setPlayCommand(command: string): void {
	customPlayCommand = command;
}

export function getVoicepeakPath(): string {
	// Priority: custom path > environment variable > platform default
	return (
		customVoicepeakPath ||
		process.env.VOICEPEAK_PATH ||
		getPlatformConfig().voicepeakPath
	);
}

export function getPlayCommand(): string {
	// Priority: custom command > environment variable > platform default
	return (
		customPlayCommand ||
		process.env.VOICEPEAK_PLAY_COMMAND ||
		getPlatformConfig().playCommand
	);
}

export function getPlayArgs(filePath: string): string[] {
	return getPlatformConfig().playArgs(filePath);
}

export function getDictionaryPath(): string {
	return getPlatformConfig().dictionaryPath;
}

// Check if the current platform is supported
export function isPlatformSupported(): boolean {
	try {
		getPlatform();
		return true;
	} catch {
		return false;
	}
}
