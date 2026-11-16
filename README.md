# NEMAS — Build Planner

A static, dependency-free character planner built from Edition III of the NEMAS Morrowind Character Compendium. Open `dist/index.html` directly in a modern browser, or run `npm start` and visit the printed local address. Run `npm test` for calculation coverage.

## Included

- 29 races, 13 birthsigns, 81 lineages, 89 backgrounds, 80 faiths, and 67 optional cultures.
- Editable base attributes and skills, calculated Health / Magicka / Fatigue / carry capacity, and sourced effect totals.
- Independent absorption and Reflect rolls, with a clearly labelled additive override.
- Environment and activated-power controls, restrictions, background sets/caps, and source page links.
- Browser-local autosave and validated JSON export/import.
- Responsive dark olive, brass and parchment-toned interface, keyboard-accessible controls and tabs.

## Calculation boundaries

The compendium does not include racial starting attributes or the complete NEMAS engine configuration. Attributes start empty. Skills start at an explicitly labelled planning baseline of 5. The example button supplies 40s, not racial presets.

Derived formulas and stacking assumptions are editable on the Calculation rules tab. Creation Health excludes temporary/environmental attribute changes, while direct Health buffs are included. No level progression is inferred. Maximum Magicka percentages are interpreted as additive INT multipliers. Ward's ambiguous +2x effect remains unresolved until an interpretation is selected.

Unspecified magnitudes, shuffled/random stats and undefined skill groups remain visible in the ledger and calculation notes; they are never assigned invented values. Numeric totals for those builds can be incomplete. Background sets/caps apply last; script ordering is not documented by the source. Racial timed effects are treated as activated when their spell type is absent. Culture assumes faithful adherence. Eligibility checks warn without hiding options.

`dist/data.js` contains the full audited data and source-page mapping. `prepare-data.mjs` regenerates it from the compendium's workspace source and copies the PDF. Editing source data requires regeneration and rerunning tests. Engine logic is isolated in `dist/engine.js`; UI code lives in `dist/app.js` and `dist/style.css`.

No account, external API, application framework, server-side database or build dependency is required. Google Fonts is optional; local Georgia/Segoe UI fallbacks preserve usability offline. Exported builds contain choices, input values, assumptions and a calculated summary.

## Verification

Automated coverage includes all 359 entries and focused combinations for positive/negative modifiers, missing bases, variable effects, power toggles, conditional skills, absorption stacking, restrictions, import validation and replacement rules. Browser visual verification depends on preview access in the host environment.
