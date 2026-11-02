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
- RAT ARCADE is a four-lane rhythm game with A/S/K/L and multi-touch frets, audio-clock timing, a 36-second original guitar/drum practice riff, hit judgments, combo multipliers, score summary, pause/resume, and browser-local high scores. It does not use a commercial emulator, game assets, or Runner’s High audio.
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

## Add a real song to the rhythm game

The current level is an original practice riff, not Rat Motel. To add Rat Motel, supply authorized audio and author a note chart against that exact master. The chart and practice audio are in `game.js`. Bandcamp iframe audio cannot be synchronized or controlled by this app because it is cross-origin. Starting the arcade resets the iframe to stop independent playback; choosing THE BAND / MY MIXTAPE also stops the other source. Do not assume the clickwheel controls Bandcamp: use the official embed’s own play button.

## Add the band's real tracks

Place licensed audio files in `media/`, then edit `content.json`:

```json
{
  "tracks": [
    { "title": "Your song title", "subtitle": "Runners High • release title", "src": "media/your-song.mp3" }
  ]
}
```

An empty list uses the original demo loops. Only publish audio you have permission to distribute. These tracks appear in MY MIXTAPE. Edit zine pages in the `pages` array in `app.js`. The official artwork and Bandcamp iframe are in `index.html`. The punk art direction is in `punk.css`; `styles.css` holds base desktop styles.

High scores and CRT preference use localStorage when available; browsing still works if storage is disabled. No analytics or backend services are configured.
