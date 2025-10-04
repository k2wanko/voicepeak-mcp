# voicepeak-mcp

MCP server for VOICEPEAK text-to-speech synthesis.

## Features

- Text-to-speech synthesis with VOICEPEAK
- Multiple narrator support
- Emotion parameter control
- Speech speed and pitch adjustment
- Direct audio playback

## Prerequisites

- VOICEPEAK installed on macOS
- Node.js 18+ or Bun runtime
- Valid VOICEPEAK license

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

## Supported Platforms

- ✅ macOS
- 🚧 Windows (planned)
- 🚧 Linux (planned)

## License

MIT

## Contributing

Issues and pull requests are welcome!
