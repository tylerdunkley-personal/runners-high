# Runner’s High — Rat Motel / Band Computer

A late-90s / early-2000s desktop playground for Jacksonville band Runners High. Plain HTML, CSS, and JavaScript. No dependencies, accounts, or build step.

## Deploy on Cloudflare Pages

Connect this repository in Workers & Pages → Create application → Pages → Import an existing Git repository.

- Production branch: `main`
- Framework preset: None
- Build command: leave empty
- Build output directory: `/` (repository root)

For Cloudflare Workers static assets instead, the included `wrangler.jsonc` points at this directory. There is no Worker script. Use `npx wrangler deploy` from the repository root, or Cloudflare's Git integration with deploy command `npx wrangler deploy` and no build command.

## Preview locally

Run `python3 -m http.server 8000` from this folder and open http://localhost:8000. No package installation needed.

## What's included

- Punk/DIY desktop: photocopy grain, cut-paper lettering, tape, a Rat Motel neon sign, draggable windows, start menu, and optional CRT overlay.
- rhTunes defaults to the official Bandcamp stream of Rat Motel. THE BAND / MY MIXTAPE switches between the embed and the portable player with local audio imports and clearly labeled original demo loops.
- RAT ARCADE is a five-fret rhythm game with A/S/D/J/K and multi-touch frets, audio-clock timing, a 36-second original guitar/drum practice riff, hit judgments, combo multipliers, score summary, pause/resume, and browser-local high scores. It does not use a commercial emulator, game assets, or Runner’s High audio.
- TIMING adjusts input judgment by -200 to +200 ms for headphone/device latency. A positive value treats input as later in the song. Turn it negative if your inputs feel consistently late.
- The three-page Xerox Files zine uses verified release information and recording credits with links back to primary sources.
- Responsive layouts, reduced-motion support, and keyboard-accessible controls.

## Band research / content sources

The band styles its name **Runner's High** and identifies Jacksonville, Florida as its home. These official sources informed the site:

- https://runnershigh.bandcamp.com/album/gone-fishin — released January 1, 2020; four tracks; recorded in Liam and Carson’s living room; produced/mixed by Taylor Paul Neal; mastered by Brok Mende; synth on Rat Motel by EJ Hervey.
- https://runnershigh.bandcamp.com/track/rat-motel — official track stream and release details.
- https://runnershigh.bandcamp.com/ — release catalog, including Update Me, Dress Code, GRASS-FED, and 2026 singles.
- https://runnershigh.bandcamp.com/track/im-at-the-park — released April 17, 2026.

Bandcamp supplies the official embedded playback and hosts its own cover artwork. Playback and artwork require a network connection and may be affected by a visitor’s content blocker; a direct Bandcamp link is included. No audio was scraped, downloaded, or rehosted. The artwork is the official cover, not a fabricated band image. The UI’s cut-paper wordmark is a design treatment, not an official logo.

## Music player: add more Runner’s High songs

The **RECORD CRATE** dropdown now includes Rat Motel and the full Gone Fishin’ EP, with all four songs selectable inside the official album player.

For another Bandcamp release, open its official page → Share / Embed → embed this album/track. Copy the iframe’s `src` into another entry in `content.json` → `bandcampReleases`, alongside its title, subtitle, public Bandcamp URL, and embed height. The app accepts HTTPS Bandcamp EmbeddedPlayer URLs. Entries with height greater than 42 pixels use the wider record-player layout. Retain the existing entries.

For direct MP3 playback with the portable player’s controls, add band-supplied audio to `media/` and list it in `content.json` → `tracks`:

```json
{
  "title": "Rat Motel",
  "subtitle": "Runner’s High • Gone Fishin’",
  "src": "media/rat-motel.mp3"
}
```

This is one entry in the `tracks` array, not the whole config file. These tracks appear in MY MIXTAPE. Local MP3 imports also work but disappear on reload and do not publish for other visitors.

## Play Rat Motel in the arcade

Get an MP3 or WAV from the band. In the arcade, choose **LOAD SONG** and select it. Audio is decoded on the visitor’s device and never uploaded. The game prepends a two-second count-in and creates an **AUTO CHART** from detected attacks. This is an approximate practice chart, not a transcription of the guitar part. For very dense audio it falls back to a half-second practice grid.

For a more faithful level, author a chart against the exact recording and choose **LOAD CHART** after loading the audio. The file `charts/example.json` demonstrates the format; it is not a Rat Motel chart. Notes use seconds from the start of the original audio file; do not add the count-in. Lanes are 0–4 (green/red/yellow/blue/orange, A/S/D/J/K). Simultaneous times make chords. `duration` creates a sustain:

```json
{
  "notes": [
    { "time": 1.0, "lane": 0 },
    { "time": 1.5, "lane": 1, "duration": 0.8 },
    { "time": 3.0, "lane": 0 },
    { "time": 3.0, "lane": 3 }
  ]
}
```

To publish a level for everyone, add the band-approved MP3 to `media/rat-motel.mp3`, its finished chart to `charts/rat-motel.json`, and add this entry to the `gameTracks` array in `content.json`:

```json
{
  "title": "Rat Motel",
  "audio": "media/rat-motel.mp3",
  "chart": "charts/rat-motel.json"
}
```

This adds Rat Motel to the arcade SONG selector. Omitting `chart` generates an approximate auto-chart. The actual recording and its authored chart are not bundled yet. Publishing audio requires the band’s permission. Bandcamp/Spotify page URLs are not audio files; the app cannot extract or synchronize their embedded audio.

## Arcade controls

- **TAP FRETS:** A/S/D/J/K or the five colored touch buttons. Keep a fret held for sustains.
- **FRETS + STRUM:** hold the matching keys, then press Space (or the STRUM button). Chords require all matching frets with no extras. Touch players should use TAP FRETS unless they can hold all needed frets while tapping STRUM.
- Hit streaks build a multiplier up to 4×. Hit notes charge BOOST; Shift or the boost button spends 50% charge for six seconds of double scoring.
- The rock meter responds to hits and misses; it does not stop the song. Scores are stored separately per song and play style on that browser.
- TIMING adjusts judgment by -200 to +200 ms. Use a negative offset if your hits feel consistently late. Sustain points stop when released. Pause and resume preserve the audio clock; re-hold sustained frets before resuming.
- Local audio is limited to 40 MB and six minutes. It is mixed to mono at 22,050 Hz for game playback to reduce memory usage. The original file is untouched.

Edit zine pages in `app.js`. Artwork and desktop structure are in `index.html`; `punk.css` and `rhythm.css` hold visual refinements. Base styles remain in `styles.css`.

High scores and CRT preference use localStorage when available; browsing still works if storage is disabled. No analytics or backend services are configured.
