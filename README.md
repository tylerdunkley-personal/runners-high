# Runners High — Band Computer

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

- Draggable desktop windows, minimize/close, start menu, taskbar, local clock, switchable CRT overlay, and mobile layout.
- A pocket music player with two original procedural chiptune demos, play/pause, previous/next, seek, track list, and local audio imports. Demo audio is illustrative, not the band's music. Local audio never uploads and is discarded on reload.
- RUNNER_01, an original canvas endless runner with jump, pause/resume, increasing difficulty, and browser-local high scores. This is an original browser game rather than an emulator; no commercial ROMs are bundled.
- A three-page concept zine with page navigation. Editorial concept text is marked as such; no invented band biography, dates, or discography.
- Keyboard controls and reduced-motion support. Fonts fall back to local system fonts if Google Fonts is unavailable.

## Add the band's real tracks

Place licensed audio files in `media/`, then edit `content.json`:

```json
{
  "tracks": [
    { "title": "Your song title", "subtitle": "Runners High • release title", "src": "media/your-song.mp3" }
  ]
}
```

An empty list uses the original demo loops. Only publish audio you have permission to distribute. Edit zine pages in the `pages` array at the end of `app.js`. Replace the graphic in `.cover` with official cover artwork when supplied.

High scores and CRT preference use localStorage when available; browsing still works if storage is disabled. No analytics or backend services are configured.
