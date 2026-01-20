# byteside: AI Avatar Asset Generation Guide
## Creating Animated Companion Avatars for AI Coding Agents

This guide covers the full workflow for generating animated character assets using AI tools—from initial character design to motion-transferred video states.

---

## Overview: The Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. CHARACTER   │ ──► │  2. RECORD      │ ──► │  3. MOTION      │
│     DESIGN      │     │     YOURSELF    │     │     TRANSFER    │
│  (Static Image) │     │  (Reference)    │     │  (Kling 2.6)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
   Midjourney/FLUX        Phone/Webcam           Your motion →
   creates character      capture motion          character video
```

**Why motion transfer instead of text-to-video prompting?**

- **Exact control** — you perform the motion you want, no guessing what AI will interpret
- **Consistent timing** — your pacing becomes the avatar's pacing
- **Subtle movements** — breathing, micro-expressions, eye movements transfer perfectly
- **Repeatable** — same reference video = same motion every time

---

## Phase 1: Character Design (Base Image)

### Recommended Tools

| Tool | Best For | Price |
|------|----------|-------|
| **Midjourney** | Artistic quality, stylized aesthetics | $10-30/mo |
| **FLUX** | Photorealism, precise control | $10-20/mo via various platforms |
| **Leonardo.ai** | Character consistency, free tier | Free (150/day) |

### Example Prompts

**Core prompt structure:**
```
[subject description], [style elements], [lighting], [camera/framing], [style modifiers]
```

**Cyberpunk style:**
```
Portrait of a cyberpunk netrunner, neural implants glowing blue along 
temple, short dark hair with neon streaks, leather jacket with circuit 
patterns, holographic HUD reflection in eyes, dramatic rim lighting, 
neon blue and pink accent lights, dark background with data streams, 
cinematic portrait, 8k, sharp focus --ar 1:1 --v 6.1
```

**Anime/stylized:**
```
Anime character portrait, young woman with silver hair and golden eyes,
gentle expression, soft lighting, studio ghibli inspired, detailed face,
simple dark background, illustration style --ar 1:1 --v 6.1
```

**Minimal/geometric:**
```
Minimalist character portrait, person with simple features, 
flat color style, soft gradients, muted color palette, 
clean lines, design illustration, centered composition --ar 1:1 --v 6.1
```

### Critical: Preparing Your Character Image for Motion Transfer

Your character image needs to work well with motion control. Follow these rules:

**DO:**
- **Match framing to your reference videos** — if you'll record bust/portrait shots, generate bust/portrait character images
- **Keep limbs visible** — if the motion involves hands/arms, they need to be in frame
- **Leave breathing room** — space around the character for movement
- **Use neutral pose** — arms at sides or visible, not crossed or hidden
- **Clean/simple background** — dark gradient or solid works best

**DON'T:**
- Hands in pockets (AI will hallucinate hands during gestures → glitches)
- Cropped at awkward points (mid-forearm, etc.)
- Complex busy backgrounds
- Extreme angles or perspective

**Recommended framing for avatar use:**
```
┌─────────────────────────┐
│                         │
│      ┌─────────┐        │
│      │  HEAD   │        │  ← Head with space above
│      │  NECK   │        │
│      │ SHOULDERS        │  ← Shoulders visible
│      │  CHEST  │        │  ← Some chest/upper body
│      └─────────┘        │
│                         │  ← Space below for movement
└─────────────────────────┘
```

---

## Phase 2: Character Consistency (Reference Sheets)

Before moving to animation, generate expression variants of your character for consistency.

### Midjourney Character Reference (--cref)

Once you have a base character you love, use `--cref` to generate variants:

```
[Your new scene description] --cref [URL to your character image] --cw 100
```

**--cw (character weight) values:**
- `--cw 100` (default): Copies face, hair, AND clothing
- `--cw 0`: Face only (good for outfit changes)
- `--cw 50`: Face + general vibe, flexible on details

**Generate expression variants:**

```bash
# Base character (save this URL)
character portrait, your style description... --ar 1:1

# Thinking expression
Same character, thoughtful expression, eyes glancing to the side
--cref [URL] --cw 100 --ar 1:1

# Alert/active expression  
Same character, alert expression, eyes bright and focused
--cref [URL] --cw 100 --ar 1:1

# Concerned expression
Same character, slight frown, concerned look
--cref [URL] --cw 100 --ar 1:1

# Satisfied expression
Same character, subtle smirk, relaxed confident expression
--cref [URL] --cw 100 --ar 1:1
```

### Style Reference (--sref) for Visual Consistency

Lock in your visual style across all generations:

```
[prompt] --cref [character URL] --sref [style URL] --sw 100
```

This ensures every image has the same color grading, lighting style, and aesthetic feel.

---

## Phase 3: Recording Reference Videos

This is where you become the motion capture actor for your avatar.

### Equipment Needed

**Minimum:**
- Phone with front camera
- Decent lighting (window light or desk lamp)
- Plain background (wall, solid color)

**Better:**
- Webcam or phone on tripod
- Ring light or two-point lighting
- Green screen or very clean background

### Recording Setup

**Framing must match your character image:**

```
Character Image          Your Recording
┌─────────────┐          ┌─────────────┐
│   [HEAD]    │    →     │   [HEAD]    │
│   [NECK]    │    →     │   [NECK]    │
│ [SHOULDERS] │    →     │ [SHOULDERS] │
│   [CHEST]   │    →     │   [CHEST]   │
└─────────────┘          └─────────────┘
     1:1                      1:1
```

**If they don't match:**
- Full-body motion + portrait image = broken/incomplete motion
- Portrait motion + full-body image = works but wastes the body

### Recording Tips

1. **Good lighting on your face** — helps AI track facial movements
2. **High contrast with background** — cleaner motion extraction
3. **Moderate movement speed** — avoid jerky or too-fast motions
4. **Stay in frame** — don't let hands/head exit the recording area
5. **Record longer than needed** — you can trim, can't extend

### Reference Videos for Each Avatar State

Record these clips (suggested duration):

```yaml
idle:
  duration: 8-10 seconds
  action: |
    Sit still, breathe naturally, occasional slow blink.
    Very minimal movement. Maybe tiny head micro-movements.
    This will loop, so start and end in similar position.

thinking:
  duration: 5-6 seconds  
  action: |
    Slight head tilt to one side. Eyes shift—look up-left, 
    then center, then up-right. Thoughtful expression.
    Maybe slight narrowing of eyes like concentrating.

writing:
  duration: 5-6 seconds
  action: |
    Eyes focused slightly downward (as if watching code).
    Small rhythmic movements like you're mentally tracking
    lines of text. Engaged, concentrated expression.

bash:
  duration: 5-6 seconds
  action: |
    Alert posture. Eyes moving as if scanning multiple 
    terminal outputs. Maybe a slight head turn like 
    checking different monitors. Attentive expression.

error:
  duration: 3-4 seconds
  action: |
    Subtle reaction—slight eyebrow raise, small grimace 
    or concerned look. Maybe tiny head shake. 
    Expression of "hmm, that's not right."

success:
  duration: 3-4 seconds
  action: |
    Subtle satisfaction—small nod, slight smirk or 
    relaxed smile. Shoulders drop slightly (relief).
    Expression of quiet accomplishment.

waiting:
  duration: 5-6 seconds
  action: |
    Direct eye contact with camera (the user). 
    Raised eyebrow—expectant, patient expression.
    "I'm ready when you are" energy.
```

### Creating Seamless Loops

For states that need to loop (especially `idle`), you have options:

**Option A: Record with loop in mind**
- Start and end in the exact same position
- Practice the motion a few times first
- Think of it as a cycle: position A → movement → back to position A

**Option B: Post-process into loop**
- Record normally
- Use ping-pong technique (play forward, then reverse)
- Crossfade the join point

**Option C: Let Kling handle it**
- Record slightly longer than needed
- Kling's motion extraction often creates natural-feeling loops
- Test and iterate

---

## Phase 4: Motion Transfer with Kling 2.6

### Accessing Kling Motion Control

Several platforms offer Kling Motion Control:

| Platform | URL | Notes |
|----------|-----|-------|
| **Kling AI (official)** | klingai.com | Native interface |
| **AtLabs** | atlabs.ai | Clean UI, good tutorials |
| **ImagineArt** | imagine.art | Alternative interface |
| **Kie.ai** | kie.ai | Has API access |
| **EaseMate** | easemate.ai | Free tier available |

### Step-by-Step Motion Transfer

**1. Go to Motion Control feature**
- Select "Motion Control" or "Image to Video with Motion Reference"

**2. Upload your character image**
- The avatar you generated in Phase 1
- Ensure it matches the framing of your reference video

**3. Upload your reference video**
- The clip you recorded of yourself
- 3-30 seconds supported
- Max 100MB file size

**4. Choose Character Orientation**

Two modes:

| Mode | Use When |
|------|----------|
| **Character Matches Video** | You want exact framing replication from your recording |
| **Character Matches Image** | You want to preserve your character image composition while applying motion |

For avatar states, **"Character Matches Image"** usually works best—it keeps your carefully composed character image intact.

**5. Add a style prompt (important!)**

You do NOT describe the motion—Kling extracts that from your video.

You DO describe the visual environment and style:

```
[Your aesthetic], ambient lighting, dark background, 
cinematic color grading, moody atmosphere
```

State-specific prompts (customize to your aesthetic):

```yaml
idle:
  prompt: "Soft ambient glow, relaxed lighting, subtle tones, 
           dark environment"

thinking:  
  prompt: "Concentrated atmosphere, subtle lighting shifts,
           engaged mood"

writing:
  prompt: "Focused lighting, active atmosphere, engaged mood"

bash:
  prompt: "Alert lighting, monitoring atmosphere, 
           attentive mood"

error:
  prompt: "Warning tint, alert lighting, tense atmosphere"

success:
  prompt: "Warm accent lighting, satisfied atmosphere, 
           accomplished mood"

waiting:
  prompt: "Direct focused lighting, patient atmosphere, 
           anticipation, ready state"
```

**6. Configure audio**
- **Audio Preserve: OFF** — you want silent output for avatar states
- (Turn ON if you want to keep audio from reference for other uses)

**7. Generate**
- Takes 2-6 minutes depending on length and server load
- Review the result
- Regenerate with adjusted prompt if needed

### Kling Model Tiers

| Model | Best For | Speed | Quality |
|-------|----------|-------|---------|
| **Standard** | Quick tests, simple motions, social content | Faster | Good |
| **Pro** | Final output, complex motion, hand details | Slower | Best |

For avatar states with subtle movements, Standard is often sufficient. Use Pro for the final versions you'll ship.

### Troubleshooting Motion Transfer

**Problem: Character identity drifts / face changes**
- Solution: Use higher quality character image (1024px+)
- Solution: Ensure character has clear, well-lit facial features
- Solution: Use Pro model instead of Standard

**Problem: Hands look glitchy (extra fingers, blurry)**
- Solution: Keep hands relatively still in reference video
- Solution: Ensure hands are clearly visible in character image
- Solution: Use Pro model (better fine-grained detail)

**Problem: Motion feels jerky or unnatural**
- Solution: Record reference video with smoother, slower movements
- Solution: Avoid rapid direction changes in your recording
- Solution: Better lighting when recording yourself

**Problem: Background looks wrong**
- Solution: Add more specific environment details in prompt
- Solution: Use character image with cleaner/simpler background
- Solution: Specify "dark background" or "black background" in prompt

**Problem: Motion doesn't match reference video**
- Solution: Ensure framing matches (portrait↔portrait, full↔full)
- Solution: Record with higher contrast against background
- Solution: Simplify the movements in your reference video

---

## Phase 5: Post-Processing

### Creating Seamless Loops

If Kling's output doesn't loop perfectly:

**Method 1: Ping-Pong (easiest)**
```bash
# Play forward then backward
ffmpeg -i input.mp4 -filter_complex "[0]reverse[r];[0][r]concat=n=2:v=1" pingpong.mp4
```

**Method 2: Crossfade endpoints**
```bash
# Crossfade first and last 12 frames (0.5 sec at 24fps)
ffmpeg -i input.mp4 -filter_complex \
  "[0]split[body][pre];[pre]trim=end_frame=12,setpts=PTS-STARTPTS[tail];\
   [body][tail]xfade=transition=fade:duration=0.5:offset=0[v]" \
  -map "[v]" crossfade.mp4
```

**Method 3: Manual trim to loop point**
- Open in video editor
- Find frames where start and end positions match
- Trim to those points
- Export

### Converting to WebM

WebM is ideal for web-based avatar display:

```bash
# High quality webm (recommended)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -an output.webm

# Smaller file size (slightly lower quality)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 40 -b:v 0 -an output.webm

# With transparency (if your source has alpha channel)
ffmpeg -i input.mov -c:v libvpx-vp9 -pix_fmt yuva420p -an output.webm
```

### Recommended Output Specs

```yaml
format: webm
codec: VP9
resolution: 512x512  # Good balance of quality and file size
framerate: 24fps     # Cinematic, smooth
audio: none          # Silent for avatar states
```

### File Size Reference

| Resolution | Duration | Approx Size |
|------------|----------|-------------|
| 512x512 | 5 sec | 2-4 MB |
| 512x512 | 10 sec | 4-8 MB |
| 1024x1024 | 5 sec | 8-15 MB |

---

## Phase 6: byteside Avatar Package Structure

### Manifest Spec

```yaml
# manifest.yaml
name: "my-avatar"
author: "your-name"
version: "1.0.0"
format: "webm"
resolution: "512x512"
framerate: 24
loop: true

states:
  idle:
    file: "idle.webm"
    duration: 8000      # ms
    
  thinking:
    file: "thinking.webm"
    duration: 5000
    
  writing:
    file: "writing.webm"
    duration: 5000
    
  bash:
    file: "bash.webm"
    duration: 5000
    
  error:
    file: "error.webm"
    duration: 3000
    transition_to: "idle"  # Return to idle after playing once
    
  success:
    file: "success.webm"
    duration: 3000
    transition_to: "idle"
    
  waiting:
    file: "waiting.webm"
    duration: 5000

# Optional: UI chrome colors to match avatar aesthetic
palette:
  primary: "#6366f1"
  secondary: "#ec4899"
  success: "#22c55e"
  error: "#ef4444"
  background: "#0a0a0a"
```

### Directory Structure

```
/my-avatar
  manifest.yaml
  idle.webm
  thinking.webm
  writing.webm
  bash.webm
  error.webm
  success.webm
  waiting.webm
  preview.png          # Static preview image
  README.md            # Credits, description
```

---

## Complete Workflow Example

### Creating the "thinking" state

**Step 1: Generate character (Midjourney)**
```
Character portrait, your style description, neutral expression, 
shoulders visible, space around head for movement, 
simple dark background, cinematic portrait --ar 1:1 --v 6.1
```

**Step 2: Record yourself**
- Frame: head + shoulders, matching character image
- Duration: 6 seconds
- Action: slight head tilt, eyes shift up-left then up-right, thoughtful expression
- Lighting: well-lit face, plain background

**Step 3: Motion transfer (Kling)**
- Upload character image
- Upload reference video
- Mode: Character Matches Image
- Prompt: "Thoughtful atmosphere, subtle lighting, [your aesthetic], cinematic"
- Audio: OFF
- Model: Pro
- Generate

**Step 4: Review and iterate**
- Check that face stayed consistent
- Check that motion transferred cleanly
- Regenerate with adjusted prompt if needed

**Step 5: Post-process**
```bash
# Check if it loops naturally
# If not, create ping-pong loop
ffmpeg -i kling_thinking.mp4 -filter_complex \
  "[0]reverse[r];[0][r]concat=n=2:v=1" thinking_loop.mp4

# Convert to webm
ffmpeg -i thinking_loop.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -an thinking.webm
```

**Step 6: Add to avatar package**
- Move `thinking.webm` to avatar directory
- Update manifest with duration

---

## Budget Breakdown

### Minimum Viable (free tiers + one paid tool)

| Tool | Cost | Use For |
|------|------|---------|
| Leonardo.ai | Free | Character iterations |
| Phone camera | Free | Recording reference videos |
| EaseMate/free tier | Free | Motion transfer tests |
| Kling AI | ~$10-20/mo | Final quality transfers |
| FFmpeg | Free | Post-processing |
| **Total** | **~$10-20/mo** | |

### Higher Quality Workflow

| Tool | Cost | Use For |
|------|------|---------|
| Midjourney | $30/mo | All character design |
| Ring light | $20 one-time | Better reference recordings |
| Kling AI Pro | $30/mo | All motion transfers |
| **Total** | **~$60/mo + $20 setup** | |

---

## Quick Reference Cards

### Character Image Checklist
```
□ Matches framing of reference videos (portrait/bust/full)
□ Limbs visible if motion involves them
□ Space around character for movement
□ Clean/simple background
□ High resolution (1024px+ recommended)
□ Neutral or appropriate expression for base
□ Good lighting on face
```

### Reference Video Checklist
```
□ Framing matches character image
□ Good lighting on face
□ High contrast with background
□ Moderate movement speed (not jerky)
□ Stay fully in frame throughout
□ 3-30 seconds duration
□ Start and end positions similar (for loops)
```

### Kling Motion Control Checklist
```
□ Character image uploaded
□ Reference video uploaded  
□ Orientation mode selected (usually "Matches Image")
□ Style prompt describes environment, NOT motion
□ Audio preserve OFF (for avatar states)
□ Correct model tier (Pro for final, Standard for tests)
```

### Post-Processing Checklist
```
□ Loop is seamless (or ping-ponged)
□ Converted to webm
□ File size reasonable (<10MB for 512px)
□ No audio track
□ Resolution matches spec (512x512 or 1024x1024)
```

---

## Resources

### AI Image Generation
- **Midjourney**: midjourney.com
- **FLUX**: replicate.com, fal.ai, flux-context.org
- **Leonardo.ai**: leonardo.ai

### Motion Transfer
- **Kling AI (official)**: klingai.com
- **AtLabs**: atlabs.ai
- **ImagineArt**: imagine.art
- **Kie.ai**: kie.ai (API access)
- **EaseMate**: easemate.ai

### Post-Processing
- **FFmpeg**: ffmpeg.org (free, command line)
- **DaVinci Resolve**: blackmagicdesign.com (free, GUI)

---

## Next Steps

1. **Generate your character** — spend time here, this is the foundation
2. **Set up recording space** — good lighting, clean background, tripod/stable mount
3. **Record all reference videos** — do a batch session, get all states
4. **Process one state end-to-end** — validate the full workflow with "idle"
5. **Batch process remaining states** — once workflow is proven
6. **Test with byteside viewer** — verify states display and transition correctly
7. **Package and publish** — share your avatar with the community
