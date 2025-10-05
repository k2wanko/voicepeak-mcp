# voicepeak-mcp

MCP server for VOICEPEAK text-to-speech synthesis.

## Prerequisites

- VOICEPEAK installed

## Installation

### Using NPX (Recommended)
```bash
npx voicepeak-mcp@latest
```

### Using Bunx
```bash
bunx voicepeak-mcp
```

## Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "voicepeak": {
      "command": "npx",
      "args": ["voicepeak-mcp@latest"]
    }
  }
}
```

## Available Tools

### synthesize
Generate speech audio file from text.

Parameters:
- `text` (required): Text to synthesize
- `narrator`: Narrator name
- `emotion`: Emotion parameters
- `speed`: Speech speed (50-200)
- `pitch`: Speech pitch (-300 to 300)
- `outputPath`: Output file path

### synthesize_and_play
Generate and immediately play speech.

### play
Play an audio file.

### list_narrators
List available narrators.

### list_emotions
List available emotions for a narrator.

### dictionary_list
List all pronunciation dictionary entries.

**Note**: Dictionary features are not available on Windows. Windows users should manage pronunciation dictionary through the VOICEPEAK application.

### dictionary_add
Add or update a dictionary entry for custom pronunciation.

Parameters:
- `surface` (required): Text to be replaced
- `pronunciation` (required): Japanese kana pronunciation
- `priority`: Priority (0-10, default: 5)

**Note**: Not available on Windows.

### dictionary_remove
Remove a dictionary entry.

**Note**: Not available on Windows.

### dictionary_find
Find dictionary entries by text.

**Note**: Not available on Windows.

### dictionary_clear
Clear all dictionary entries.

**Note**: Not available on Windows.

## Supported Platforms

- ✅ macOS (full support)
- ⚠️ Windows (partial support: speech synthesis and playback only, dictionary features not supported)
- 🚧 Linux (planned)

### Windows Limitations
On Windows, dictionary management features (dictionary_*) are not available. If you need custom pronunciation, please manage the dictionary through the VOICEPEAK application.

## Contributing

Issues and pull requests are welcome!
