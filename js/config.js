/* Worldseed — tunables. Keep DESIGN.md in sync. */
(function (global) {
  const COLS = 18;
  const ROWS = 10;

  const PATH_A = [
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
    [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
    [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4]
  ];

  const PATH_A_LONG = [
    [0, 4], [1, 4], [2, 4], [3, 4],
    [3, 5], [3, 6], [3, 7],
    [4, 7], [5, 7], [6, 7], [7, 7],
    [7, 6], [7, 5], [7, 4], [7, 3], [7, 2],
    [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],
    [12, 3], [12, 4], [12, 5],
    [13, 5], [14, 5], [15, 5], [15, 4], [16, 4], [17, 4]
  ];

  const PATH_B = [
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
    [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2],
    [12, 3], [12, 4], [12, 5],
    [13, 5], [14, 5], [15, 5], [15, 4], [16, 4], [17, 4]
  ];

  const CFG = {
    COLS,
    ROWS,
    CORE: [17, 4],
    START_SPORES: 180,
    START_LIVES: 16,
    SELL_RATIO: 0.75,
    SAVE_KEY: "worldseed-save-v1",
    WAVE_COUNT: 10,
    STAGE_THRESHOLDS: [0, 20, 45, 70],
    STAGE_NAMES: ["Rimefield", "Cinderveil", "Thawsteppe", "Wildcanopy"],
    STAGE_BONUS: 40,
    METER_MAX: 100,
    METERS: ["pyra", "aera", "aqua", "vita"],
    METER_LABEL: { pyra: "Pyra", aera: "Aera", aqua: "Aqua", vita: "Vita" },
    TERRAFORM: {
      pyra: { cost: 35, amount: 20, label: "Pyra Flare" },
      aera: { cost: 35, amount: 20, label: "Aera Bellows" },
      aqua: { cost: 35, amount: 20, label: "Aqua Tap" },
      vita: { cost: 35, amount: 20, label: "Vita Spore" },
      pulse: { cost: 90, amount: 12, label: "Worldpulse" }
    },
    TARGET_ORDER: ["first", "last", "close", "strong"],
    TARGET_LABEL: { first: "First", last: "Last", close: "Close", strong: "Strong" },
    PATH_NAMES: { L: "Focus", R: "Reach" },
    PATHS: {
      needle: {
        L: [
          { name: "Honed", blurb: "+40% damage" },
          { name: "Rapid", blurb: "+40% dmg · faster" }
        ],
        R: [
          { name: "Longshot", blurb: "+15% range" },
          { name: "Skewer", blurb: "+15% range · cuts armor" }
        ]
      },
      cinder: {
        L: [
          { name: "Hotter", blurb: "+40% damage" },
          { name: "Inferno", blurb: "+40% dmg · faster" }
        ],
        R: [
          { name: "Bloom", blurb: "+ splash · range" },
          { name: "Magma", blurb: "Wider burst" }
        ]
      },
      rime: {
        L: [
          { name: "Colder", blurb: "+40% damage" },
          { name: "Shatter", blurb: "+40% dmg · faster" }
        ],
        R: [
          { name: "Drift", blurb: "Longer slow · range" },
          { name: "Deep chill", blurb: "Stronger slow" }
        ]
      },
      bramble: {
        L: [
          { name: "Thorns", blurb: "+40% damage" },
          { name: "Lash", blurb: "+40% dmg · faster" }
        ],
        R: [
          { name: "Venom", blurb: "+ poison · range" },
          { name: "Rootweb", blurb: "Heavier poison" }
        ]
      }
    },
    PATH_A,
    PATH_A_LONG,
    PATH_B,
    TOWERS: {
      needle: {
        id: "needle",
        name: "Needle",
        blurb: "Fast kinetic bolt. Cheap lane DPS.",
        cost: 45,
        dmg: 15,
        cd: 0.95,
        range: 2.5,
        color: "#7ec8e8",
        color2: "#c8f0ff",
        physical: true
      },
      cinder: {
        id: "cinder",
        name: "Cinder",
        blurb: "Magma splash. Shreds armor.",
        cost: 75,
        dmg: 11,
        cd: 1.35,
        range: 2.2,
        splash: 1.3,
        color: "#e87838",
        color2: "#ffc070",
        fire: true
      },
      rime: {
        id: "rime",
        name: "Rime",
        blurb: "Ice shard. Slows a column of fauna.",
        cost: 60,
        dmg: 7,
        cd: 0.9,
        range: 2.3,
        slow: 0.4,
        slowTime: 2,
        color: "#80d0ff",
        color2: "#e8f8ff",
        physical: true
      },
      bramble: {
        id: "bramble",
        name: "Bramble",
        blurb: "Thorns + poison. Melts high HP.",
        cost: 80,
        dmg: 5,
        cd: 0.7,
        range: 2.4,
        poison: 14,
        poisonTime: 3,
        color: "#5cbf6a",
        color2: "#c8f0a8"
      }
    },
    ENEMIES: {
      ashcrawler: {
        id: "ashcrawler",
        name: "Ashcrawler",
        hp: 38,
        speed: 40,
        reward: 7,
        lives: 1,
        size: 0.32,
        color: "#9a8874"
      },
      shardmite: {
        id: "shardmite",
        name: "Shardmite",
        hp: 22,
        speed: 78,
        reward: 6,
        lives: 1,
        size: 0.24,
        color: "#c8dce8"
      },
      carapace: {
        id: "carapace",
        name: "Carapace",
        hp: 100,
        speed: 26,
        reward: 14,
        lives: 1,
        size: 0.4,
        armor: 0.45,
        color: "#6a5040"
      },
      bloomthief: {
        id: "bloomthief",
        name: "Bloomthief",
        hp: 55,
        speed: 50,
        reward: 10,
        lives: 1,
        size: 0.34,
        color: "#6a8a48"
      },
      hollow: {
        id: "hollow",
        name: "Hollow Titan",
        hp: 480,
        speed: 20,
        reward: 45,
        lives: 3,
        size: 0.58,
        armor: 0.2,
        color: "#4a3060",
        boss: true
      }
    },
    WAVES: [
      {
        name: "Rime Drift",
        packs: [{ type: "ashcrawler", n: 8, gap: 0.75 }]
      },
      {
        name: "Shardwind",
        packs: [
          { type: "ashcrawler", n: 6, gap: 0.65 },
          { type: "shardmite", n: 8, gap: 0.4 }
        ]
      },
      {
        name: "Shell Line",
        packs: [
          { type: "ashcrawler", n: 8, gap: 0.6 },
          { type: "carapace", n: 5, gap: 0.9 }
        ]
      },
      {
        name: "Mixed Front",
        packs: [
          { type: "shardmite", n: 10, gap: 0.35 },
          { type: "ashcrawler", n: 6, gap: 0.55 },
          { type: "carapace", n: 3, gap: 0.85 }
        ]
      },
      {
        name: "First Hollow",
        packs: [
          { type: "ashcrawler", n: 8, gap: 0.55 },
          { type: "carapace", n: 4, gap: 0.8 },
          { type: "hollow", n: 1, gap: 1 }
        ]
      },
      {
        name: "Green Hunger",
        packs: [
          { type: "bloomthief", n: 10, gap: 0.5 },
          { type: "shardmite", n: 8, gap: 0.35 },
          { type: "carapace", n: 4, gap: 0.8 }
        ]
      },
      {
        name: "Pressure",
        packs: [
          { type: "ashcrawler", n: 10, gap: 0.45 },
          { type: "carapace", n: 8, gap: 0.7 },
          { type: "bloomthief", n: 8, gap: 0.5 }
        ]
      },
      {
        name: "Rift Tide",
        packs: [
          { type: "shardmite", n: 14, gap: 0.3 },
          { type: "carapace", n: 8, gap: 0.65 },
          { type: "bloomthief", n: 8, gap: 0.45 }
        ]
      },
      {
        name: "Canopy War",
        packs: [
          { type: "ashcrawler", n: 10, gap: 0.4 },
          { type: "bloomthief", n: 10, gap: 0.4 },
          { type: "carapace", n: 8, gap: 0.6 },
          { type: "shardmite", n: 8, gap: 0.3 }
        ]
      },
      {
        name: "Heart of Vesna",
        packs: [
          { type: "hollow", n: 2, gap: 2.2 },
          { type: "carapace", n: 12, gap: 0.55 },
          { type: "bloomthief", n: 10, gap: 0.4 },
          { type: "shardmite", n: 10, gap: 0.28 }
        ]
      }
    ],
    PALETTES: [
      {
        bg: "#0b1218",
        tile: "#1a2834",
        tileAlt: "#15222c",
        locked: "#3d5164",
        lockedHi: "#8eb0c8",
        path: "#5c7080",
        pathEdge: "#a8c0d0",
        core: "#7ec8e8",
        fog: "rgba(180,210,230,0.18)",
        plant: null,
        water: "#3a5a70"
      },
      {
        bg: "#160e0a",
        tile: "#2a1c14",
        tileAlt: "#241610",
        locked: "#4a3228",
        lockedHi: "#c08050",
        path: "#6a4a38",
        pathEdge: "#b08060",
        core: "#e87838",
        fog: "rgba(220,150,80,0.14)",
        plant: "#4a3a18",
        water: "#3a4450"
      },
      {
        bg: "#10160e",
        tile: "#283420",
        tileAlt: "#222e1c",
        locked: "#1c2818",
        lockedHi: "#80a060",
        path: "#5a4e38",
        pathEdge: "#8a7a50",
        core: "#80c060",
        fog: "rgba(160,200,120,0.12)",
        plant: "#3a6a34",
        water: "#2e6a78"
      },
      {
        bg: "#0a1610",
        tile: "#1c3c26",
        tileAlt: "#164020",
        locked: "#0c2414",
        lockedHi: "#60e090",
        path: "#3a5830",
        pathEdge: "#70a050",
        core: "#90f0a8",
        fog: "rgba(120,230,160,0.12)",
        plant: "#2a9a48",
        water: "#2a88a8"
      }
    ]
  };

  function tileStageReq(c, r) {
    if (c === CFG.CORE[0] && r === CFG.CORE[1]) return 0;
    if (r <= 0 || r >= 9) return 3;
    if (r === 1 || r === 8) return 2;
    if (r === 2 || r === 7) return 1;
    return 0;
  }

  CFG.tileStageReq = tileStageReq;

  global.WS = CFG;
})(window);
