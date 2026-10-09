# Art & audio

## Style: "storybook neon"

- **Scenes** are layered SVG landscapes (sky gradient → far → mid → near), with soft glows
  (`filter: glow`), drifting fog and CSS-animated details, plus a particle overlay
  (fireflies, embers, snow, sparks). Atmospheric perspective: far layers are lighter and
  bluer/hazier. Each region has its own palette (see `palette` in `region.yaml`).
- **Characters** are chibi: big heads, thick dark outlines (`stroke-width` 2.5–5), flat fills
  with one highlight, rosy cheeks.
- **UI** sits on deep night-blue translucent panels with gold accents. **Maths always sits on
  cream "parchment" cards** with dark ink so it is easy to read; the unknown `x` is always
  magenta (`--var-on-card` / `--var-on-dark`).
- Fonts: **Fredoka** (headings, buttons, numbers) and **Nunito** (body), bundled via
  `@fontsource` (no external requests).
- Emojis are used for item and node icons — bright, free and consistent on iPads.

## Where the art lives

| File | What |
| --- | --- |
| `src/art/scenes/index.tsx` | The six region backdrops + `SCENES` registry |
| `src/art/paint.ts` | Procedural helpers: smooth hills, jagged ridges, snow caps, blobs |
| `src/art/Avatar.tsx` | The hero (skin, hair, style, outfit, class gear, hats, capes) |
| `src/art/Monster.tsx` | Procedural monsters from a seed + hue |
| `src/art/Portrait.tsx` | Grimble, the Muddler, NPC heads |
| `src/art/Pet.tsx` | Pets (4 species × moods), egg, poop, flies, tombstone |
| `src/ui/screens/WorldMap.tsx` | The island map and region landmarks |
| `src/ui/widgets/*` | Interactive maths: boxes, balance, unwrap, tower, powers, hop |

Painted images can be dropped in later (e.g. AI-generated backgrounds in `public/art/`): a scene
component can render an `<image>` as its far layer and keep the SVG foreground and particles.

## Audio

`src/audio/sfx.ts` synthesises every sound with WebAudio (no files): clicks, right/wrong,
nudge, coins, level-up fanfare, hits, a sad trombone for knock-outs and pet deaths, and
the all-important fart, burp and squawk for pet toys. Sound can be muted from the HUD (saved
per hero). Music is not in v1.
