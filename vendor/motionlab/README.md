# motionlab (vendored)

Source: npm `motionlab@1.0.1` (MIT, by santaval) — 16 minimalist Remotion scene components (`AbsoluteFill` + `useCurrentFrame`/`spring`/`interpolate`).

Peer deps: `react`, `remotion`. Each component's props are documented in `components/components.json`.

To use in a Remotion project: copy `components/*.tsx` into `src/components/motionlab/` (same as `npx motionlab add all`).

Note: `ManagerComponent.tsx` imports `TimelineItem` from `../../schema`, which the package doesn't ship — define that type in the host project or skip that file.
