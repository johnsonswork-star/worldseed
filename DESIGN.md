# Worldseed — Design Document

An original HTML5 tower-defense game. A dead world named **Vesna** is seeded with a **Seedcore**. Hold the core against rift fauna while you buy **terraform** upgrades that thaw, water, and green the planet. Inspired by the *feeling* of watching a lifeless world become livable — not by any existing title, studio, or IP.

**Planet:** Vesna  
**Core:** Seedcore  
**Currency:** Spores  
**Threat:** Rift fauna leaking through the ice

---

## Player loop

1. **Title** → Play (or Continue from localStorage).
2. **Intermission** (before wave 1 and after every cleared wave): spend Spores on towers and terraform. Place / upgrade / sell on the map. Press **Next Wave**.
3. **Combat:** enemies walk a lane toward the Seedcore. Towers fire automatically. If an enemy reaches the core, it spends lives. Zero lives = defeat.
4. **Terraform thresholds:** when all four meters clear a stage line, Vesna **stages up**. New buildable ground thaws. Later stages lengthen the lane and open a second approach. Palette shifts ice → ash → steppe → canopy.
5. **Wave 10** cleared with the core alive = victory.

Tower placement and upgrades are allowed during combat (classic TD). Terraform purchases are **intermission-only** so stage-ups never fire mid-fight.

---

## Four terraform meters

| Meter    | What it is                         | Visual tell                          |
|----------|------------------------------------|--------------------------------------|
| **Pyra** | Geothermal heat / solar soak       | Ember glow, thaw, less ice           |
| **Aera** | Breathable envelope                | Sky brightens, wind motes            |
| **Aqua** | Meltwater and aquifers             | Pools, stream tint on the path       |
| **Vita** | Rootweb / biosphere                | Moss, then grass, then canopy flecks |

Each meter is 0–100.

### Stage table (stage is `min(Pyra, Aera, Aqua, Vita)`)

| Stage | Name         | Threshold (min of 4) | Map change                                      | Palette        |
|-------|--------------|----------------------|-------------------------------------------------|----------------|
| 0     | Rimefield    | 0                    | Short single lane, few build tiles              | Ice / ash blue |
| 1     | Cinderveil   | 20                   | Northern and southern belts thaw for building   | Rust / ochre   |
| 2     | Thawsteppe   | 45                   | Lane detours (longer exposure). More tiles      | Soil / sage    |
| 3     | Wildcanopy   | 70                   | Second lane from the north. Full buildable grid | Lush green     |

Stage-up bonus: **+40 Spores** and a short banner. Palette lerps over ~1.2s.

### Terraform shop (intermission)

| Item          | Cost | Effect                |
|---------------|------|-----------------------|
| Pyra Flare    | 35   | +20 Pyra              |
| Aera Bellows  | 35   | +20 Aera              |
| Aqua Tap      | 35   | +20 Aqua              |
| Vita Spore    | 35   | +20 Vita              |
| Worldpulse    | 90   | +12 to all four       |

Meters clamp at 100. Buying past 100 is disabled per-meter (Worldpulse still applies leftover to any meter under 100).

---

## Map

- Grid **18 × 10** tiles, landscape. Tile size scales to the viewport.
- **Spawn** west edge. **Seedcore** east edge, row 4, col 17.
- Path tiles are never buildable. Core tile is never buildable.
- Locked tiles (stage-gated) render as rime / basalt and reject placement.
- Path A (stage 0–1): west → small south jog → east into the core.
- Path A long (stage 2+): extra south-then-north detour before the core.
- Path B (stage 3): north spawn, joins the long lane near the core. Waves split ~50/50 across A and B.

---

## Towers (4 types, 3 levels)

Range is in **tiles**. Cooldown in seconds. Default targeting: **first** (highest path progress). A selected tower can cycle **First / Last / Close / Strong**. Sell refunds **75%** of spores invested (base + upgrades).

| Tower     | Cost | Dmg | CD  | Range | Role / notes |
|-----------|------|-----|-----|-------|----------------|
| **Needle**  | 45 | 15 | 0.95 | 2.5 | Kinetic bolt. Cheap DPS. 35% less damage vs armored. |
| **Cinder**  | 75 | 11 | 1.35 | 2.2 | Magma splash (radius 1.3 tiles). Ignores armor. |
| **Rime**    | 60 | 7  | 0.90 | 2.3 | Ice shard. 40% slow for 2.0s. 15% less vs armor. |
| **Bramble** | 80 | 5  | 0.70 | 2.4 | Thorn + poison 14 dmg over 3s (no armor). |

**Upgrades** — two paths, two tiers each (**Focus** = damage / fire rate, **Reach** = range / special). Crosspath is capped at **2/1** or **1/2** (not 2/2).

- Cost per tier on a path: `round(baseCost * 0.65 * tier)` so Needle Focus 1 is 29, Focus 2 is 58.
- Focus 1/2: **+40% damage** each; fire rate **−9% cooldown** per Focus tier.
- Reach 1/2: **+15% range** each; splash / slow / poison scale on Reach. Needle Reach 2 also cuts armor.

Synergy with terraform (small, not required):

- Pyra ≥ 40: Cinder splash radius +15%
- Aera ≥ 40: all towers +8% range
- Aqua ≥ 40: Rime slow 40% → 50%
- Vita ≥ 40: Bramble poison +25%

---

## Enemies

| Id           | HP  | Speed (px/s at tile 40) | Reward | Lives | Notes            |
|--------------|-----|-------------------------|--------|-------|------------------|
| Ashcrawler   | 38  | 40                      | 7      | 1     | Baseline walker  |
| Shardmite    | 22  | 78                      | 6      | 1     | Fast, small      |
| Carapace     | 100 | 26                      | 14     | 1     | 45% armor        |
| Bloomthief   | 55  | 50                      | 10     | 1     | Medium / leafy   |
| Hollow Titan | 480 | 20                      | 45     | 3     | Boss, huge       |

HP scale: `hp * (1 + 0.13 * waveIndex)` where waveIndex is 0 for wave 1.  
Armor reduces **Needle** and **Rime** only.

---

## Waves (10)

Spawn spacing inside a pack is `gap` seconds. Packs run back-to-back with 0.8s between packs. Wave-clear bonus: `18 + 6 * waveNumber`.

| #  | Name            | Packs |
|----|-----------------|-------|
| 1  | Rime Drift      | 8 Ashcrawler @ 0.75s |
| 2  | Shardwind       | 6 Ashcrawler @ 0.65s, 8 Shardmite @ 0.40s |
| 3  | Shell Line      | 8 Ashcrawler @ 0.60s, 5 Carapace @ 0.90s |
| 4  | Mixed Front     | 10 Shardmite @ 0.35s, 6 Ashcrawler @ 0.55s, 3 Carapace @ 0.85s |
| 5  | First Hollow    | 8 Ashcrawler, 4 Carapace, **1 Hollow Titan** |
| 6  | Green Hunger    | 10 Bloomthief @ 0.50s, 8 Shardmite, 4 Carapace |
| 7  | Pressure        | 10 Ashcrawler, 8 Carapace, 8 Bloomthief |
| 8  | Rift Tide       | 14 Shardmite, 8 Carapace, 8 Bloomthief |
| 9  | Canopy War      | 10 Ashcrawler, 10 Bloomthief, 8 Carapace, 8 Shardmite |
| 10 | Heart of Vesna  | **2 Hollow Titan**, 12 Carapace, 10 Bloomthief, 10 Shardmite |

---

## Economy (why it should play)

- Start **180 Spores**, **16 lives**.
- Wave 1 income ~56 + bonus 24 ≈ 80. Two Needles (90) hold W1; leftover terraform.
- One of each small terraform (140) reaches stage 1 (20/20/20/20) around waves 2–4 if the player splits spend.
- Stage 2 (~45 min) wants ~3 buys per meter ≈ 420, typically waves 5–7.
- Stage 3 (~70) is a late-game flex: extra lane + full grid for the finale.
- Ignoring terraform keeps a cramped map; later waves punish it. Ignoring towers dies early. Split spend is the intended line.

---

## HUD / systems

- Top bar: lives (heart), Spores, wave #, stage name, compact terraform meters.
- Right tray: portrait buttons for Needle / Cinder / Rime / Bramble (cost under each). Buy then tap a tile.
- Selected tower: bottom Focus / Reach upgrade panel, sell (75%), targeting cycle.
- Intermission terraform shop is a labeled corner panel (does not cover the map).
- Bottom cluster: Next Wave (large green), Pause, 1×/2×, Mute.
- No IAP. Optional **localStorage** key `worldseed-save-v1` (wave, resources, towers, meters). Written on intermission and pause.
- Touch-first: pointer events, large shop cards, `touch-action: none` on the canvas, AudioContext resume on first gesture.
- Defeat: core at 0 lives. Victory: survive wave 10.

---

## Technical

Vanilla HTML / CSS / JS. Canvas 2D map. No build step. GitHub Pages from `main` `/`.
