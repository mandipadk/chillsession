import * as Phaser from "phaser";
import { WORLD_CONFIG, GAME_TABLES } from "@chillspace/protocol";

const TILE = WORLD_CONFIG.tileSize;
const W = WORLD_CONFIG.widthTiles;
const H = WORLD_CONFIG.heightTiles;

const COLORS = {
  floorLight: 0x8b7355,
  floorDark: 0x7a6548,
  wallTop: 0x5c4a3a,
  wallFace: 0x4a3b2e,
  wallTrim: 0x6b5744,
  carpet: 0x6b4c5e,
  carpetEdge: 0x5a3e50,
  rug: 0x7c5a3a,
  rugEdge: 0x6a4c30,
  windowFrame: 0x5c4a3a,
  windowGlass: 0x1a2744,
  windowGlow: 0x2a3a5e,
  starColor: 0xffe8b0,
  bookshelfWood: 0x5a4230,
  bookRed: 0xb04040,
  bookBlue: 0x4060a0,
  bookGreen: 0x408060,
  bookYellow: 0xc0a040,
  plantPot: 0x8b5e3c,
  plantLeaf: 0x4a8a4a,
  plantLeafDark: 0x3a6a3a,
  deskWood: 0x7a6040,
  deskTop: 0x8a7050,
  lampPost: 0x6a5a4a,
  lampShade: 0xe8c878,
  lampGlow: 0xfff0c0,
  tableTop: 0x5a7a5a,
  tableLeg: 0x4a3a2e,
  cushionA: 0x8060a0,
  cushionB: 0xa06060,
  catBody: 0x808080,
  catEar: 0x606060,
} as const;

export function generateWorldTextures(scene: Phaser.Scene): void {
  drawFloorTile(scene, "tile_floor_light", COLORS.floorLight, 0x82694f);
  drawFloorTile(scene, "tile_floor_dark", COLORS.floorDark, 0x72603e);
  drawWallTile(scene, "tile_wall");
  drawWindowTile(scene, "tile_window");
  drawBookshelfTile(scene, "tile_bookshelf");
  drawPlantTile(scene, "tile_plant");
  drawDeskTile(scene, "tile_desk");
  drawLampTile(scene, "tile_lamp");
  drawGameTableTile(scene, "tile_game_table");
  drawRugTile(scene, "tile_rug");
  drawCatTile(scene, "tile_cat");
  drawCushionTile(scene, "tile_cushion_a", COLORS.cushionA);
  drawCushionTile(scene, "tile_cushion_b", COLORS.cushionB);
}

function drawFloorTile(scene: Phaser.Scene, key: string, baseColor: number, grainColor: number): void {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, TILE, TILE);

  ctx.fillStyle = `#${grainColor.toString(16).padStart(6, "0")}`;
  const grainPositions = [
    [2, 4], [8, 2], [14, 6], [20, 12], [6, 18], [24, 8], [28, 20],
    [10, 26], [16, 14], [22, 22], [4, 10], [18, 28], [26, 4]
  ];
  for (const [x, y] of grainPositions) {
    if (x! < TILE && y! < TILE) {
      ctx.fillRect(x!, y!, 1, 1);
    }
  }

  ctx.strokeStyle = `rgba(0,0,0,0.08)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, TILE, TILE);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawWallTile(scene: Phaser.Scene, key: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.wallFace.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, TILE, TILE);

  ctx.fillStyle = `#${COLORS.wallTop.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, TILE, 8);

  ctx.fillStyle = `#${COLORS.wallTrim.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, TILE - 3, TILE, 3);

  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.fillRect(TILE / 2 - 1, 0, 1, TILE);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawWindowTile(scene: Phaser.Scene, key: string): void {
  const w = TILE * 2;
  const h = TILE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.wallFace.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = `#${COLORS.windowFrame.toString(16).padStart(6, "0")}`;
  ctx.fillRect(6, 4, w - 12, h - 12);

  ctx.fillStyle = `#${COLORS.windowGlass.toString(16).padStart(6, "0")}`;
  ctx.fillRect(10, 8, w - 20, h - 20);

  const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  grad.addColorStop(0, "rgba(60,80,140,0.3)");
  grad.addColorStop(1, "rgba(20,30,60,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(10, 8, w - 20, h - 20);

  ctx.fillStyle = `#${COLORS.starColor.toString(16).padStart(6, "0")}`;
  const stars = [[18, 14], [30, 20], [42, 12], [24, 30], [50, 26], [36, 38], [14, 36]];
  for (const [sx, sy] of stars) {
    if (sx! < w - 10 && sy! < h - 12) {
      ctx.fillRect(sx!, sy!, 2, 2);
    }
  }

  ctx.fillStyle = `#${COLORS.windowFrame.toString(16).padStart(6, "0")}`;
  ctx.fillRect(w / 2 - 1, 8, 2, h - 20);
  ctx.fillRect(10, h / 2 - 1, w - 20, 2);

  ctx.fillStyle = `#${COLORS.wallTrim.toString(16).padStart(6, "0")}`;
  ctx.fillRect(4, h - 6, w - 8, 4);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawBookshelfTile(scene: Phaser.Scene, key: string): void {
  const w = TILE * 2;
  const h = TILE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.bookshelfWood.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = `rgba(0,0,0,0.15)`;
  ctx.fillRect(2, 0, 2, h);
  ctx.fillRect(w - 4, 0, 2, h);

  const shelfY = [16, 36];
  ctx.fillStyle = `rgba(0,0,0,0.2)`;
  for (const sy of shelfY) {
    ctx.fillRect(2, sy, w - 4, 3);
  }

  const bookColors = [COLORS.bookRed, COLORS.bookBlue, COLORS.bookGreen, COLORS.bookYellow, COLORS.bookRed, COLORS.bookBlue];
  let bx = 6;
  for (let row = 0; row < 3; row++) {
    const rowY = row === 0 ? 3 : row === 1 ? 20 : 40;
    const rowH = row === 2 ? 20 : 12;
    bx = 6;
    for (let i = 0; i < 6 && bx < w - 8; i++) {
      const bw = 5 + (i % 3);
      ctx.fillStyle = `#${bookColors[(i + row * 2) % bookColors.length]!.toString(16).padStart(6, "0")}`;
      ctx.fillRect(bx, rowY, bw, rowH);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(bx + 1, rowY + 1, bw - 2, 1);
      bx += bw + 2;
    }
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawPlantTile(scene: Phaser.Scene, key: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.plantPot.toString(16).padStart(6, "0")}`;
  ctx.fillRect(10, 20, 12, 12);
  ctx.fillRect(8, 18, 16, 4);

  const leaves = [
    [14, 10, 6, 4], [10, 6, 5, 5], [18, 8, 5, 4],
    [12, 14, 4, 6], [16, 12, 5, 5], [8, 12, 4, 5],
  ];
  for (const [lx, ly, lw, lh] of leaves) {
    ctx.fillStyle = `#${(Math.random() > 0.5 ? COLORS.plantLeaf : COLORS.plantLeafDark).toString(16).padStart(6, "0")}`;
    ctx.fillRect(lx!, ly!, lw!, lh!);
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawDeskTile(scene: Phaser.Scene, key: string): void {
  const w = TILE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.deskTop.toString(16).padStart(6, "0")}`;
  ctx.fillRect(2, 4, w - 4, 8);

  ctx.fillStyle = `#${COLORS.deskWood.toString(16).padStart(6, "0")}`;
  ctx.fillRect(4, 12, 4, 18);
  ctx.fillRect(w - 8, 12, 4, 18);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(4, 4, w - 8, 2);

  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(2, 12, w - 4, 2);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawLampTile(scene: Phaser.Scene, key: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE * 2;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.lampPost.toString(16).padStart(6, "0")}`;
  ctx.fillRect(14, 16, 4, 40);
  ctx.fillRect(10, 54, 12, 4);

  ctx.fillStyle = `#${COLORS.lampShade.toString(16).padStart(6, "0")}`;
  ctx.fillRect(6, 4, 20, 14);

  const glow = ctx.createRadialGradient(16, 20, 2, 16, 24, 24);
  glow.addColorStop(0, "rgba(255,240,180,0.3)");
  glow.addColorStop(1, "rgba(255,240,180,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, TILE, TILE * 2);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawGameTableTile(scene: Phaser.Scene, key: string): void {
  const w = TILE * 2;
  const h = TILE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.tableTop.toString(16).padStart(6, "0")}`;
  ctx.fillRect(4, 8, w - 8, h - 24);

  ctx.fillStyle = `#${COLORS.tableLeg.toString(16).padStart(6, "0")}`;
  ctx.fillRect(6, h - 16, 4, 14);
  ctx.fillRect(w - 10, h - 16, 4, 14);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(6, 8, w - 12, 2);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 14, w - 20, h - 36);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawRugTile(scene: Phaser.Scene, key: string): void {
  const w = TILE * 4;
  const h = TILE * 3;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.rugEdge.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = `#${COLORS.rug.toString(16).padStart(6, "0")}`;
  ctx.fillRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = `#${COLORS.carpet.toString(16).padStart(6, "0")}`;
  ctx.fillRect(12, 12, w - 24, h - 24);

  ctx.fillStyle = `#${COLORS.carpetEdge.toString(16).padStart(6, "0")}`;
  for (let x = 16; x < w - 16; x += 8) {
    ctx.fillRect(x, 8, 4, 2);
    ctx.fillRect(x, h - 10, 4, 2);
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawCatTile(scene: Phaser.Scene, key: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${COLORS.catBody.toString(16).padStart(6, "0")}`;
  ctx.fillRect(8, 14, 16, 10);
  ctx.fillRect(6, 12, 6, 8);

  ctx.fillStyle = `#${COLORS.catEar.toString(16).padStart(6, "0")}`;
  ctx.fillRect(6, 10, 3, 3);
  ctx.fillRect(11, 10, 3, 3);

  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(8, 15, 2, 2);
  ctx.fillRect(12, 15, 2, 2);

  ctx.fillStyle = "#ffaaaa";
  ctx.fillRect(10, 17, 2, 1);

  ctx.fillStyle = `#${COLORS.catBody.toString(16).padStart(6, "0")}`;
  ctx.fillRect(22, 18, 6, 3);
  ctx.fillRect(26, 16, 3, 2);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawCushionTile(scene: Phaser.Scene, key: string, color: number): void {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(6, 10, 20, 14);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(8, 10, 16, 2);

  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(6, 22, 20, 2);

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

interface FurnitureItem {
  tileX: number;
  tileY: number;
  textureKey: string;
  widthTiles: number;
  heightTiles: number;
  depth: number;
}

export function buildRoomLayout(): FurnitureItem[] {
  const items: FurnitureItem[] = [];

  items.push({ tileX: 10, tileY: 1, textureKey: "tile_window", widthTiles: 2, heightTiles: 2, depth: 0 });
  items.push({ tileX: 20, tileY: 1, textureKey: "tile_window", widthTiles: 2, heightTiles: 2, depth: 0 });
  items.push({ tileX: 35, tileY: 1, textureKey: "tile_window", widthTiles: 2, heightTiles: 2, depth: 0 });
  items.push({ tileX: 48, tileY: 1, textureKey: "tile_window", widthTiles: 2, heightTiles: 2, depth: 0 });

  items.push({ tileX: 2, tileY: 4, textureKey: "tile_bookshelf", widthTiles: 2, heightTiles: 2, depth: 1 });
  items.push({ tileX: 56, tileY: 4, textureKey: "tile_bookshelf", widthTiles: 2, heightTiles: 2, depth: 1 });

  items.push({ tileX: 1, tileY: 10, textureKey: "tile_plant", widthTiles: 1, heightTiles: 1, depth: 2 });
  items.push({ tileX: 58, tileY: 8, textureKey: "tile_plant", widthTiles: 1, heightTiles: 1, depth: 2 });
  items.push({ tileX: 30, tileY: 2, textureKey: "tile_plant", widthTiles: 1, heightTiles: 1, depth: 2 });
  items.push({ tileX: 45, tileY: 36, textureKey: "tile_plant", widthTiles: 1, heightTiles: 1, depth: 2 });

  items.push({ tileX: 5, tileY: 7, textureKey: "tile_desk", widthTiles: 2, heightTiles: 1, depth: 3 });
  items.push({ tileX: 50, tileY: 7, textureKey: "tile_desk", widthTiles: 2, heightTiles: 1, depth: 3 });

  items.push({ tileX: 1, tileY: 14, textureKey: "tile_lamp", widthTiles: 1, heightTiles: 2, depth: 4 });
  items.push({ tileX: 58, tileY: 14, textureKey: "tile_lamp", widthTiles: 1, heightTiles: 2, depth: 4 });
  items.push({ tileX: 30, tileY: 30, textureKey: "tile_lamp", widthTiles: 1, heightTiles: 2, depth: 4 });

  items.push({ tileX: 15, tileY: 15, textureKey: "tile_rug", widthTiles: 4, heightTiles: 3, depth: -1 });
  items.push({ tileX: 38, tileY: 22, textureKey: "tile_rug", widthTiles: 4, heightTiles: 3, depth: -1 });

  items.push({ tileX: 25, tileY: 28, textureKey: "tile_cat", widthTiles: 1, heightTiles: 1, depth: 5 });

  items.push({ tileX: 8, tileY: 20, textureKey: "tile_cushion_a", widthTiles: 1, heightTiles: 1, depth: 2 });
  items.push({ tileX: 52, tileY: 25, textureKey: "tile_cushion_b", widthTiles: 1, heightTiles: 1, depth: 2 });
  items.push({ tileX: 18, tileY: 32, textureKey: "tile_cushion_a", widthTiles: 1, heightTiles: 1, depth: 2 });

  for (const table of GAME_TABLES) {
    items.push({
      tileX: table.x - 1,
      tileY: table.y - 1,
      textureKey: "tile_game_table",
      widthTiles: 2,
      heightTiles: 2,
      depth: 3,
    });
  }

  return items;
}

export function renderWorld(scene: Phaser.Scene): void {
  const worldWidth = W * TILE;
  const worldHeight = H * TILE;

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      if (ty < 3) {
        scene.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, "tile_wall").setDepth(-10);
      } else {
        const tileKey = (tx + ty) % 2 === 0 ? "tile_floor_light" : "tile_floor_dark";
        scene.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, tileKey).setDepth(-10);
      }
    }
  }

  const layout = buildRoomLayout();
  for (const item of layout) {
    const x = item.tileX * TILE + (item.widthTiles * TILE) / 2;
    const y = item.tileY * TILE + (item.heightTiles * TILE) / 2;
    scene.add.image(x, y, item.textureKey).setDepth(item.depth);
  }

  const labels: Array<{ tableId: string; kind: string; x: number; y: number }> = GAME_TABLES.map((t) => ({
    tableId: t.tableId,
    kind: t.kind,
    x: t.x * TILE,
    y: t.y * TILE,
  }));

  for (const label of labels) {
    const kindLabel = label.kind === "ttt" ? "TIC-TAC-TOE" : label.kind.toUpperCase();
    scene.add
      .text(label.x, label.y - TILE - 4, kindLabel, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#ffe8b0",
        stroke: "#2a1e14",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(10);
  }

  const vignette = scene.add.graphics();
  vignette.setScrollFactor(0);
  vignette.setDepth(100);

  const vignetteCanvas = document.createElement("canvas");
  vignetteCanvas.width = 960;
  vignetteCanvas.height = 640;
  const vCtx = vignetteCanvas.getContext("2d")!;
  const vGrad = vCtx.createRadialGradient(480, 320, 200, 480, 320, 520);
  vGrad.addColorStop(0, "rgba(0,0,0,0)");
  vGrad.addColorStop(1, "rgba(0,0,0,0.3)");
  vCtx.fillStyle = vGrad;
  vCtx.fillRect(0, 0, 960, 640);

  if (scene.textures.exists("vignette_overlay")) scene.textures.remove("vignette_overlay");
  scene.textures.addCanvas("vignette_overlay", vignetteCanvas);
  scene.add.image(480, 320, "vignette_overlay").setScrollFactor(0).setDepth(100).setAlpha(0.6);
}
