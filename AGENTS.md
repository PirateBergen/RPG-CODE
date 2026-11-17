# Source layout

- Canonical JavaScript and CSS sources live in `src/`. Read `src/README.md` and `src/source-map.json` before changing game code.
- Root-level JavaScript files and `style.css` are generated compatibility entrypoints. Edit their source fragments, then run `node tools/build-source.cjs`; do not edit the generated outputs directly.
- `index.html` remains the page entrypoint. The service worker source is `src/platform/service-worker.js`.
- Source fragments are classic scripts assembled in the manifest's exact order, not independently loaded ES modules. Preserve initialization order, global bindings and CSS cascade unless a behavior change is intended.
- Campaign-specific content is under `src/campaigns/prophetie-des-mouches/`. Shared rules are under `src/engine/`; UI, effects, coordination and infrastructure have their own directories.

# Verification

- Run `node tools/build-source.cjs --check` after assembly and before tests/publication.
- The ordinary suite is `node tests/run.cjs`; browser and Firebase tests have dedicated runners. Firebase tests must use the local emulator, never production campaign data.
- For a structural change, check preservation of storage paths, saved identifiers, event sequencing and media URLs. `reports/source-separation-2026-11-17.json` records the baseline for the initial separation.
- Follow `PUBLICATION.md` for release versions and verification. Update the cache version in the service worker **source**, then rebuild.
