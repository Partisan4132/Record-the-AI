# Record-able — Knowledge Base

## What it is
Record-able is a Fabric mod for Minecraft: Java Edition that adds OBS-style screen
recording directly into the game. No external recording software needed. It captures
video and audio from the game session itself, using on-demand FFmpeg downloads instead
of bundling binaries into the mod.

- Downloads: ~6.5K
- Tags: Cursed, Management, Utility
- License: MIT
- Source: https://github.com/JoEusebe/record-able
- Report issues: https://github.com/JoEusebe/record-able/issues
- Mod's Discord: https://discord.com/invite/record-able

## Compatibility & requirements
- Loader: Fabric only
- Client-side only (not needed on servers)
- Minecraft versions: 1.20.x, 1.21.x, 26.1.x, 26.2
- Java requirement depends on the MC version build variant:
  - "Legacy" (MC 1.20–1.20.4): Java 17
  - "Sandwich" (MC 1.20.5–1.21.11): Java 21
  - "Modern" (MC 26.1–26.1.2+): Java 25
- FFmpeg is required but not bundled — the mod prompts to download it on first launch
  from trusted mirrors (gyan.dev, johnvansickle.com, evermeet.cx), verified via
  SHA-256/MD5 checksums. This is a one-time setup.

## Core recording features
- Hardware-accelerated encoding: NVENC, AMF, QuickSync
- Software encoding with an automatic "ultrafast" preset to avoid queue slowdowns
- A Performance Preset slider to trade off speed vs. quality
- Output containers: MP4, MKV, MOV, WebM
- Configurable video quality/bitrate
- Audio capture from the game with microsecond-precision A/V sync (uses OpenAL loopback)
- Microphone capture with Push-to-Talk (PTT) and a draggable on-screen mic indicator
- Noise suppression on mic input (FFmpeg's afftdn adaptive denoiser)
- Separate audio tracks for game audio vs. mic, plus audio chapter markers
- Optional Simple Voice Chat integration — captures proximity voice chat into recordings
- Max file size limit with auto-stop
- Configurable on-screen recording overlay (5 screen positions, 50–200% scale)
- Built-in watermark editor
- In-game video collection browser with a built-in video player
- Crash recovery — an unfinished recording from a crash is detected on next launch and
  can be remuxed into a clean, playable file
- Mod compatibility checker — warns at startup if a known conflicting mod is present

## Auto-Clip system
Automatically saves short clips when something notable happens:
- Player death (captures the final moments and cause of death)
- Dimension change (portals, End entry, etc.)
- Achievements/advancements unlocked
- Kills — melee, projectiles (arrows, tridents), and a damage-scan fallback that also
  catches modded/specialized weapons
- Kill Montages — a rolling buffer stitches a pre-roll + kill moment + post-roll into
  one clip automatically

Clips live in a dedicated "Clips" collection with subfolders, a draggable scrollbar,
and a Protect/Unlock toggle to prevent a clip from being deleted or overwritten.

## Deferred Capture
Records at a low frame rate (5–30 FPS) during gameplay to avoid performance impact,
then renders the final video offline afterward at a chosen output FPS (30/60/120),
optionally with motion-compensated interpolation to smooth it out. Sessions that
aren't rendered right away go into a "Pending Renders" queue for later batch processing.

## Replay Buffer
Continuously keeps the last 30–120 seconds of gameplay in a disk-backed buffer (not
memory), so it can be saved retroactively on demand without risking an out-of-memory
crash on long or high-resolution sessions.

## Controls (all keybinds are configurable)
- Start/stop recording
- Push-to-Talk (mic capture)
- Save replay buffer
- Add bookmark
- Open recording settings
- Open pending renders
- Toggle censor overlay
- Cancel recording
- Rename recording
- Settings, video collection, and clips are all reachable from the mod menu. The
  overlay shows live recording status and duration.

## Compatibility with other recording mods
Record-able includes a compatibility bridge for Replay Mod and Flashback:
- Auto-recording is suppressed during replay playback
- A `replayYieldAudioDevice` config flag manages OpenAL loopback device conflicts so
  mods can share the audio pipeline
- A startup compatibility checker warns if Flashback, ReplayMod, or BetterShields are
  detected
- Running multiple recording mods simultaneously can still cause visual/audio quirks —
  results vary.

## Technical notes (for advanced users)
- Audio capture uses OpenAL loopback with microsecond-precision timestamps to prevent
  A/V drift.
- Video encoding runs asynchronously to avoid frame drops.
- Mic input is captured on its own track with independent gain control.
- Custom FFmpeg parameters are supported for full manual control.
- Video uploads use SNI pinning with a trusted-chain fallback for reliable TLS,
  including through HTTPS-inspecting proxies and on mobile JVMs.
- High quality/FPS/resolution and long recording times use significant memory, CPU,
  and disk space.

## Recent changes (V1-0.10)
- Crash recovery for unfinished recordings after a crash
- Deferred Capture mode with optional interpolation
- Pending Renders queue for batch rendering
- In-game video player
- Mod compatibility checker (Flashback, ReplayMod, BetterShields)
- Projectile kills (arrows, tridents) now correctly trigger auto-clips/kill montages
- Replay buffer is now disk-backed (fixes out-of-memory crashes on long sessions)
- New hotkeys: "Open Recording Settings" and "Open Pending Renders"
- Fixed a hard crash on MC 1.21.11 from a double `applyBlur()` call
- Fixed mic start-sync jitter (previously 524–923ms variance)
- Fixed duplicate kill-clip triggers on projectile hits
- Fixed non-monotonic DTS warnings from some DirectShow mic drivers causing desync

## Support links
- Report a bug / request a feature: https://github.com/JoEusebe/record-able/issues
- Source code: https://github.com/JoEusebe/record-able
- Mod's Discord server: https://discord.com/invite/record-able
