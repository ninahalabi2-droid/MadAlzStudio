# ECHO/STACK — retro-futuristic interactive studio site

Plain HTML + CSS + vanilla JS. No build step and no dependencies apart from Google Fonts.

```
/
  index.html      markup for all 7 sections + overlays
  style.css       design tokens, components, responsive + reduced-motion rules
  script.js       all interactions (boot, laptop, OS, files, projects, terminal, easter eggs)
  game.js         STAR CATCHER mini arcade game (canvas)
  assets/
    laptop.gif    the animated laptop (the heart of the site)
    sounds/       click, hover, boot, error, success, open, close, coin, hit, pickup, type, gameover, modem (.wav)
    images/       spare folder for your own images
```

## Run locally
Open `index.html` directly, or serve the folder (`npx serve .` / `python3 -m http.server`).

## Swap the laptop GIF
Replace `assets/laptop.gif` with your own animated GIF. The clickable screen overlay is positioned
with four CSS variables at the top of `style.css`:

```css
--scr-l: 14.6%;  /* left edge of the screen, % of GIF width  */
--scr-t: 7.6%;   /* top edge, % of GIF height               */
--scr-w: 44.8%;  /* screen width                            */
--scr-h: 41.6%;  /* screen height                           */
```
If your GIF has a different composition, tweak these until the menu sits on the screen.
Also update the `width`/`height` attributes on the `<img id="laptopGif">` tag to match your GIF.

## Sound
Sound is OFF until the visitor opts in (boot screen or the SOUND toggle). Replace any `.wav` in
`assets/sounds/` with your own effect, keeping the same file name.

## Edit content
- Projects: the `PROJECTS` array in `script.js` (name, type, description, tech, preview style, optional `url` opened by LAUNCH).
- Files: the `TREE` array in `script.js`.
- Contact: `CONTACT_EMAIL` and `sendMessage()` in `script.js`. By default the form plays the modem animation and then
  offers a pre-filled email; replace `sendMessage()` with a call to Formspree, Netlify Forms or your own API.

## Easter eggs (8)
1. Konami code (↑ ↑ ↓ ↓ ← → ← → B A) — cheat mode, palette cycling, infinite lives
2. Click the laptop 7 times quickly — overheat / fake error screen
3. Press ` (backtick) — hidden terminal (also in START menu and ARCHIVE → TERMINAL.EXE)
4. Blip — the creature peeking above the desktop taskbar
5. VAULT/SECRET.TXT — password 1989
6. TRASH → SHRED
7. SIGNAL.EXE — tune to 2089 MHz
8. The tiny π in the footer

Extra: type `glitch` or `hello` anywhere, try `sudo`, `hack`, `secrets` in the terminal, or press SHUT DOWN.
Terminal `reset` clears found secrets. Settings, secrets and the high score live in memory for the session.
