# Creating Terminal Avatars for byteside

This guide covers creating avatars that render directly in your terminal using ASCII art or images, as an alternative to the browser-based viewer.

---

## Overview

Terminal avatars display animated characters using:
- **ASCII art frames** - Text-based art that animates by cycling through frames
- **Image mode** - Renders actual images in supported terminals (iTerm2, Kitty, WezTerm)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLI Process                                                        │
│  ┌─────────────────┐    ┌────────────────────────────────────────┐  │
│  │  byteside       │───>│  Terminal Renderer                     │  │
│  │  (server)       │    │  - Renders avatar in terminal region   │  │
│  └─────────────────┘    │  - Updates on state changes            │  │
│                         └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Why terminal mode?**
- **Lightweight** - No browser window needed
- **SSH-friendly** - Works over remote connections
- **Integrated** - Avatar appears alongside server output
- **Retro aesthetic** - ASCII art has a unique charm

---

## Quick Start

1. Add terminal configuration to your avatar's `manifest.json`
2. Create ASCII frame files in a `terminal/` subdirectory
3. Run `byteside` - terminal mode activates automatically when enabled

---

## Manifest Configuration

Add a `terminal` block to your `manifest.json`:

### Minimal ASCII Example

```json
{
  "name": "my-avatar",
  "author": "Your Name",
  "version": "1.0.0",
  "format": "webm",
  "states": {
    "idle": { "file": "idle.webm" },
    "thinking": { "file": "thinking.webm" }
  },
  "terminal": {
    "enabled": true,
    "mode": "ascii",
    "states": {
      "idle": { "frames": ["terminal/idle/01.txt", "terminal/idle/02.txt"] },
      "thinking": { "frames": ["terminal/thinking/01.txt"] }
    }
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
  "states": {
    "idle": { "file": "idle.webm" },
    "thinking": { "file": "thinking.webm" },
    "writing": { "file": "writing.webm" },
    "bash": { "file": "bash.webm" },
    "error": { "file": "error.webm" },
    "success": { "file": "success.webm" },
    "waiting": { "file": "waiting.webm" }
  },
  "terminal": {
    "enabled": true,
    "mode": "ascii",
    "framerate": 8,
    "size": { "width": 40, "height": 20 },
    "states": {
      "idle": {
        "frames": [
          "terminal/idle/01.txt",
          "terminal/idle/02.txt",
          "terminal/idle/03.txt",
          "terminal/idle/04.txt"
        ]
      },
      "thinking": { "frames": ["terminal/thinking/01.txt", "terminal/thinking/02.txt"] },
      "writing": { "frames": ["terminal/writing/01.txt", "terminal/writing/02.txt"] },
      "bash": { "frames": ["terminal/bash/01.txt"] },
      "error": { "frames": ["terminal/error/01.txt"] },
      "success": { "frames": ["terminal/success/01.txt"] },
      "waiting": { "frames": ["terminal/waiting/01.txt"] }
    }
  }
}
```

### Image Mode Example

For terminals that support inline images (iTerm2, Kitty, WezTerm):

```json
{
  "terminal": {
    "enabled": true,
    "mode": "image",
    "framerate": 4,
    "size": { "width": 40, "height": 20 },
    "states": {
      "idle": { "image": "terminal/idle.png" },
      "thinking": { "image": "terminal/thinking.png" },
      "writing": { "image": "terminal/writing.png" }
    }
  }
}
```

### Configuration Reference

| Field | Required | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `enabled` | Yes | boolean | - | Enable terminal mode |
| `mode` | Yes | string | - | `"ascii"` or `"image"` |
| `framerate` | No | number | `8` | Frames per second for animation |
| `size.width` | No | number | `40` | Width in characters |
| `size.height` | No | number | `20` | Height in lines |
| `states` | Yes | object | - | Map of state names to frame configs |

### State Configuration

For **ASCII mode** (`mode: "ascii"`):

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `frames` | Yes | string[] | Array of paths to ASCII frame files |

For **Image mode** (`mode: "image"`):

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `image` | Yes | string | Path to image file (PNG, JPG, GIF) |

---

## Directory Structure

```
my-avatar/
├── manifest.json
├── idle.webm              # Browser video files
├── thinking.webm
├── ...
└── terminal/              # Terminal assets
    ├── idle/
    │   ├── 01.txt         # ASCII frame 1
    │   ├── 02.txt         # ASCII frame 2
    │   ├── 03.txt         # ASCII frame 3
    │   └── 04.txt         # ASCII frame 4
    ├── thinking/
    │   ├── 01.txt
    │   └── 02.txt
    ├── writing/
    │   └── 01.txt
    ├── bash/
    │   └── 01.txt
    ├── error/
    │   └── 01.txt
    ├── success/
    │   └── 01.txt
    └── waiting/
        └── 01.txt
```

---

## Creating ASCII Art Frames

### Frame File Format

Each frame is a plain text file. The content is rendered exactly as-is:

**terminal/idle/01.txt:**
```
        .-"""-.
       /        \
      |  O    O  |
      |    __    |
      |   '--'   |
       \        /
        '------'
          |  |
         /|  |\
```

**terminal/idle/02.txt:**
```
        .-"""-.
       /        \
      |  O    O  |
      |    __    |
      |   '--'   |
       \        /
        '------'
          |  |
        / |  | \
```

### Animation Tips

1. **Keep frames the same size** - All frames in a state should have identical dimensions
2. **Subtle changes** - Small differences between frames create smooth animation
3. **Loop-friendly** - Design so the last frame transitions smoothly to the first

### Using ANSI Colors

You can include ANSI escape codes for colored ASCII art:

```
        .-"""-.
       /        \
      | [34m O    O [0m |
      |    [33m__[0m    |
      |   [32m'--'[0m   |
       \        /
        '------'
```

Common ANSI codes:
- `[30m` - `[37m`: Standard colors (black, red, green, yellow, blue, magenta, cyan, white)
- `[90m` - `[97m`: Bright colors
- `[1m`: Bold
- `[2m`: Dim
- `[0m`: Reset

### ASCII Art Resources

**Generators:**
- [ASCII Art Generator](https://www.ascii-art-generator.org/) - Convert images to ASCII
- [Text to ASCII](https://patorjk.com/software/taag/) - Text banners
- [Figlet](http://www.figlet.org/) - Command-line ASCII text

**Collections:**
- [ASCII Art Archive](https://www.asciiart.eu/) - Curated ASCII art
- [Christopher Johnson's ASCII Art](https://asciiart.website/) - Classic collection

**Tools:**
- `jp2a` - Convert JPEG to ASCII: `jp2a --width=40 image.jpg`
- `img2txt` (libcaca) - Image to colored ASCII
- `chafa` - Modern terminal graphics: `chafa -s 40x20 image.png`

---

## Creating Image Mode Assets

For terminals with image support, you can use actual images instead of ASCII.

### Supported Terminals

| Terminal | Protocol | Image Support |
|----------|----------|---------------|
| iTerm2 | iTerm | Full |
| Kitty | Kitty | Full |
| WezTerm | Kitty | Full |
| VS Code Terminal | Limited | Partial |
| Standard terminals | ANSI only | ASCII fallback |

### Image Specifications

| Property | Recommended | Notes |
|----------|-------------|-------|
| Format | PNG | Best quality, supports transparency |
| Size | 200x200 px | Will be scaled to terminal size |
| Aspect ratio | 1:1 | Square works best |
| Transparency | Optional | Looks great on dark terminals |

### Creating Images

You can use any image editor. For animated states, consider:

1. **Static images per state** - One image per state, simpler to manage
2. **GIF frames** - Extract GIF frames for animation

**Extract frames from GIF:**
```bash
# Extract all frames
ffmpeg -i animated.gif -vsync 0 frame_%02d.png

# Or use ImageMagick
convert animated.gif frame_%02d.png
```

---

## Behavior Modes

Terminal mode and browser mode are **mutually exclusive**:

| `terminal.enabled` | Behavior |
|--------------------|----------|
| `true` | Avatar renders in terminal, browser does NOT open |
| `false` or missing | Browser opens, shows WebM videos (default) |

### Disabling Terminal Mode

Even if an avatar has terminal support, you can force browser mode:

```bash
byteside --no-terminal
```

---

## Testing Your Terminal Avatar

### 1. Validate the manifest

```bash
byteside validate ./my-avatar
```

### 2. Start with terminal mode

```bash
# If terminal.enabled is true, it auto-activates
byteside --avatar my-avatar
```

### 3. Test state changes

```bash
# In another terminal
byteside trigger thinking
byteside trigger writing
byteside trigger success
byteside trigger idle
```

### 4. Watch the animation

The avatar should render below the server status messages and animate through its frames.

---

## Example: Simple Blinking Face

Here's a complete minimal example:

**manifest.json:**
```json
{
  "name": "blinky",
  "author": "byteside",
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
  },
  "terminal": {
    "enabled": true,
    "mode": "ascii",
    "framerate": 2,
    "size": { "width": 20, "height": 10 },
    "states": {
      "idle": {
        "frames": ["terminal/idle/open.txt", "terminal/idle/open.txt", "terminal/idle/open.txt", "terminal/idle/closed.txt"]
      },
      "thinking": { "frames": ["terminal/thinking.txt"] },
      "writing": { "frames": ["terminal/writing.txt"] },
      "bash": { "frames": ["terminal/bash.txt"] },
      "error": { "frames": ["terminal/error.txt"] },
      "success": { "frames": ["terminal/success.txt"] },
      "waiting": { "frames": ["terminal/waiting.txt"] }
    }
  }
}
```

**terminal/idle/open.txt:**
```
   .--------.
  /          \
 |   O    O   |
 |      >     |
 |    \__/    |
  \          /
   '--------'
```

**terminal/idle/closed.txt:**
```
   .--------.
  /          \
 |   -    -   |
 |      >     |
 |    \__/    |
  \          /
   '--------'
```

**terminal/thinking.txt:**
```
   .--------.
  /          \
 |   O    O   |  ?
 |      >     |
 |    ----    |
  \          /
   '--------'
```

**terminal/success.txt:**
```
   .--------.
  /          \
 |   ^    ^   |
 |      >     |
 |    \__/    |
  \          /
   '--------'
```

---

## Troubleshooting

### Avatar doesn't render in terminal

1. **Check `terminal.enabled` is `true`** in manifest
2. **Verify TTY** - Terminal mode requires an interactive terminal (not piped output)
3. **Check frame files exist** - Run `byteside validate` to verify paths

### Animation is choppy

- Lower the `framerate` (try `4` or `2`)
- Reduce frame complexity (simpler ASCII art)
- Ensure frames are the same size

### Colors not showing

- Your terminal may not support ANSI colors
- Check terminal emulator settings
- Try a simpler color scheme

### Image mode not working

- Verify your terminal supports inline images (iTerm2, Kitty, WezTerm)
- Check that image files exist at the specified paths
- Try ASCII mode as fallback

### Frame size mismatch

All frames should have the same dimensions. If frames have different sizes, the animation may look jumpy. Use a fixed-width font and pad lines to equal length:

```bash
# Pad all lines in a file to 40 characters
awk '{printf "%-40s\n", $0}' frame.txt > frame_padded.txt
```

---

## Advanced: Converting Video to ASCII

You can convert your existing WebM videos to ASCII art frames:

### Using jp2a

```bash
# Extract frames from video
ffmpeg -i idle.webm -r 8 frame_%03d.jpg

# Convert each frame to ASCII
for f in frame_*.jpg; do
  jp2a --width=40 --output="${f%.jpg}.txt" "$f"
done

# Clean up JPGs
rm frame_*.jpg
```

### Using chafa (colored)

```bash
# Extract frames
ffmpeg -i idle.webm -r 8 frame_%03d.png

# Convert with colors
for f in frame_*.png; do
  chafa -s 40x20 --format=symbols "$f" > "${f%.png}.txt"
done
```

### Using img2txt (libcaca)

```bash
# Extract frames
ffmpeg -i idle.webm -r 8 frame_%03d.png

# Convert to ASCII
for f in frame_*.png; do
  img2txt -W 40 -H 20 "$f" > "${f%.png}.txt"
done
```

---

## Next Steps

1. **Start simple** - Create a basic blinking face avatar
2. **Add states** - Design different expressions for each state
3. **Refine animation** - Adjust framerate and frame count for smooth motion
4. **Test thoroughly** - Try on different terminals
5. **Share** - Publish your terminal avatar for others to enjoy

For creating the browser-based video assets, see the [Avatar Creation Guide](AVATAR_CREATION.md) and [Kling Motion Control Guide](KLING-MOTION-CTRL.md).
