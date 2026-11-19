# NEMAS — Build Planner

A static, dependency-free character planner built from Edition III of the NEMAS Morrowind Character Compendium. Open `dist/index.html` directly in a modern browser, or run `npm start` and visit the printed local address. Run `npm test` for calculation coverage.

## Included

- Prominent custom class builder: class name, specialisation, two distinct favoured attributes, five major and five minor skills. Duplicate skills across the two groups are prevented.
- Standard class bonuses: favoured attributes +10, major skills +25, minor skills +10, specialisation +5. The three skill bonuses are editable for verified NEMAS adjustments.
- Class choices are included in autosave, export/import, skill breakdowns, the effects ledger and derived stats.

- 29 races, 13 birthsigns, 81 lineages, 89 backgrounds, 80 faiths, and 67 optional cultures.
- Editable base attributes and skills, calculated Health / Magicka / Fatigue / carry capacity, and sourced effect totals.
- Independent absorption and Reflect rolls, with a clearly labelled additive override.
- Environment and activated-power controls, restrictions, background sets/caps, and source page links.
- Browser-local autosave and validated JSON export/import.
- Responsive dark olive, brass and parchment-toned interface, keyboard-accessible controls and tabs.

## Calculation boundaries

The racial starting attributes document supplies provisional baselines for all 29 menu entries. Choosing a race automatically loads its eight base attributes; Argonian and Malahk Orc offer male/female variants. Other races use the same values for both. The two Khajiit entries remain separate. Values remain editable for in-game corrections; class bonuses are applied separately; Restore race values resets them. Choosing another race or variant replaces manual edits. Saved/imported custom bases are preserved. Skills still start at an explicitly labelled planning baseline of 5. Full NEMAS engine configuration remains unspecified.

Derived formulas and stacking assumptions are editable on the Calculation rules tab. Starting Health uses racial base attributes plus favoured class bonuses only. Fortify attribute effects, including birthsign bonuses such as the Warrior, do not increase starting Health. Background, culture, lineage and faith attribute modifiers, including sets/caps, are excluded from this formula, along with temporary/environmental attribute changes. These modifiers still affect displayed attributes, Magicka and other derived stats. Direct Health effects are applied separately to the resulting Health total. No level progression is inferred. Maximum Magicka percentages are interpreted as additive INT multipliers. Ward's ambiguous +2x effect remains unresolved until an interpretation is selected.

Unspecified magnitudes, shuffled/random stats and undefined skill groups remain visible in the ledger and calculation notes; they are never assigned invented values. Numeric totals for those builds can be incomplete. Background sets/caps apply last; script ordering is not documented by the source. Racial timed effects are treated as activated when their spell type is absent. Culture assumes faithful adherence. Eligibility checks warn without hiding options.

`race-attributes.json` preserves all 31 rows extracted from NEMAS_Morrowind_Starting_Racial_Attributes.docx, in its original attribute order, with provenance. `dist/data.js` contains the full audited data, racial presets and source-page mapping. `prepare-data.mjs` regenerates it from the compendium's workspace source and copies the PDF. Editing source data requires regeneration and rerunning tests. Engine logic is isolated in `dist/engine.js`; UI code lives in `dist/app.js`, `dist/class-ui.js` and `dist/style.css`.

No account, external API, application framework, server-side database or build dependency is required. Google Fonts is optional; local Georgia/Segoe UI fallbacks preserve usability offline. Exported builds contain choices, input values, assumptions and a calculated summary.

## Class sources and assumptions

Standard class bonuses are documented by https://openmw.readthedocs.io/en/stable/manuals/openmw-cs/tables-characters.html#classes . The 27 standard skills are eligible for major/minor selection; Bardcraft is retained as a custom skill outside the class selection pool. Specialisation applies to all nine skills in its category, including miscellaneous skills. Base skills remain 5 unless manually edited. Partial class selections are allowed as a visibly incomplete draft.

Breton Conjuration: 5 base + 15 racial + 25 major = 45; Magic adds 5 for 50.

Legacy saved builds retain their custom base values and receive an empty class. If a class bonus was previously entered manually in a base field, remove it before selecting the same bonus in the class builder to avoid double counting.

## Verification

Automated coverage includes all 359 entries and focused combinations for positive/negative modifiers, missing bases, variable effects, power toggles, conditional skills, absorption stacking, restrictions, import validation and replacement rules. Browser visual verification depends on preview access in the host environment.

## Bulwark offensive-skill penalty

Bulwark now applies its -10 penalty to Blunt Weapon, Long Blade, Axe, Spear, Short Blade, Marksman, Hand-to-Hand and Destruction. This membership is an explicit planning interpretation: the compendium and the mod description name offensive skills without enumerating them, and the installed script has not been verified. The interpretation is shown in calculation notes. Class and racial bonuses combine with the penalty before the zero floor; half experience gain is a progression rule retained in the ledger and does not halve starting values.

Penalty source: https://github.com/OpenMW-Mod-Collection/BoonsAndBurdens#bulwark (checked 19 November 2026).