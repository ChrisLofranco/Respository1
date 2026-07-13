# Woodbine Paving — Lead-Generation Website

A single-page, static lead-generation site for **Woodbine Paving** (Brampton, ON — serving the Greater Toronto Area). Asphalt paving specialists, owner-operated by Tony & Jason.

No build step or dependencies — plain HTML/CSS/JS. Open `index.html` in a browser or serve the folder.

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | The single-page site |
| `styles.css` | Styles (black / white / red palette) |
| `script.js` | Estimator, multi-step form, chat widget logic |
| `driveway-maintenance-guide.html` | Standalone, downloadable/printable maintenance guide |

## Features

- **Driveway visualizer & estimator** — enter length/width + edge style (straight/curved); shows an SVG shape preview and a rough **price range** (clearly labeled an estimate, not a quote). Asphalt only.
- **Multi-step lead form** — service → size → timeline → contact, with a progress bar.
- **Auto-responding chatbot** — front-end demo that answers common pre-sale questions (pricing, service area, services, hours) via keyword intents, with quick-reply chips.
- **Unified GTA service-area section** — one combined list, not per-city pages.
- **Downloadable maintenance guide** — season/city-neutral title.
- **Reviews section** — placeholder cards (4★+ only) paraphrasing common themes.
- **Drop-in image slots** — logo, hero, and gallery load real files from `images/` and fall back to labeled placeholders until they're added (see `images/README.md`).

## Before launch — wire these up

These are intentionally mocked on the front end:

1. **Lead form** (`script.js`) — currently logs to console only. Connect it to email/CRM or a form endpoint (Formspree, Netlify Forms, your backend, etc.).
2. **Chatbot** — the widget answers common questions with simple keyword rules. Replace with a real AI chatbot backend (**Tidio, Intercom**, or a custom bot) for open-ended conversations and live handoff.
3. **Reviews** — swap the placeholder cards for a live **Google Reviews / HomeStars** widget so real, current 4★+ reviews display automatically.

## Drop in real assets

Search the code for `PLACEHOLDER` / `placeholder-media`:

- **Logo** — `.brand-logo` blocks in the header/footer (and the guide).
- **Hero photo** — `.hero-media` (~1600×900).
- **Gallery** — six `.gallery-item` slots (~800×600). Sizes/positions are set so real photos drop in without layout changes.

## Company details

- **Services:** Residential Paving, Commercial Paving, Commercial Snow Removal, Line Painting
- **Phone:** 416-275-9479 · **Hours:** Mon–Sun, 7am–7pm
- **Deliberately excluded:** interlock, sealcoating, financing, seasonal-urgency messaging, per-city landing pages.
