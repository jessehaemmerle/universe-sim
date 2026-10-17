# Delete Anything

**Delete anything (the Moon, the oceans, gravity, the cold) and see what happens to the Earth.**

A browser game inspired by a reel from [@bonkbureau](https://www.instagram.com/reel/Dejy-yjkWrl/). Pick something
from the list to erase it from existence, then watch a time-lapse of the consequences, from the first second to
ten billion years later, on a real 3D Earth.

## Playing

- **Delete** anything from the list on the left (on phones: the *Delete* tab). Pick it again to bring it back.
- Deletions **stack**. Delete something new at any point on the timeline and the simulation carries on from there,
  with both deletions working together. Some pairs have their own combined effects.
- The **timeline** is logarithmic: seconds, days, years, millions of years. Play, pause, scrub or change the speed.
  Space bar plays and pauses.
- **What happened** lists every consequence with its timing. Most come with real numbers and sources from
  planetary science; a few are deliberately dramatised.
- **Discoveries** (33 of them) are remembered on your device.

There are 67 things to delete in seven groups: the four from the video, space, the planet, air and elements,
life, civilisation and the laws of physics.

## How the simulation works

`src/sim` is a small, deterministic planet model with no rendering code in it:

- **Climate**: an energy balance with sunlight, albedo (clouds, ice, deserts, vegetation), a greenhouse effect from
  CO₂, water vapour and pressure, a fast surface layer and a slow ocean reservoir, latitude bands, ice-albedo
  feedback, sea-ice thickness and the latent heat of a freezing ocean.
- **Water and air**: ice sheets, sea level, runaway greenhouse, gases freezing out of the sky, oxygen made by
  photosynthesis and consumed by rocks, the CO₂ thermostat of volcanoes and weathering.
- **Life and civilisation**: microbes, plankton, plants, fungi, insects, animals, fish and people, each with a
  carrying capacity set by temperature, light, water, air, food webs and technology.
- **Time**: every quantity relaxes toward its equilibrium on a real timescale (days for clouds, millennia for ice
  sheets, millions of years for oxygen). The relaxation is exact for any step size, so one model covers the
  first second and the next ten billion years. The Sun keeps ageing in the background.

Each deletion adds an instant change, a list of timed, hand-written consequences, and whatever the model does
on its own afterwards. Threshold watchers report knock-on effects nobody scripted, such as a snowball Earth
after deleting CO₂.

It is a toy model tuned to match well-known results (for example: without the Sun, below freezing within a week
and around −240 °C after a million years; without CO₂, a snowball Earth within decades), not a research tool.

## Development

```bash
npm install
npm run dev         # local dev server
npm test            # simulation unit tests (Vitest)
npm run test:e2e    # browser tests (Playwright, desktop and phone)
npm run build       # production build into dist/
```

Built with TypeScript, [three.js](https://threejs.org) and Vite. All sound is synthesised live with the Web Audio
API.

### Deployment

Every push to `main` runs the tests and publishes `dist/` to GitHub Pages
(`.github/workflows/deploy.yml`). In the repository settings, under **Pages → Build and deployment → Source**,
choose **GitHub Actions** once.

## Credits

Earth textures come from NASA's Visible Earth (public domain): Blue Marble Next Generation (July, topography),
GEBCO 2008 topography and bathymetry, and Black Marble 2012 city lights. `tools/make_textures.py` rebuilds
`public/textures` from the original files. 3D noise in the shaders is by Ian McEwan and Ashima Arts (MIT).
