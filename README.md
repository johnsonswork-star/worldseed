# Worldseed

Original HTML5 tower defense with planetary terraforming. You plant a **Seedcore** on the dead world **Vesna**, hold it against rift fauna, and spend **Spores** on towers *and* four terraform meters (**Pyra**, **Aera**, **Aqua**, **Vita**). When every meter clears a threshold, Vesna stages up: ice thaws, the palette shifts, more ground becomes buildable, the lane grows, and a second approach opens.

Playable in a mobile browser (touch-first, landscape-friendly). No accounts, no IAP, no build step.

**Play:** [https://johnsonswork-star.github.io/worldseed/](https://johnsonswork-star.github.io/worldseed/)  
**Source:** [https://github.com/johnsonswork-star/worldseed](https://github.com/johnsonswork-star/worldseed)

## How to play

1. Tap **Play**. You start in intermission on **Rimefield** with 180 Spores and 16 lives.
2. Tap a tower portrait in the right tray (**Needle**, **Cinder**, **Rime**, **Bramble**), then tap a thawed tile to place it. Tap a placed tower for **Focus** / **Reach** upgrades (two paths, 2/1 crosspath cap) or sell (75% refund). Cycle targeting with First / Last / Close / Strong.
3. During intermission, buy terraform from the labeled corner panel (Pyra Flare, Aera Bellows, Aqua Tap, Vita Spore, or Worldpulse). Terraform is **intermission-only**.
4. Tap **Next Wave**. Enemies walk the lane toward the Seedcore. If they arrive, you lose lives. Zero lives is defeat.
5. Clear 10 waves to win. Stage names: Rimefield → Cinderveil → Thawsteppe → Wildcanopy.

HUD: heart / Spores / wave on top, tower tray on the right, Next Wave + Pause + 1×/2× + Mute along the bottom. Optional auto-save in `localStorage` between waves.

Rotate a phone to landscape for the widest field. Desktop also works (keys: `1–4` pick towers, `Space` pause, `M` mute).

Numbers, stages, and enemy tables live in [DESIGN.md](DESIGN.md).

## GitHub Pages

This repo is a static site (`index.html` at the root). Pages is enabled from **main** `/` (legacy / static HTML, no Jekyll action required). After a push to `main`, the live URL is:

`https://johnsonswork-star.github.io/worldseed/`

If Pages was not yet on, enable with:

```bash
gh api -X POST repos/johnsonswork-star/worldseed/pages -f build_type=legacy -F source[branch]=main -F source[path]=/
```

Private-repo Pages needs GitHub Pro. For a free public play URL the repo may be public — that is intentional for this game.

## Run locally

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.
