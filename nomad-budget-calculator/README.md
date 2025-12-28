# Nomad Budget Calculator

A responsive, embed-ready budget calculator for digital nomads. Built with vanilla HTML/CSS/JS to drop into any static host or Squarespace iframe.

## Quick start
Open `index.html` locally or host the `nomad-budget-calculator/` folder on any static hosting provider (Cloudflare Pages, Netlify, Vercel, GitHub Pages). No build step required.

## Local testing
- **Run it locally:** From this folder run `python -m http.server 8000` and open `http://localhost:8000/index.html` (or simply double-click `index.html`).
- **Exercise flows:** Try presets, adjust amounts, toggle buffer modes, collapse/expand one-time costs, and confirm the sticky results update smoothly.
- **Exercise flows:** Try presets, adjust sliders/inputs, toggle buffer modes, collapse/expand one-time costs, and confirm the sticky results update smoothly.
- **Share URL:** Create a share link, paste it into a new tab, and verify values hydrate. Try clearing the query string to return to defaults.
- **Remember toggle:** Enable "Remember my numbers" then reload; disable it and reload to ensure data clears.
- **CSV export:** Click **Export CSV** and open the file to confirm rows contain your current numbers.
- **Theme toggle:** Switch light/dark modes and reload to verify the override persists until changed.
- **Keyboard nav:** Tab through controls (including preset chips and numeric inputs) to confirm visible focus and operability via keyboard.
- **Keyboard nav:** Tab through controls (including preset chips and sliders) to confirm visible focus and operability via keyboard.

## Configuration
- **BASE_URL**: Update the `BASE_URL` constant near the top of `app.js` to the URL where you will host `/nomad-budget-calculator/` (e.g., `https://tools.example.com/nomad-budget-calculator/`).
- **Auto-height origin**: In `embed-snippet.html`, set `ALLOWED_ORIGIN` to the same origin as `BASE_URL` for safe `postMessage` height adjustments.
- **Presets & defaults**: Adjust the `presets` map and `categories` defaults inside `app.js` to match your expectations.
- **Category list**: Modify the `categories` array in `app.js` to add, rename, or reorder budget categories.

## Squarespace embed steps
1. In Squarespace, add an **Embed Block** and choose **Code**.
2. Paste the iframe snippet from `embed-snippet.html` and update the `src` to your `BASE_URL`.
3. (Optional) Add the auto-height script snippet from `embed-snippet.html` on the same page. Ensure `ALLOWED_ORIGIN` matches your host.

## Features
- Modern two-column layout with sticky results on desktop and stacked layout on mobile.
- Prefers-color-scheme aware dark mode with user override toggle.
- Local persistence only when "Remember my numbers" is enabled (uses `localStorage`).
- Shareable URLs via compact query parameters; landing on a shared URL hydrates the calculator state.
- CSV export of all inputs and computed totals.
- Accessible controls with labels, focus states, and keyboard-friendly preset chips.
- Gentle nudges when major categories are zero or buffer is below 5%.
- Optional auto-height messaging for iframe embeds (`postMessage` with `type: "nbc-height"`).

## Hosting tips
- **Cloudflare Pages**: Point a project at this folder; set the build command to `none`. Deploy to a custom domain/subdomain.
- **Netlify**: Drag-and-drop the folder or connect a repo; set publish directory to `nomad-budget-calculator`.
- **Vercel**: Create a static deployment with output directory `nomad-budget-calculator` and no build command.

## Manual QA checklist
- Mobile & desktop layouts align and results card remains legible.
- Dark mode respects system preference and manual toggle overrides.
- Toggling "Remember my numbers" persists or clears data appropriately.
- Generate a share URL, reload with that URL, and confirm values hydrate.
- CSV export downloads with expected rows and currency values.
- Keyboard navigation reaches numeric inputs, buttons, and chips with visible focus rings.
- Keyboard navigation reaches sliders, buttons, and chips with visible focus rings.
- Buffer switch between percentage and fixed works; warnings appear when buffer &lt; 5%.
- One-time costs collapse toggle works and updates embed height.
