# Creating Avatars for byteside

This guide covers everything you need to know to create a custom avatar for byteside.

## Quick Start

1. Create a directory for your avatar
2. Add a `manifest.json` file
3. Add WebM video files for each state
4. Validate with `byteside validate ./your-avatar`
5. Install to `~/.byteside/avatars/`

## Avatar Directory Structure

```
my-avatar/
├── manifest.json    # Required: avatar metadata and state mappings
├── idle.webm        # Video files for each state
├── thinking.webm
├── writing.webm
├── bash.webm
├── error.webm
├── success.webm
├── waiting.webm
└── preview.png      # Optional: static preview image
```

## Manifest Schema

The `manifest.json` file defines your avatar's metadata and maps states to video files.

### Minimal Example

```json
{
  "name": "my-avatar",
  "author": "Your Name",
  "version": "1.0.0",
  "format": "webm",
  "states": {
    "idle": { "file": "idle.webm" },
    "thinking": { "file": "thinking.webm" },
    "writing": { "file": "writing.webm" },
    "bash": { "file": "bash.webm" },
    "error": { "file": "error.webm" },
    "success": { "file": "success.webm" },
    "waiting": { "file": "waiting.webm" }
  }
}
```

### Full Example with All Options

```json
{
  "name": "my-avatar",
  "author": "Your Name",
  "version": "1.0.0",
  "format": "webm",
  "resolution": "512x512",
  "framerate": 24,
  "loop": true,
  "states": {
    "idle": { "file": "idle.webm" },
    "thinking": { "file": "thinking.webm" },
    "writing": { "file": "writing.webm" },
    "bash": { "file": "bash.webm" },
    "error": { "file": "error.webm", "duration": 2000, "transition_to": "idle" },
    "success": { "file": "success.webm", "duration": 2000, "transition_to": "idle" },
    "waiting": { "file": "waiting.webm" }
  },
  "palette": {
    "primary": "#6366f1",
    "secondary": "#8b5cf6",
    "success": "#22c55e",
    "error": "#ef4444",
    "background": "#0a0a0a"
  }
}
```

### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique identifier (kebab-case, e.g., `my-avatar`) |
| `author` | Yes | string | Creator name |
| `version` | Yes | string | Version (semver recommended, e.g., `1.0.0`) |
| `format` | Yes | string | Video format (`webm` recommended) |
| `resolution` | No | string | Video dimensions (e.g., `512x512`) |
| `framerate` | No | number | Frames per second (e.g., `24`) |
| `loop` | No | boolean | Whether videos loop by default |
| `states` | Yes | object | Map of state names to state configs |
| `palette` | No | object | UI color scheme (CSS color values) |

### State Configuration

Each state in the `states` object supports:

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `file` | Yes | string | Path to video file relative to manifest |
| `duration` | No | number | Duration in milliseconds before auto-transition |
| `transition_to` | No | string | State to transition to after duration |

## Required States

byteside expects these 7 states. Your avatar should include all of them.

| State | Trigger | Tips |
|-------|---------|------|
| `idle` | Default / no activity | Relaxed, subtle animation. Should loop seamlessly. |
| `thinking` | User submits a prompt | Contemplative look - slight head tilt, eyes shifting |
| `writing` | Edit/Write tool calls | Active, focused - like watching code being typed |
| `bash` | Bash tool calls | Alert, attentive - monitoring terminal output |
| `error` | Errors or failures | Concerned expression. Often has `transition_to: "idle"` |
| `success` | Task completion | Celebratory or satisfied. Often has `transition_to: "idle"` |
| `waiting` | Waiting for user input | Patient, expectant - direct eye contact |

## Video Specifications

### Recommended Settings

| Property | Value | Notes |
|----------|-------|-------|
| Format | WebM | Best web compatibility |
| Codec | VP9 | Good quality/size ratio |
| Resolution | 512x512 | Balance of quality and file size |
| Framerate | 24 fps | Cinematic, smooth |
| File size | <500KB each | For fast loading |
| Audio | None | Silent files only |

### FFmpeg Conversion

Convert videos to the recommended format:

```bash
# Standard quality
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -an output.webm

# Smaller file size
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 40 -b:v 0 -an output.webm

# Scale to 512x512
ffmpeg -i input.mp4 -vf "scale=512:512" -c:v libvpx-vp9 -crf 30 -b:v 0 -an output.webm
```

### Creating Seamless Loops

For states like `idle` that loop continuously:

```bash
# Ping-pong (play forward then reverse)
ffmpeg -i input.mp4 -filter_complex "[0]reverse[r];[0][r]concat=n=2:v=1" -c:v libvpx-vp9 -crf 30 -b:v 0 -an loop.webm
```

## Validating Your Avatar

Before installing, validate your avatar to catch any issues:

```bash
byteside validate ./path/to/my-avatar
```

This checks:
- `manifest.json` exists and is valid JSON
- All required fields are present
- All referenced video files exist
- State names and `transition_to` references are valid

### Example Output

```
✓ Validation passed

  Name:     my-avatar
  Author:   Your Name
  Version:  1.0.0
  Format:   webm
  States:   idle, thinking, writing, bash, error, success, waiting
```

## Installing Your Avatar

Copy your avatar directory to the byteside avatars folder:

```bash
# Create avatars directory if it doesn't exist
mkdir -p ~/.byteside/avatars

# Copy your avatar
cp -r ./my-avatar ~/.byteside/avatars/
```

Then use it:

```bash
# Start server with your avatar
byteside --avatar my-avatar

# Or set it as default in config
echo '{"avatar": "my-avatar"}' > ~/.byteside/config.json
```

## Testing Your Avatar

1. Start the server with your avatar: `byteside --avatar my-avatar`
2. Open the viewer in your browser (auto-opens by default)
3. Test each state manually:
   ```bash
   byteside trigger idle
   byteside trigger thinking
   byteside trigger writing
   byteside trigger bash
   byteside trigger error
   byteside trigger success
   byteside trigger waiting
   ```
4. Verify smooth transitions and looping

## Terminal Avatars

byteside also supports terminal-based avatars using ASCII art or inline images. This is a lightweight alternative to the browser viewer.

To add terminal support to your avatar, see the [Terminal Avatar Guide](TERMINAL_AVATAR.md) which covers:

- Adding terminal configuration to your manifest
- Creating ASCII art frames
- Animation tips and frame management
- Converting video to ASCII art
- Image mode for supported terminals

## Creating Assets from Scratch

Want to create your own animated character using AI tools? See the comprehensive [Kling Motion Control Guide](KLING-MOTION-CTRL.md) which covers:

- Character design with Midjourney/FLUX
- Recording motion reference videos
- Motion transfer with Kling AI
- Post-processing and loop creation
- Complete workflow examples

## Troubleshooting

### "Missing recommended state" warnings
Your avatar works but is missing one of the 7 expected states. The viewer will fall back to `idle` for missing states.

### "State references undefined state"
A `transition_to` value points to a state that doesn't exist. Check spelling and ensure all referenced states are defined.

### "manifest.json not found"
The validation path should point to the directory containing `manifest.json`, not to the file itself.

### Videos not playing smoothly
- Reduce resolution (try 512x512)
- Increase compression (higher CRF value)
- Ensure videos have no audio track
- Check that videos are properly encoded as VP9
