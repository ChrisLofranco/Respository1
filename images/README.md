# Images

Real company assets now live here (logo, hero, and an 8-tile gallery of driveways
and equipment). Every slot on the site loads a file from this folder and falls back
to a labeled placeholder if the file is missing.

| File (in use) | Where it shows |
|---------------|----------------|
| `logo.png` | Header + footer logo, and the maintenance guide |
| `hero.webp` | Full-width hero background (paving fleet) |
| `gallery-1.jpg` | Gallery — residential driveway |
| `gallery-2.jpg` | Gallery — fresh asphalt driveway |
| `gallery-3.webp` | Gallery — compacted & finished |
| `gallery-4.webp` | Gallery — laneway paving |
| `gallery-5.jpg` | Gallery — driveway resurfacing |
| `gallery-6.jpeg` | Gallery — driveway replacement |
| `gallery-7.webp` | Gallery — commercial snow-removal fleet |
| `gallery-8.webp` | Gallery — paving fleet |

## Swapping or adding photos

Filenames are referenced directly in `index.html` (and `logo.png` in
`driveway-maintenance-guide.html`). To replace a photo, drop a new file with the
**same name/extension** — it appears automatically. To use a different extension,
update that one `<img src="…">` reference. Photos are JPG/WEBP; the logo is PNG.
