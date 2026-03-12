# Liquid Glass Nav Bar — Demo & Integration

## Demo (standalone)

Open `index.html` in a browser (or serve the folder). No build step required.

- **index.html** — Markup: pill container, noise layer, 3 reflection layers, 4 circular buttons (glass + highlight + icon).
- **styles.css** — Design tokens (CSS variables), pill and button styles, keyframes for shimmer and slow float.
- **script.js** — Tab selection and optional micro-reflection parallax (respects `prefers-reduced-motion`).

## React integration

1. **Import the shared nav glass styles** (tokens + utility classes):

   ```ts
   import './liquid-glass/navbar-glass.css';
   ```

2. **Use the same structure** in your nav component:
   - Wrapper: `nav.nav-pill-liquid` (or `.nav-pill-liquid` on your root).
   - Children: `nav-pill-liquid__noise`, `nav-pill-liquid__reflection-broad`, `nav-pill-liquid__reflection-sheen`, then `nav-pill-liquid__inner` with buttons.
   - Each button: `nav-btn-liquid`, with inner spans `nav-btn-liquid__glass`, `nav-btn-liquid__highlight`, `nav-btn-liquid__icon`. Active state: `nav-btn-liquid--active`.

3. **Control selected index** via your state; set `nav-btn-liquid--active` on the active button and `aria-current="page"` for accessibility.

4. **Reduced motion**: The CSS uses `@media (prefers-reduced-motion: reduce)` to set `--nav-shimmer-duration` and `--nav-float-duration` to `0s`, and disables parallax in the demo script. No extra React prop is required; the media query handles it.

5. **Theme**: Override tokens for light/dark, e.g.:
   - `--nav-pill-bg`
   - `--nav-btn-inactive-bg`
   - `--nav-accent`, `--nav-accent-glow`
   - `--nav-pill-shadow`, `--nav-btn-shadow`

## Design tokens (copy-paste)

```css
:root {
  --nav-pill-bg: rgba(255, 255, 255, 0.6);
  --nav-pill-blur: 16px;
  --nav-pill-saturate: 1.08;
  --nav-pill-shadow: 0 10px 20px rgba(14, 18, 20, 0.22), 0 2px 6px rgba(14, 18, 20, 0.12);
  --nav-pill-inset: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.02));
  --nav-pill-border: 1px solid rgba(255, 255, 255, 0.35);
  --nav-btn-size: 48px;
  --nav-btn-inactive-bg: rgba(255, 255, 255, 0.42);
  --nav-ease-hover: cubic-bezier(0.2, 0.9, 0.3, 1);
  --nav-duration-hover: 280ms;
  --nav-hover-y: -6px;
  --nav-hover-scale: 1.03;
  --nav-press-scale: 0.98;
  --nav-focus-ring: 0 0 0 6px rgba(120, 160, 255, 0.12);
  --nav-shimmer-duration: 2.8s;
  --nav-float-duration: 14s;
}
```

## Motion summary

- **Hover (button):** `translateY(-6px)` + `scale(1.03)`, 280ms, `cubic-bezier(.2,.9,.3,1)`; icon up ~2px.
- **Press (tap):** `scale(0.98)` + `translateY(1.5px)`, 120–140ms, `cubic-bezier(.4,0,.2,1)`.
- **Focus:** Diffused ring `box-shadow: 0 0 0 6px rgba(120,160,255,0.12)` + outline for accessibility.
- **Reflections:** Broad gradient `slowFloat` ~14s; diagonal sheen `shimmer` ~2.8s. Both disabled when `prefers-reduced-motion: reduce`.

## Performance

- Animations use `transform` and `opacity` only (GPU-friendly).
- `will-change` is not set by default to avoid overuse; add locally if needed (e.g. on hover).
- Fallback: if `backdrop-filter` is unsupported, the pill still shows `--nav-pill-bg`; consider a solid fallback or a PNG texture for older browsers.

## Assets

- **assets/sheen-overlay.svg** — Diagonal sheen gradient (can be used as mask or overlay).
- **assets/micro-reflection.svg** — Radial highlight for pointer-follow micro-reflection.

Export PNGs at 2x/3x from these SVGs if you need raster assets for compositing.

## Accessibility

- Minimum tappable size: 48px (via `--nav-btn-size`).
- Focus visible: diffused halo + outline; ensure contrast meets AA over the glass background.
- For very low-contrast contexts, add a theme token that switches to a more solid background (e.g. `--nav-pill-bg: rgba(255,255,255,0.92)`).
