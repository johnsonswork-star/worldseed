/* Worldseed — canvas TD + terraform. Vanilla JS. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const hash = (c, r) => ((c * 73 + r * 149 + 19) >>> 0) % 1000 / 1000;
  const key = (c, r) => c + "," + r;
  const hexToRgb = (h) => {
    const s = h.replace("#", "");
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  const rgbToHex = (r, g, b) =>
    "#" + [r, g, b].map((n) => clamp(n | 0, 0, 255).toString(16).padStart(2, "0")).join("");
  const lerpHex = (a, b, t) => {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
  };
  const now = () => performance.now();

  function pathSet(stage) {
    const s = new Set();
    const add = (p) => p.forEach(([c, r]) => s.add(key(c, r)));
    add(stage >= 2 ? WS.PATH_A_LONG : WS.PATH_A);
    if (stage >= 3) add(WS.PATH_B);
    return s;
  }

  function toWaypoints(path, ts) {
    return path.map(([c, r]) => ({ x: (c + 0.5) * ts, y: (r + 0.5) * ts }));
  }

  function upgradeCost(base, level) {
    return Math.round(base * 0.65 * level);
  }

  function hpScale(waveIndex) {
    return 1 + 0.13 * waveIndex;
  }

  function portraitSVG(id, def) {
    const c = def.color2 || "#fff";
    const d = def.color || "#aaa";
    if (id === "needle") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><polygon points="54,32 14,44 18,32 14,20" fill="' + c + '"/><rect x="8" y="28" width="12" height="8" rx="2" fill="' + d + '"/></svg>';
    }
    if (id === "cinder") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="16" fill="' + d + '"/><circle cx="32" cy="34" r="8" fill="' + c + '"/><path d="M28 16l4 10 4-10" stroke="' + c + '" stroke-width="3" fill="none"/></svg>';
    }
    if (id === "rime") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="' + c + '" stroke-width="4" stroke-linecap="round"><path d="M32 10v44M12 32h40M18 18l28 28M46 18L18 46"/></g></svg>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="12" fill="none" stroke="' + d + '" stroke-width="4"/><path d="M20 36Q32 12 46 30" fill="none" stroke="' + c + '" stroke-width="3"/><circle cx="32" cy="34" r="4" fill="' + c + '"/></svg>';
  }

  class Game {
    constructor() {
      this.canvas = $("c");
      this.ctx = this.canvas.getContext("2d");
      this.dpr = 1;
      this.ts = 40;
      this.lw = WS.COLS * 40;
      this.lh = WS.ROWS * 40;
      this.state = "title";
      this.paused = false;
      this.speed = 1;
      this.waveIndex = 0;
      this.intermission = true;
      this.spores = WS.START_SPORES;
      this.lives = WS.START_LIVES;
      this.meters = { pyra: 0, aera: 0, aqua: 0, vita: 0 };
      this.stage = 0;
      this.visualStage = 0;
      this.towers = [];
      this.enemies = [];
      this.bolts = [];
      this.fx = [];
      this.floaters = [];
      this.ambience = [];
      this.selectedShop = null;
      this.selectedTower = null;
      this.hover = null;
      this.shake = 0;
      this.flash = 0;
      this.bannerT = 0;
      this.bannerText = "";
      this.spawnQ = [];
      this.spawnWait = 0;
      this.spawnFlip = 0;
      this.lastT = 0;
      this.raf = 0;
      this.ended = false;
      this.waveActive = false;
      this.hudAcc = 0;
      this.pointerDown = false;
      this.immersive = false;
      this.bindUI();
      this.resize();
      window.addEventListener("resize", () => this.scheduleResize());
      window.addEventListener("orientationchange", () => setTimeout(() => this.scheduleResize(), 180));
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", () => this.scheduleResize());
      }
      document.addEventListener("fullscreenchange", () => this.syncFullscreen());
      document.addEventListener("webkitfullscreenchange", () => this.syncFullscreen());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state === "play") this.setPaused(true);
      });
      this.refreshTitle();
      this.loop = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loop);
      if (/autostart/.test(location.hash || "")) this.startNew();
    }

    minMeter() {
      return Math.min(this.meters.pyra, this.meters.aera, this.meters.aqua, this.meters.vita);
    }

    computeStage() {
      const m = this.minMeter();
      let s = 0;
      for (let i = 0; i < WS.STAGE_THRESHOLDS.length; i++) {
        if (m >= WS.STAGE_THRESHOLDS[i]) s = i;
      }
      return s;
    }

    paths() {
      const a = this.stage >= 2 ? WS.PATH_A_LONG : WS.PATH_A;
      const list = [toWaypoints(a, this.ts)];
      if (this.stage >= 3) list.push(toWaypoints(WS.PATH_B, this.ts));
      return list;
    }

    tileAt(c, r) {
      if (c < 0 || r < 0 || c >= WS.COLS || r >= WS.ROWS) return null;
      const paths = pathSet(this.stage);
      const isCore = c === WS.CORE[0] && r === WS.CORE[1];
      const req = WS.tileStageReq(c, r);
      if (isCore) return { kind: "core", req };
      if (paths.has(key(c, r))) return { kind: "path", req };
      if (req > this.stage) return { kind: "locked", req };
      return { kind: "build", req };
    }

    towerAt(c, r) {
      return this.towers.find((t) => t.c === c && t.r === r);
    }

    reset() {
      this.waveIndex = 0;
      this.intermission = true;
      this.spores = WS.START_SPORES;
      this.lives = WS.START_LIVES;
      this.meters = { pyra: 0, aera: 0, aqua: 0, vita: 0 };
      this.stage = 0;
      this.visualStage = 0;
      this.towers = [];
      this.enemies = [];
      this.bolts = [];
      this.fx = [];
      this.floaters = [];
      this.selectedShop = null;
      this.selectedTower = null;
      this.spawnQ = [];
      this.spawnWait = 0;
      this.ended = false;
      this.waveActive = false;
      this.paused = false;
      this.speed = 1;
      $("btn-speed").textContent = "1×";
      this.hideOverlays();
      this.seedAmbience();
      this.syncHUD();
      this.buildShop();
      this.openShop(true);
      this.banner("Plant the Seedcore", 2.2);
      this.save();
    }

    startNew() {
      WSAudio.resume();
      WSAudio.ui();
      $("title-screen").classList.add("hidden");
      $("game-screen").classList.remove("hidden");
      this.state = "play";
      this.reset();
      this.scheduleResize();
    }

    continueSave() {
      if (!this.load()) return this.startNew();
      WSAudio.resume();
      WSAudio.ui();
      $("title-screen").classList.add("hidden");
      $("game-screen").classList.remove("hidden");
      this.state = "play";
      this.ended = false;
      this.paused = false;
      this.hideOverlays();
      this.seedAmbience();
      this.syncHUD();
      this.buildShop();
      this.openShop(true);
      this.scheduleResize();
      this.banner("Vesna remembers", 1.8);
    }

    save() {
      try {
        localStorage.setItem(
          WS.SAVE_KEY,
          JSON.stringify({
            v: 2,
            spores: this.spores,
            lives: this.lives,
            waveIndex: this.waveIndex,
            meters: this.meters,
            towers: this.towers.map((t) => ({
              id: t.id, c: t.c, r: t.r, level: t.level, spent: t.spent,
              pathL: t.pathL, pathR: t.pathR, target: t.target
            }))
          })
        );
      } catch (e) {}
      this.refreshTitle();
    }

    load() {
      try {
        const raw = localStorage.getItem(WS.SAVE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        if (!d || (d.v !== 1 && d.v !== 2)) return false;
        this.spores = d.spores;
        this.lives = d.lives;
        this.waveIndex = d.waveIndex;
        this.meters = d.meters;
        this.stage = this.computeStage();
        this.visualStage = this.stage;
        this.towers = (d.towers || []).map((t) => this.makeTower(t.id, t.c, t.r, t.level, t.spent, t));
        this.intermission = true;
        this.enemies = [];
        this.bolts = [];
        this.fx = [];
        return this.lives > 0 && this.waveIndex < WS.WAVE_COUNT;
      } catch (e) {
        return false;
      }
    }

    hasSave() {
      try {
        const d = JSON.parse(localStorage.getItem(WS.SAVE_KEY) || "null");
        return !!(d && (d.v === 1 || d.v === 2) && d.lives > 0 && d.waveIndex < WS.WAVE_COUNT);
      } catch (e) {
        return false;
      }
    }

    refreshTitle() {
      const btn = $("btn-continue");
      if (this.hasSave()) btn.hidden = false;
      else btn.hidden = true;
    }

    bindUI() {
      $("btn-play").addEventListener("click", () => this.startNew());
      $("btn-continue").addEventListener("click", () => this.continueSave());
      $("btn-pause").addEventListener("click", () => this.setPaused(!this.paused));
      $("btn-resume").addEventListener("click", () => this.setPaused(false));
      $("btn-mute").addEventListener("click", () => this.syncMute(WSAudio.toggle()));
      $("btn-full").addEventListener("click", () => this.toggleFullscreen());
      $("btn-speed").addEventListener("click", () => {
        this.speed = this.speed === 1 ? 2 : 1;
        $("btn-speed").textContent = this.speed + "×";
        WSAudio.ui();
      });
      $("btn-restart").addEventListener("click", () => this.confirmRestart());
      $("btn-pause-restart").addEventListener("click", () => this.startNew());
      $("btn-again").addEventListener("click", () => this.startNew());
      $("btn-wave").addEventListener("click", () => this.startWave());
      $("ins-close").addEventListener("click", () => this.selectTower(null));
      $("ins-sell").addEventListener("click", () => this.sellSelected());
      $("ins-target").addEventListener("click", () => this.cycleTarget());

      const c = this.canvas;
      const onPtr = (ev, down) => {
        if (this.state !== "play") return;
        const t = this.tileFromEvent(ev);
        if (down) {
          this.pointerDown = true;
          if (t) this.onTapTile(t.c, t.r);
        } else {
          this.pointerDown = false;
        }
        ev.preventDefault();
      };
      c.addEventListener("pointerdown", (e) => onPtr(e, true));
      c.addEventListener("pointerup", (e) => onPtr(e, false));
      c.addEventListener("pointermove", (e) => {
        const t = this.tileFromEvent(e);
        this.hover = t;
      });
      c.addEventListener("pointerleave", () => { this.hover = null; });
      c.addEventListener("contextmenu", (e) => e.preventDefault());

      window.addEventListener("keydown", (e) => {
        if (this.state !== "play") {
          if (e.key === "Enter") this.startNew();
          return;
        }
        if (e.key === " " || e.key === "p" || e.key === "P") {
          e.preventDefault();
          this.setPaused(!this.paused);
        }
        if (e.key === "m" || e.key === "M") this.syncMute(WSAudio.toggle());
        if (e.key === "Escape") {
          if (this.paused) this.setPaused(false);
          else this.selectTower(null);
        }
        const ids = ["needle", "cinder", "rime", "bramble"];
        if (e.key >= "1" && e.key <= "4") this.pickShop(ids[e.key - 1]);
      });

      this.syncMute(WSAudio.muted);
    }

    syncMute(muted) {
      $("btn-mute").textContent = muted ? "Unmute" : "Mute";
    }

    hideOverlays() {
      $("pause-ov").classList.remove("open");
      $("end-ov").classList.remove("open");
    }

    setPaused(v) {
      if (this.state !== "play" || this.ended) return;
      this.paused = v;
      $("pause-ov").classList.toggle("open", v);
      $("btn-pause").textContent = v ? "Paused" : "Pause";
      if (v) this.save();
    }

    confirmRestart() {
      this.setPaused(true);
    }

    fsEl() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    syncFullscreen() {
      const on = !!(this.fsEl() || this.immersive);
      document.body.classList.toggle("immersive", on);
      const btn = $("btn-full");
      if (btn) btn.textContent = on ? "Exit" : "Full";
      this.scheduleResize();
    }

    async toggleFullscreen() {
      const root = $("app") || document.documentElement;
      WSAudio.ui();
      const native = root.requestFullscreen || root.webkitRequestFullscreen;
      if (this.fsEl()) {
        this.immersive = false;
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (e) {}
        this.syncFullscreen();
        return;
      }
      if (this.immersive) {
        this.immersive = false;
        this.syncFullscreen();
        return;
      }
      let ok = false;
      if (native) {
        try {
          if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
          else root.webkitRequestFullscreen();
          ok = true;
        } catch (e) {
          ok = false;
        }
      }
      if (!ok && !this.fsEl()) {
        this.immersive = true;
        try { window.scrollTo(0, 0); } catch (e) {}
        this.banner("Safari keeps the address bar. Add to Home Screen for true full screen.", 2.6);
      }
      this.syncFullscreen();
    }

    scheduleResize() {
      this.resize();
      requestAnimationFrame(() => {
        this.resize();
        requestAnimationFrame(() => this.resize());
      });
    }

    resize() {
      const wrap = $("playfield");
      if (!wrap || !this.canvas) return;
      const rect = wrap.getBoundingClientRect();
      const vv = window.visualViewport;
      let availW = rect.width;
      let availH = rect.height;
      if (availW < 80 || availH < 80) {
        const vw = vv ? vv.width : window.innerWidth;
        const vh = vv ? vv.height : window.innerHeight;
        availW = Math.max(availW, vw);
        availH = Math.max(availH, vh);
      }
      availW = Math.max(160, availW);
      availH = Math.max(140, availH);
      const pad = 2;
      const ts = Math.max(12, Math.floor(Math.min((availW - pad) / WS.COLS, (availH - pad) / WS.ROWS)));
      this.ts = ts;
      this.lw = ts * WS.COLS;
      this.lh = ts * WS.ROWS;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.lw * this.dpr);
      this.canvas.height = Math.floor(this.lh * this.dpr);
      this.canvas.style.width = this.lw + "px";
      this.canvas.style.height = this.lh + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    tileFromEvent(ev) {
      const r = this.canvas.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * this.lw;
      const y = ((ev.clientY - r.top) / r.height) * this.lh;
      const c = Math.floor(x / this.ts);
      const row = Math.floor(y / this.ts);
      if (c < 0 || row < 0 || c >= WS.COLS || row >= WS.ROWS) return null;
      return { c, r: row, x, y };
    }

    onTapTile(c, r) {
      if (this.ended || this.paused) return;
      const tw = this.towerAt(c, r);
      if (tw) {
        this.selectedShop = null;
        this.highlightShop();
        this.selectTower(tw);
        WSAudio.ui();
        return;
      }
      const tile = this.tileAt(c, r);
      if (this.selectedShop && tile && tile.kind === "build") {
        this.placeTower(this.selectedShop, c, r);
        return;
      }
      this.selectTower(null);
    }

    selectTower(tw) {
      this.selectedTower = tw;
      const box = $("inspector");
      if (!tw) {
        box.classList.remove("open");
        return;
      }
      this.refreshInspector();
      box.classList.add("open");
    }

    refreshInspector() {
      const tw = this.selectedTower;
      if (!tw) return;
      const def = WS.TOWERS[tw.id];
      const paths = WS.PATHS[tw.id];
      const refund = Math.floor(tw.spent * WS.SELL_RATIO);
      $("ins-name").textContent = def.name;
      $("ins-info").textContent =
        "Focus " + tw.pathL + "/2 · Reach " + tw.pathR + "/2 · Sell " + refund + " spores";
      $("path-l-name").textContent = WS.PATH_NAMES.L;
      $("path-r-name").textContent = WS.PATH_NAMES.R;
      this.renderPathButtons("L", paths.L, tw);
      this.renderPathButtons("R", paths.R, tw);
      $("ins-target").textContent = WS.TARGET_LABEL[tw.target] || "First";
      $("ins-sell").textContent = "Sell " + refund;
    }

    renderPathButtons(side, tiers, tw) {
      const wrap = $(side === "L" ? "path-l-btns" : "path-r-btns");
      wrap.innerHTML = "";
      const cur = side === "L" ? tw.pathL : tw.pathR;
      tiers.forEach((tier, i) => {
        const n = i + 1;
        const cost = upgradeCost(WS.TOWERS[tw.id].cost, n);
        const b = document.createElement("button");
        b.type = "button";
        const owned = cur >= n;
        const allowed = this.canUpgradePath(tw, side, n);
        const afford = this.spores >= cost;
        b.innerHTML =
          '<span class="tier">' + tier.name + "</span>" +
          (owned ? '<span class="price">Owned</span>' : '<span class="price">' + cost + "</span>") +
          '<div class="blurb">' + tier.blurb + "</div>";
        if (owned) b.classList.add("owned");
        else if (!allowed) b.classList.add("locked");
        else if (!afford) b.classList.add("unaffordable");
        b.disabled = owned || !allowed || !afford;
        b.addEventListener("click", () => this.upgradePath(side));
        wrap.appendChild(b);
      });
    }

    canUpgradePath(tw, side, nextTier) {
      const cur = side === "L" ? tw.pathL : tw.pathR;
      const other = side === "L" ? tw.pathR : tw.pathL;
      if (nextTier !== cur + 1) return false;
      if (nextTier > 2) return false;
      if (nextTier === 2 && other >= 2) return false;
      return true;
    }

    cycleTarget() {
      const tw = this.selectedTower;
      if (!tw) return;
      const order = WS.TARGET_ORDER;
      const i = order.indexOf(tw.target || "first");
      tw.target = order[(i + 1) % order.length];
      this.refreshInspector();
      WSAudio.ui();
    }

    makeTower(id, c, r, level, spent, extra) {
      const def = WS.TOWERS[id];
      extra = extra || {};
      let pathL = extra.pathL;
      let pathR = extra.pathR;
      if (pathL == null) {
        const lv = Math.max(0, (level || 1) - 1);
        pathL = Math.min(lv, 2);
        pathR = 0;
      }
      pathL = pathL || 0;
      pathR = pathR || 0;
      return {
        id, c, r,
        pathL,
        pathR,
        level: 1 + pathL + pathR,
        spent: spent != null ? spent : def.cost,
        cd: 0,
        angle: 0,
        target: extra.target || "first"
      };
    }

    towerStats(tw) {
      const def = WS.TOWERS[tw.id];
      const l = tw.pathL || 0;
      const r = tw.pathR || 0;
      const dmg = def.dmg * (1 + 0.4 * l);
      let range = def.range * (1 + 0.15 * r);
      if (this.meters.aera >= 40) range *= 1.08;
      const cd = def.cd * Math.pow(0.91, l);
      let splash = def.splash ? def.splash * (1 + 0.16 * r) : 0;
      if (def.splash && this.meters.pyra >= 40) splash *= 1.15;
      let slow = def.slow ? def.slow * (1 + 0.08 * r) : 0;
      if (def.slow && this.meters.aqua >= 40) slow = Math.min(0.65, slow + 0.1);
      let poison = def.poison ? def.poison * (1 + 0.22 * r) : 0;
      if (def.poison && this.meters.vita >= 40) poison *= 1.25;
      const slowTime = def.slowTime ? def.slowTime * (1 + 0.12 * r) : 0;
      const poisonTime = def.poisonTime || 0;
      const armorPierce = (tw.id === "needle" && r >= 2) ? 0.45 : 0;
      return { dmg, range, cd, splash, slow, slowTime, poison, poisonTime, physical: !!def.physical, fire: !!def.fire, armorPierce };
    }

    placeTower(id, c, r) {
      const def = WS.TOWERS[id];
      if (!def) return;
      if (this.towerAt(c, r)) return;
      const tile = this.tileAt(c, r);
      if (!tile || tile.kind !== "build") return;
      if (this.spores < def.cost) {
        this.banner("Need " + def.cost + " spores", 1.1);
        return;
      }
      this.spores -= def.cost;
      this.towers.push(this.makeTower(id, c, r));
      WSAudio.place();
      this.burst((c + 0.5) * this.ts, (r + 0.5) * this.ts, def.color, 10);
      this.syncHUD();
      this.buildShop();
    }

    upgradePath(side) {
      const tw = this.selectedTower;
      if (!tw) return;
      const cur = side === "L" ? tw.pathL : tw.pathR;
      const next = cur + 1;
      if (!this.canUpgradePath(tw, side, next)) return;
      const def = WS.TOWERS[tw.id];
      const cost = upgradeCost(def.cost, next);
      if (this.spores < cost) return;
      this.spores -= cost;
      if (side === "L") tw.pathL = next;
      else tw.pathR = next;
      tw.level = 1 + tw.pathL + tw.pathR;
      tw.spent += cost;
      WSAudio.place();
      this.syncHUD();
      this.refreshInspector();
      this.buildShop();
    }

    sellSelected() {
      const tw = this.selectedTower;
      if (!tw) return;
      const back = Math.floor(tw.spent * WS.SELL_RATIO);
      this.spores += back;
      this.towers = this.towers.filter((t) => t !== tw);
      this.selectTower(null);
      WSAudio.ui();
      this.syncHUD();
      this.buildShop();
    }

    pickShop(id) {
      this.selectedShop = this.selectedShop === id ? null : id;
      this.selectTower(null);
      this.highlightShop();
      WSAudio.ui();
    }

    highlightShop() {
      document.querySelectorAll("#tower-cards .card").forEach((el) => {
        el.classList.toggle("selected", el.dataset.id === this.selectedShop);
      });
    }

    buildShop() {
      const towerWrap = $("tower-cards");
      towerWrap.innerHTML = "";
      Object.values(WS.TOWERS).forEach((def) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "card";
        b.dataset.id = def.id;
        b.disabled = this.spores < def.cost;
        b.setAttribute("aria-label", def.name + " " + def.cost + " spores");
        b.innerHTML =
          '<div class="portrait" style="--c1:' + def.color + ";--c2:" + def.color2 + '">' +
          portraitSVG(def.id, def) +
          '</div><div class="name">' + def.name + '</div><div class="cost">' + def.cost + "</div>";
        b.addEventListener("click", () => this.pickShop(def.id));
        towerWrap.appendChild(b);
      });
      this.highlightShop();

      const terra = $("terra-cards");
      terra.innerHTML = "";
      const items = [
        ["pyra", "pyra"], ["aera", "aera"], ["aqua", "aqua"], ["vita", "vita"], ["pulse", "pulse"]
      ];
      items.forEach(([id, cls]) => {
        const it = WS.TERRAFORM[id];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "card " + cls;
        const full = id === "pulse"
          ? this.minMeter() >= WS.METER_MAX
          : this.meters[id] >= WS.METER_MAX;
        b.disabled = !this.intermission || this.spores < it.cost || full;
        const amt = id === "pulse" ? "+12 all meters" : "+" + it.amount + " " + WS.METER_LABEL[id];
        b.innerHTML = '<div class="name">' + it.label + '</div><div class="blurb">' + amt + " · intermission</div><div class='cost'>" + it.cost + " spores</div>";
        b.addEventListener("click", () => this.buyTerra(id));
        terra.appendChild(b);
      });

      $("shop-title").textContent =
        "Intermission · " + WS.STAGE_NAMES[this.stage] +
        (this.waveIndex >= WS.WAVE_COUNT ? " · Finale" : " · next wave " + (this.waveIndex + 1));
      $("btn-wave").disabled = this.waveIndex >= WS.WAVE_COUNT;
      $("btn-wave").textContent = this.waveIndex >= WS.WAVE_COUNT ? "Complete" : "Next Wave";
    }

    buyTerra(id) {
      if (!this.intermission || this.ended) return;
      const it = WS.TERRAFORM[id];
      if (!it || this.spores < it.cost) return;
      if (id === "pulse") {
        if (this.minMeter() >= WS.METER_MAX) return;
        this.spores -= it.cost;
        WS.METERS.forEach((m) => {
          this.meters[m] = clamp(this.meters[m] + it.amount, 0, WS.METER_MAX);
        });
      } else {
        if (this.meters[id] >= WS.METER_MAX) return;
        this.spores -= it.cost;
        this.meters[id] = clamp(this.meters[id] + it.amount, 0, WS.METER_MAX);
      }
      WSAudio.place();
      this.maybeStageUp();
      this.syncHUD();
      this.buildShop();
    }

    maybeStageUp() {
      const next = this.computeStage();
      if (next > this.stage) {
        this.stage = next;
        this.spores += WS.STAGE_BONUS;
        WSAudio.stage();
        this.banner(WS.STAGE_NAMES[this.stage] + " · Vesna shifts", 2.4);
        this.flash = 0.55;
        this.shake = 10;
        this.towers = this.towers.filter((t) => {
          const tile = this.tileAt(t.c, t.r);
          if (tile && tile.kind === "build") return true;
          this.spores += Math.floor(t.spent * WS.SELL_RATIO);
          return false;
        });
        this.seedAmbience();
      }
    }

    openShop(open) {
      this.intermission = open;
      $("terra-panel").classList.toggle("open", open);
      $("btn-wave").hidden = !open;
      $("combat-status").classList.toggle("open", !open);
      if (open) {
        this.buildShop();
        this.save();
      }
    }

    startWave() {
      if (!this.intermission || this.ended) return;
      if (this.waveIndex >= WS.WAVE_COUNT) return;
      WSAudio.wave();
      this.selectTower(null);
      this.selectedShop = null;
      this.openShop(false);
      const spec = WS.WAVES[this.waveIndex];
      this.spawnQ = [];
      spec.packs.forEach((p, pi) => {
        for (let i = 0; i < p.n; i++) {
          this.spawnQ.push({ type: p.type, gap: i === 0 && pi > 0 ? 0.8 + p.gap : p.gap });
        }
      });
      this.spawnWait = 0.4;
      this.waveActive = true;
      $("combat-label").textContent = "Wave " + (this.waveIndex + 1) + " · " + spec.name;
      this.banner(spec.name, 1.6);
      this.syncHUD();
    }

    spawnOne(type) {
      const paths = this.paths();
      let path = paths[0];
      if (paths.length > 1) {
        this.spawnFlip = 1 - this.spawnFlip;
        path = paths[this.spawnFlip];
      }
      const def = WS.ENEMIES[type];
      const scale = hpScale(this.waveIndex);
      const e = {
        type,
        hp: def.hp * scale,
        max: def.hp * scale,
        speed: def.speed * (this.ts / 40),
        reward: def.reward,
        lives: def.lives,
        size: def.size,
        color: def.color,
        armor: def.armor || 0,
        boss: !!def.boss,
        path,
        seg: 0,
        t: 0,
        x: path[0].x,
        y: path[0].y,
        slowT: 0,
        slowMul: 1,
        poisonT: 0,
        poisonDps: 0,
        hitFlash: 0,
        bob: Math.random() * Math.PI * 2
      };
      this.enemies.push(e);
    }

    acquire(tw, stats) {
      const x = (tw.c + 0.5) * this.ts;
      const y = (tw.r + 0.5) * this.ts;
      const range = stats.range * this.ts;
      const mode = tw.target || "first";
      let best = null;
      let bestScore = (mode === "last" || mode === "close") ? Infinity : -1;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        const d = dist(x, y, e.x, e.y);
        if (d > range + e.size * this.ts) continue;
        let score;
        if (mode === "last") score = e.seg + e.t;
        else if (mode === "close") score = d;
        else if (mode === "strong") score = e.hp;
        else score = e.seg + e.t;
        const better = (mode === "last" || mode === "close") ? score < bestScore : score > bestScore;
        if (!best || better) {
          bestScore = score;
          best = e;
        }
      }
      return best;
    }

    fire(tw, target, stats) {
      const x = (tw.c + 0.5) * this.ts;
      const y = (tw.r + 0.5) * this.ts;
      tw.angle = Math.atan2(target.y - y, target.x - x);
      WSAudio.shoot(tw.id);
      this.bolts.push({
        id: tw.id,
        x, y,
        tx: target.x,
        ty: target.y,
        target,
        speed: (tw.id === "cinder" ? 280 : 520) * (this.ts / 40),
        stats,
        color: WS.TOWERS[tw.id].color2
      });
    }

    applyHit(e, stats, isSplash) {
      if (!e || e.hp <= 0) return;
      let dmg = stats.dmg;
      if (stats.physical && e.armor) {
        const armor = Math.max(0, e.armor * (1 - (stats.armorPierce || 0)));
        dmg *= 1 - armor;
      }
      e.hp -= dmg;
      e.hitFlash = 0.12;
      if (stats.slow && stats.slow > (1 - e.slowMul + 0.001)) {
        e.slowMul = 1 - stats.slow;
        e.slowT = stats.slowTime;
      } else if (stats.slow && e.slowT > 0) {
        e.slowT = Math.max(e.slowT, stats.slowTime);
      }
      if (stats.poison) {
        e.poisonDps = Math.max(e.poisonDps, stats.poison / stats.poisonTime);
        e.poisonT = Math.max(e.poisonT, stats.poisonTime);
      }
      if (!isSplash) WSAudio.hit();
      if (e.hp <= 0) this.kill(e);
    }

    splashHit(x, y, stats) {
      const r = (stats.splash || 0) * this.ts;
      this.burst(x, y, "#ffb070", 14);
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        if (dist(x, y, e.x, e.y) <= r + e.size * this.ts * 0.5) this.applyHit(e, stats, true);
      }
    }

    kill(e) {
      if (e._dead) return;
      e._dead = true;
      e.hp = 0;
      this.spores += e.reward;
      this.floater(e.x, e.y, "+" + e.reward, "#e8c86a");
      this.burst(e.x, e.y, e.color, e.boss ? 28 : 12);
      WSAudio.kill();
      this.syncHUD();
    }

    leak(e) {
      if (e._dead) return;
      e._dead = true;
      e.hp = 0;
      this.lives -= e.lives;
      this.flash = 0.35;
      this.shake = 12;
      WSAudio.hurt();
      this.banner("Seedcore struck −" + e.lives, 1.2);
      this.syncHUD();
      if (this.lives <= 0) this.defeat();
    }

    defeat() {
      this.ended = true;
      this.lives = 0;
      WSAudio.lose();
      try { localStorage.removeItem(WS.SAVE_KEY); } catch (e) {}
      this.refreshTitle();
      $("end-title").textContent = "Seedcore lost";
      $("end-body").textContent = "Vesna slides back into rime. Wave " + Math.min(this.waveIndex + 1, WS.WAVE_COUNT) + " of " + WS.WAVE_COUNT + " · " + WS.STAGE_NAMES[this.stage] + ".";
      $("end-ov").classList.add("open");
    }

    victory() {
      this.ended = true;
      WSAudio.win();
      try { localStorage.removeItem(WS.SAVE_KEY); } catch (e) {}
      this.refreshTitle();
      $("end-title").textContent = "Vesna lives";
      $("end-body").textContent =
        "The rift closes. Wildcanopy takes the old ice. You held the Seedcore through 10 waves — Pyra " +
        this.meters.pyra + " · Aera " + this.meters.aera + " · Aqua " + this.meters.aqua + " · Vita " + this.meters.vita + ".";
      $("end-ov").classList.add("open");
    }

    waveClear() {
      this.waveActive = false;
      const bonus = 18 + 6 * (this.waveIndex + 1);
      this.spores += bonus;
      this.floater(this.lw * 0.5, this.lh * 0.4, "Wave clear +" + bonus, "#e8c86a");
      this.waveIndex += 1;
      this.syncHUD();
      if (this.waveIndex >= WS.WAVE_COUNT) {
        this.banner("The world holds", 2.2);
        setTimeout(() => { if (!this.ended) this.victory(); }, 900);
        return;
      }
      this.banner("Intermission +" + bonus, 1.5);
      this.openShop(true);
    }

    banner(text, t) {
      this.bannerText = text;
      this.bannerT = t;
      const el = $("banner");
      el.textContent = text;
      el.classList.add("show");
    }

    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 20 + Math.random() * 80;
        this.fx.push({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.35 + Math.random() * 0.35,
          max: 0.5,
          size: 1.5 + Math.random() * 2.5,
          color
        });
      }
    }

    floater(x, y, text, color) {
      this.floaters.push({ x, y, text, color, life: 0.9 });
    }

    seedAmbience() {
      this.ambience = [];
      const n = 40;
      for (let i = 0; i < n; i++) {
        this.ambience.push({
          x: Math.random() * this.lw,
          y: Math.random() * this.lh,
          s: 0.4 + Math.random(),
          v: 8 + Math.random() * 18
        });
      }
    }

    palette() {
      const a = Math.floor(this.visualStage);
      const b = Math.min(a + 1, 3);
      const t = clamp(this.visualStage - a, 0, 1);
      const A = WS.PALETTES[a], B = WS.PALETTES[b];
      const out = {};
      Object.keys(A).forEach((k) => {
        if (typeof A[k] === "string" && A[k][0] === "#") out[k] = lerpHex(A[k], B[k] || A[k], t);
        else out[k] = t > 0.5 ? (B[k] ?? A[k]) : A[k];
      });
      return out;
    }

    syncHUD() {
      $("wave-num").textContent = Math.min(this.waveIndex + 1, WS.WAVE_COUNT) + " / " + WS.WAVE_COUNT;
      $("spore-num").textContent = String(this.spores | 0);
      $("life-num").textContent = String(Math.max(0, this.lives));
      const chip = $("stage-chip");
      if (chip) chip.textContent = WS.STAGE_NAMES[this.stage];
      WS.METERS.forEach((m) => {
        $(m + "-val").textContent = String(this.meters[m] | 0);
        $(m + "-fill").style.width = this.meters[m] + "%";
      });
      const left = this.enemies.filter((e) => !e._dead).length;
      const q = this.spawnQ.length;
      $("combat-counts").textContent = (left || q) ? (left + " on field · " + q + " inbound") : "";
      if (this.selectedTower) this.refreshInspector();
    }

    update(dt) {
      const vs = this.stage;
      this.visualStage = lerp(this.visualStage, vs, 1 - Math.pow(0.001, dt));
      if (this.bannerT > 0) {
        this.bannerT -= dt;
        if (this.bannerT <= 0) $("banner").classList.remove("show");
      }
      this.shake = Math.max(0, this.shake - dt * 18);
      this.flash = Math.max(0, this.flash - dt);

      if (this.ambience.length < 20) this.seedAmbience();
      const pal = this.palette();
      const drift = this.stage === 0 ? 1 : this.stage === 1 ? 0.4 : -0.3;
      this.ambience.forEach((p) => {
        p.y += (this.stage <= 1 ? p.v : -p.v * 0.5) * dt * drift;
        p.x += Math.sin(p.y * 0.02) * 6 * dt;
        if (p.y > this.lh + 6) p.y = -4;
        if (p.y < -6) p.y = this.lh + 4;
      });

      if (this.state !== "play" || this.paused || this.ended) return;

      if (!this.intermission) {
        this.spawnWait -= dt;
        while (this.spawnWait <= 0 && this.spawnQ.length) {
          const n = this.spawnQ.shift();
          this.spawnOne(n.type);
          this.spawnWait += n.gap || 0.5;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e._dead) {
            this.enemies.splice(i, 1);
            continue;
          }
          e.bob += dt * 6;
          e.hitFlash = Math.max(0, e.hitFlash - dt);
          if (e.slowT > 0) e.slowT -= dt;
          else e.slowMul = 1;
          if (e.poisonT > 0) {
            e.poisonT -= dt;
            e.hp -= e.poisonDps * dt;
            if (e.hp <= 0) this.kill(e);
          }
          if (e._dead) {
            this.enemies.splice(i, 1);
            continue;
          }
          let remaining = e.speed * e.slowMul * dt;
          while (remaining > 0 && e.seg < e.path.length - 1) {
            const a = e.path[e.seg];
            const b = e.path[e.seg + 1];
            const len = Math.max(0.001, dist(a.x, a.y, b.x, b.y));
            const left = (1 - e.t) * len;
            if (remaining < left) {
              e.t += remaining / len;
              remaining = 0;
            } else {
              remaining -= left;
              e.seg += 1;
              e.t = 0;
            }
          }
          if (e.seg >= e.path.length - 1) {
            this.leak(e);
            this.enemies.splice(i, 1);
            continue;
          }
          const a = e.path[e.seg];
          const b = e.path[e.seg + 1];
          e.x = lerp(a.x, b.x, e.t);
          e.y = lerp(a.y, b.y, e.t);
        }

        this.towers.forEach((tw) => {
          const st = this.towerStats(tw);
          tw.cd -= dt;
          const target = this.acquire(tw, st);
          if (target) tw.angle = Math.atan2(target.y - (tw.r + 0.5) * this.ts, target.x - (tw.c + 0.5) * this.ts);
          if (tw.cd <= 0 && target) {
            this.fire(tw, target, st);
            tw.cd = st.cd;
          }
        });

        for (let i = this.bolts.length - 1; i >= 0; i--) {
          const b = this.bolts[i];
          if (b.target && !b.target._dead) {
            b.tx = b.target.x;
            b.ty = b.target.y;
          }
          const d = dist(b.x, b.y, b.tx, b.ty);
          const step = b.speed * dt;
          if (d <= step || d < 4) {
            if (b.stats.splash) this.splashHit(b.tx, b.ty, b.stats);
            else if (b.target && !b.target._dead) this.applyHit(b.target, b.stats, false);
            else this.burst(b.tx, b.ty, b.color, 4);
            this.bolts.splice(i, 1);
          } else {
            b.x += ((b.tx - b.x) / d) * step;
            b.y += ((b.ty - b.y) / d) * step;
          }
        }

        if (this.waveActive && !this.spawnQ.length && !this.enemies.length && !this.ended) this.waveClear();
        this.hudAcc += dt;
        if (this.hudAcc > 0.12) { this.hudAcc = 0; this.syncHUD(); }
      }

      for (let i = this.fx.length - 1; i >= 0; i--) {
        const p = this.fx[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 30 * dt;
        if (p.life <= 0) this.fx.splice(i, 1);
      }
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.life -= dt;
        f.y -= 22 * dt;
        if (f.life <= 0) this.floaters.splice(i, 1);
      }
    }

    draw() {
      const ctx = this.ctx;
      const ts = this.ts;
      const pal = this.palette();
      ctx.save();
      if (this.shake > 0) {
        ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      }
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, this.lw, this.lh);

      const paths = pathSet(this.stage);
      for (let r = 0; r < WS.ROWS; r++) {
        for (let c = 0; c < WS.COLS; c++) {
          const x = c * ts, y = r * ts;
          const h = hash(c, r);
          const tile = this.tileAt(c, r);
          if (!tile) continue;
          if (tile.kind === "locked") {
            ctx.fillStyle = h > 0.5 ? pal.locked : lerpHex(pal.locked, pal.bg, 0.2);
            ctx.fillRect(x, y, ts, ts);
            ctx.strokeStyle = pal.lockedHi;
            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            ctx.moveTo(x + ts * 0.2, y + ts * 0.7);
            ctx.lineTo(x + ts * 0.5, y + ts * 0.25);
            ctx.lineTo(x + ts * 0.8, y + ts * 0.65);
            ctx.stroke();
            ctx.globalAlpha = 1;
            continue;
          }
          if (tile.kind === "path") {
            ctx.fillStyle = pal.path;
            ctx.fillRect(x, y, ts, ts);
            ctx.strokeStyle = pal.pathEdge;
            ctx.globalAlpha = 0.35;
            ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
            ctx.globalAlpha = 1;
            if (this.meters.aqua > 15) {
              ctx.globalAlpha = clamp(this.meters.aqua / 200, 0.05, 0.28);
              ctx.fillStyle = pal.water;
              ctx.fillRect(x + ts * 0.15, y + ts * 0.4, ts * 0.7, ts * 0.18);
              ctx.globalAlpha = 1;
            }
            continue;
          }
          if (tile.kind === "core") continue;
          const base = h > 0.5 ? pal.tile : pal.tileAlt;
          ctx.fillStyle = base;
          ctx.fillRect(x, y, ts, ts);
          if (this.stage >= 2 && pal.plant && h > 0.62) {
            ctx.fillStyle = pal.plant;
            ctx.globalAlpha = 0.45 + this.stage * 0.12;
            ctx.beginPath();
            ctx.arc(x + ts * 0.5, y + ts * 0.55, ts * 0.12 * this.stage, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          if (this.stage >= 3 && h > 0.8) {
            ctx.fillStyle = "#6ae08a";
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x + ts * 0.45, y + ts * 0.2, ts * 0.08, ts * 0.35);
            ctx.globalAlpha = 1;
          }
        }
      }

      ctx.strokeStyle = pal.fog;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      for (let x = 0; x <= WS.COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * ts + 0.5, 0);
        ctx.lineTo(x * ts + 0.5, this.lh);
        ctx.stroke();
      }
      for (let y = 0; y <= WS.ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * ts + 0.5);
        ctx.lineTo(this.lw, y * ts + 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      this.ambience.forEach((p) => {
        ctx.globalAlpha = 0.35 * p.s;
        ctx.fillStyle = this.stage === 0 ? "#d0e4f0" : this.stage === 1 ? "#e0a060" : "#c8f0b0";
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.stage === 0 ? 1.4 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      this.drawCore(pal);

      if (this.selectedShop && this.hover) {
        const t = this.tileAt(this.hover.c, this.hover.r);
        const st = WS.TOWERS[this.selectedShop];
        if (st) {
          const ok = t && t.kind === "build" && !this.towerAt(this.hover.c, this.hover.r);
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = ok ? "#80e0a0" : "#e07070";
          ctx.fillRect(this.hover.c * ts, this.hover.r * ts, ts, ts);
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = st.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc((this.hover.c + 0.5) * ts, (this.hover.r + 0.5) * ts, st.range * ts * (this.meters.aera >= 40 ? 1.08 : 1), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      this.towers.forEach((tw) => this.drawTower(tw, pal));
      this.enemies.forEach((e) => this.drawEnemy(e));
      this.bolts.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.id === "cinder" ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      this.fx.forEach((p) => {
        ctx.globalAlpha = clamp(p.life / 0.4, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
      });
      this.floaters.forEach((f) => {
        ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
        ctx.fillStyle = f.color;
        ctx.font = "700 " + Math.max(10, ts * 0.28) + "px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      });

      if (this.flash > 0) {
        ctx.globalAlpha = this.flash * 0.45;
        ctx.fillStyle = this.ended ? "#80f0a8" : "#e07070";
        if (this.bannerText && this.bannerText.indexOf("shifts") >= 0) ctx.fillStyle = "#f0e8c0";
        ctx.fillRect(0, 0, this.lw, this.lh);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    drawCore(pal) {
      const ts = this.ts;
      const x = (WS.CORE[0] + 0.5) * ts;
      const y = (WS.CORE[1] + 0.5) * ts;
      const pulse = 1 + Math.sin(now() / 420) * 0.06;
      const g = this.ctx.createRadialGradient(x, y, 4, x, y, ts * 0.9);
      g.addColorStop(0, pal.core);
      g.addColorStop(1, "rgba(0,0,0,0)");
      this.ctx.fillStyle = g;
      this.ctx.beginPath();
      this.ctx.arc(x, y, ts * 0.9 * pulse, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#1a1208";
      this.ctx.beginPath();
      this.ctx.ellipse(x, y + ts * 0.08, ts * 0.22, ts * 0.28, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#e8c86a";
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, ts * 0.16 * pulse, ts * 0.22 * pulse, 0, 0, Math.PI * 2);
      this.ctx.fill();
      const frac = clamp(this.lives / WS.START_LIVES, 0, 1);
      this.ctx.strokeStyle = frac > 0.4 ? "#80e0a0" : "#e07070";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, ts * 0.38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      this.ctx.stroke();
    }

    drawTower(tw, pal) {
      const ctx = this.ctx;
      const ts = this.ts;
      const x = (tw.c + 0.5) * ts;
      const y = (tw.r + 0.5) * ts;
      const def = WS.TOWERS[tw.id];
      if (this.selectedTower === tw) {
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, this.towerStats(tw).range * ts, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "#12181c";
      ctx.beginPath();
      ctx.arc(0, ts * 0.18, ts * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(tw.angle || 0);
      if (tw.id === "needle") {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.moveTo(ts * 0.38, 0);
        ctx.lineTo(-ts * 0.18, ts * 0.14);
        ctx.lineTo(-ts * 0.18, -ts * 0.14);
        ctx.closePath();
        ctx.fill();
      } else if (tw.id === "cinder") {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(0, 0, ts * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color2;
        ctx.beginPath();
        ctx.arc(0, 0, ts * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (tw.id === "rime") {
        ctx.fillStyle = def.color;
        for (let i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3);
          ctx.fillRect(0, -ts * 0.05, ts * 0.28, ts * 0.1);
        }
      } else {
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ts * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-ts * 0.18, 0);
        ctx.quadraticCurveTo(0, -ts * 0.28, ts * 0.22, -ts * 0.04);
        ctx.stroke();
      }
      ctx.restore();
      const l = tw.pathL || 0;
      const r = tw.pathR || 0;
      ctx.fillStyle = "#e8c86a";
      for (let i = 0; i < l; i++) {
        ctx.beginPath();
        ctx.arc(x - ts * 0.2 + i * ts * 0.14, y + ts * 0.32, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#80d0ff";
      for (let i = 0; i < r; i++) {
        ctx.beginPath();
        ctx.arc(x + ts * 0.08 + i * ts * 0.14, y + ts * 0.32, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawEnemy(e) {
      const ctx = this.ctx;
      const s = e.size * this.ts;
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(e.bob) * 1.2);
      if (e.hitFlash > 0) ctx.globalAlpha = 0.65;
      ctx.fillStyle = e.color;
      if (e.type === "shardmite") {
        ctx.rotate(e.bob * 0.4);
        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.lineTo(0, s * 0.7);
        ctx.lineTo(-s, 0);
        ctx.lineTo(0, -s * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === "carapace") {
        ctx.beginPath();
        ctx.arc(0, 0, s, Math.PI * 0.15, Math.PI - Math.PI * 0.15);
        ctx.lineTo(-s * 0.6, s * 0.2);
        ctx.lineTo(s * 0.6, s * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#3a3028";
        ctx.fillRect(-s * 0.5, -s * 0.15, s, s * 0.18);
      } else if (e.type === "hollow") {
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#c8a0e0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "bloomthief") {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9ad060";
        ctx.beginPath();
        ctx.ellipse(-s * 0.4, -s * 0.3, s * 0.35, s * 0.18, -0.6, 0, Math.PI * 2);
        ctx.ellipse(s * 0.4, -s * 0.3, s * 0.35, s * 0.18, 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#2a2018";
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * s * 0.4, s * 0.2);
          ctx.lineTo(i * s * 0.55, s * 0.55);
          ctx.stroke();
        }
      }
      ctx.restore();
      const bw = this.ts * 0.7;
      const bh = 3;
      ctx.fillStyle = "#1a1010";
      ctx.fillRect(e.x - bw / 2, e.y - s - 7, bw, bh);
      ctx.fillStyle = e.hp / e.max > 0.35 ? "#80e070" : "#e07070";
      ctx.fillRect(e.x - bw / 2, e.y - s - 7, bw * clamp(e.hp / e.max, 0, 1), bh);
      if (e.slowT > 0) {
        ctx.fillStyle = "#80d0ff";
        ctx.fillRect(e.x - 3, e.y + s + 2, 6, 2);
      }
      if (e.poisonT > 0) {
        ctx.fillStyle = "#70e070";
        ctx.fillRect(e.x + 4, e.y + s + 2, 6, 2);
      }
    }

    loop(t) {
      const raw = this.lastT ? (t - this.lastT) / 1000 : 0.016;
      this.lastT = t;
      const dt = clamp(raw, 0, 0.05) * (this.paused ? 0 : this.speed);
      const vis = clamp(raw, 0, 0.05);
      if (this.state === "play") this.update(this.paused ? vis * 0.15 : dt);
      if (this.state === "play") this.draw();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  window.addEventListener("load", () => {
    window.game = new Game();
  });
})();
