import * as Phaser from "phaser";
import { WORLD_CONFIG, GAME_TABLES } from "@chillspace/protocol";

const TILE = WORLD_CONFIG.tileSize;
const W = WORLD_CONFIG.widthTiles;
const H = WORLD_CONFIG.heightTiles;

const PAL = {
  floorBase: "#8B6E4E",
  floorDark: "#7A5F42",
  floorGrain: "#6E5538",
  floorHighlight: "#9B7E5E",
  wallUpper: "#C4A882",
  wallLower: "#A08060",
  wallTrim: "#6E5538",
  wallMolding: "#D4B892",
  ceilingDark: "#5A4630",
  fireplaceStone: "#6B5B4B",
  fireplaceBrick: "#8B4513",
  fireplaceMantle: "#5A4A3A",
  fireOrange: "#FF6600",
  fireYellow: "#FFD700",
  fireRed: "#CC3300",
  couchRed: "#8B3A3A",
  couchRedLight: "#A04848",
  couchRedDark: "#6E2E2E",
  couchCushion: "#9B4A4A",
  armchairBrown: "#7A5A3A",
  armchairLight: "#8A6A4A",
  rugRed: "#8B2020",
  rugRedDark: "#6B1818",
  rugGreen: "#4A6A4A",
  rugGreenDark: "#3A5A3A",
  rugGreenLight: "#5A7A5A",
  rugPattern: "#DAC090",
  coffeeTable: "#5A4A3A",
  coffeeTableTop: "#6A5A4A",
  bookshelfWood: "#5A4230",
  bookshelfDark: "#4A3520",
  bookRed: "#A03030",
  bookBlue: "#3050A0",
  bookGreen: "#308040",
  bookYellow: "#C0A030",
  bookPurple: "#6040A0",
  bookOrange: "#C06020",
  plantGreen: "#4A8A4A",
  plantDark: "#3A6A3A",
  plantLight: "#5AAA5A",
  potBrown: "#7A5A3A",
  potDark: "#5A4020",
  windowFrame: "#5A4A3A",
  windowGlass: "#1A2744",
  curtainRed: "#8B2020",
  curtainRedDark: "#6B1818",
  starYellow: "#FFE8B0",
  stringLightWire: "#5A4A3A",
  stringLightBulb: "#FFE8A0",
  stringLightGlow: "#FFF0C0",
  clockFace: "#E8D8C0",
  clockFrame: "#5A4A3A",
  pictureFrame: "#5A4A3A",
  pictureCanvas: "#7AAA7A",
  candleWax: "#E8D8B0",
  candleFlame: "#FFD700",
  mugWhite: "#E8E0D8",
  mugBrown: "#6A4A2A",
  recordPlayer: "#4A3A2A",
  vinylBlack: "#2A2020",
  speakerBlack: "#3A3030",
  lampShade: "#E8C878",
  lampPole: "#6A5A4A",
  tvScreen: "#2A3040",
  tvFrame: "#3A3030",
  matRed: "#A03030",
} as const;

function hex(color: string): string { return color; }
function hexNum(color: string): number { return Number.parseInt(color.replace("#", ""), 16); }

function drawWoodPlankFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = PAL.floorBase;
  ctx.fillRect(x, y, w, h);
  const plankH = 8;
  for (let py = y; py < y + h; py += plankH) {
    const offset = ((py / plankH) % 2) * 16;
    ctx.fillStyle = ((py / plankH) % 2 === 0) ? PAL.floorDark : PAL.floorBase;
    ctx.fillRect(x, py, w, plankH);
    ctx.fillStyle = PAL.floorGrain;
    for (let px = x + offset; px < x + w; px += 32) {
      ctx.fillRect(px, py, 1, plankH);
    }
    ctx.fillStyle = PAL.floorHighlight;
    ctx.fillRect(x, py, w, 1);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(x, py + plankH - 1, w, 1);
    for (let gx = x + 3 + ((py * 7) % 11); gx < x + w; gx += 14 + ((py * 3) % 7)) {
      ctx.fillStyle = PAL.floorGrain;
      ctx.fillRect(gx, py + 2, 1, 1);
      ctx.fillRect(gx + 5, py + 5, 1, 1);
    }
  }
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = PAL.wallUpper;
  ctx.fillRect(x, y, w, h * 0.6);
  ctx.fillStyle = PAL.wallLower;
  ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
  ctx.fillStyle = PAL.wallMolding;
  ctx.fillRect(x, y + h * 0.58, w, 3);
  ctx.fillStyle = PAL.wallTrim;
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = "rgba(0,0,0,0.03)";
  for (let vy = y; vy < y + h; vy += 16) {
    ctx.fillRect(x, vy, w, 1);
  }
}

function drawFireplace(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
  const fw = 128;
  const fh = 96;
  const fx = cx - fw / 2;
  ctx.fillStyle = PAL.fireplaceStone;
  ctx.fillRect(fx, y, fw, fh);
  ctx.fillStyle = PAL.fireplaceMantle;
  ctx.fillRect(fx - 8, y, fw + 16, 10);
  ctx.fillRect(fx - 4, y + 10, fw + 8, 4);
  ctx.fillStyle = PAL.fireplaceBrick;
  ctx.fillRect(fx + 16, y + 22, fw - 32, fh - 26);
  ctx.fillStyle = "#1A1008";
  ctx.fillRect(fx + 24, y + 32, fw - 48, fh - 36);
  ctx.fillStyle = PAL.fireOrange;
  ctx.fillRect(fx + 34, y + 56, 20, 20);
  ctx.fillRect(fx + 58, y + 52, 16, 24);
  ctx.fillRect(fx + 78, y + 58, 14, 18);
  ctx.fillStyle = PAL.fireYellow;
  ctx.fillRect(fx + 38, y + 50, 12, 14);
  ctx.fillRect(fx + 62, y + 46, 8, 16);
  ctx.fillRect(fx + 80, y + 54, 8, 10);
  ctx.fillStyle = PAL.fireRed;
  ctx.fillRect(fx + 30, y + 70, fw - 60, 6);
  ctx.fillStyle = "rgba(255,160,60,0.15)";
  ctx.fillRect(fx - 40, y + 20, fw + 80, fh + 40);
  ctx.fillStyle = PAL.fireplaceStone;
  ctx.fillRect(fx + 8, y + fh - 4, fw - 16, 6);
  ctx.fillStyle = PAL.fireplaceMantle;
  ctx.fillRect(fx + 30, y + 6, 12, 14);
  ctx.fillRect(fx + fw - 42, y + 6, 12, 14);
  ctx.fillStyle = PAL.candleWax;
  ctx.fillRect(fx + 33, y + 2, 6, 6);
  ctx.fillRect(fx + fw - 39, y + 2, 6, 6);
  ctx.fillStyle = PAL.candleFlame;
  ctx.fillRect(fx + 35, y - 2, 2, 4);
  ctx.fillRect(fx + fw - 37, y - 2, 2, 4);
}

function drawCouch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, facing: "up" | "down"): void {
  const h = 40;
  ctx.fillStyle = PAL.couchRedDark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.couchRed;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
  if (facing === "up") {
    ctx.fillStyle = PAL.couchRedDark;
    ctx.fillRect(x, y + h - 10, w, 10);
  } else {
    ctx.fillStyle = PAL.couchRedDark;
    ctx.fillRect(x, y, w, 10);
  }
  ctx.fillStyle = PAL.couchCushion;
  const cushionW = (w - 12) / 3;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 4 + i * (cushionW + 2), y + 10, cushionW, h - 22);
  }
  ctx.fillStyle = PAL.couchRedLight;
  ctx.fillRect(x + 4, y + 10, w - 8, 2);
  ctx.fillStyle = PAL.couchRedDark;
  ctx.fillRect(x, y, 6, h);
  ctx.fillRect(x + w - 6, y, 6, h);
}

function drawArmchair(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const w = 40;
  const h = 36;
  ctx.fillStyle = PAL.couchRedDark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.couchRed;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = PAL.couchCushion;
  ctx.fillRect(x + 6, y + 8, w - 12, h - 16);
  ctx.fillStyle = PAL.couchRedDark;
  ctx.fillRect(x, y, 8, h);
  ctx.fillRect(x + w - 8, y, 8, h);
  ctx.fillStyle = PAL.couchRedLight;
  ctx.fillRect(x + 6, y + 8, w - 12, 2);
}

function drawCoffeeTable(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const h = 24;
  ctx.fillStyle = PAL.coffeeTable;
  ctx.fillRect(x + 4, y + h - 8, 4, 8);
  ctx.fillRect(x + w - 8, y + h - 8, 4, 8);
  ctx.fillStyle = PAL.coffeeTableTop;
  ctx.fillRect(x, y, w, h - 6);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 2, y, w - 4, 2);
  ctx.fillStyle = PAL.mugWhite;
  ctx.fillRect(x + 8, y + 2, 8, 8);
  ctx.fillRect(x + w - 20, y + 4, 8, 6);
  ctx.fillStyle = PAL.mugBrown;
  ctx.fillRect(x + 10, y + 3, 4, 2);
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = PAL.bookshelfWood;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.bookshelfDark;
  ctx.fillRect(x + 2, y, 2, h);
  ctx.fillRect(x + w - 4, y, 2, h);
  const shelfCount = 4;
  const shelfGap = (h - 8) / shelfCount;
  const colors = [PAL.bookRed, PAL.bookBlue, PAL.bookGreen, PAL.bookYellow, PAL.bookPurple, PAL.bookOrange];
  for (let s = 0; s < shelfCount; s++) {
    const sy = y + 4 + s * shelfGap;
    ctx.fillStyle = PAL.bookshelfDark;
    ctx.fillRect(x + 4, sy + shelfGap - 3, w - 8, 3);
    let bx = x + 6;
    for (let b = 0; b < 8 && bx < x + w - 8; b++) {
      const bw = 4 + (b % 3) * 2;
      const bh = shelfGap - 8 + (b % 2) * 3;
      ctx.fillStyle = colors[(b + s * 3) % colors.length]!;
      ctx.fillRect(bx, sy + (shelfGap - 3 - bh), bw, bh);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(bx + 1, sy + (shelfGap - 3 - bh), bw - 2, 1);
      bx += bw + 1;
    }
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = PAL.windowFrame;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.windowGlass;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w / 2);
  grad.addColorStop(0, "rgba(40,60,120,0.3)");
  grad.addColorStop(1, "rgba(15,20,40,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = PAL.starYellow;
  const stars = [[8, 8], [20, 14], [36, 10], [14, 24], [30, 20], [42, 28], [10, 34]];
  for (const [sx, sy] of stars) {
    if (x + sx! < x + w - 6 && y + sy! < y + h - 6) {
      ctx.fillRect(x + sx!, y + sy!, 2, 2);
    }
  }
  ctx.fillStyle = PAL.windowFrame;
  ctx.fillRect(x + w / 2 - 1, y + 4, 2, h - 8);
  ctx.fillRect(x + 4, y + h / 2 - 1, w - 8, 2);
  ctx.fillStyle = PAL.curtainRed;
  ctx.fillRect(x - 6, y - 4, 14, h + 8);
  ctx.fillRect(x + w - 8, y - 4, 14, h + 8);
  ctx.fillStyle = PAL.curtainRedDark;
  for (let cy = y - 4; cy < y + h + 4; cy += 6) {
    ctx.fillRect(x - 4, cy, 2, 3);
    ctx.fillRect(x + w - 4, cy, 2, 3);
  }
  ctx.fillStyle = PAL.windowFrame;
  ctx.fillRect(x - 8, y - 6, w + 16, 4);
}

function drawRoundRug(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        if (dist > r - 3) ctx.fillStyle = PAL.rugRedDark;
        else if (dist > r - 8) ctx.fillStyle = PAL.rugRed;
        else if (dist > r - 12) ctx.fillStyle = PAL.rugRedDark;
        else ctx.fillStyle = PAL.rugRed;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function drawRectRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = PAL.rugGreenDark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.rugGreen;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = PAL.rugGreenLight;
  ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
  ctx.fillStyle = PAL.rugPattern;
  ctx.fillRect(x + 6, y + 6, w - 12, 2);
  ctx.fillRect(x + 6, y + h - 8, w - 12, 2);
  ctx.fillRect(x + 6, y + 6, 2, h - 12);
  ctx.fillRect(x + w - 8, y + 6, 2, h - 12);
  for (let px = x + 16; px < x + w - 16; px += 12) {
    ctx.fillRect(px, y + h / 2 - 1, 6, 2);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, tall: boolean): void {
  const potH = tall ? 16 : 12;
  const potW = tall ? 18 : 14;
  ctx.fillStyle = PAL.potBrown;
  ctx.fillRect(x - potW / 2, y - potH, potW, potH);
  ctx.fillStyle = PAL.potDark;
  ctx.fillRect(x - potW / 2 - 2, y - potH, potW + 4, 4);
  const leaves = tall
    ? [[-8, -24, 7, 6], [2, -28, 6, 8], [8, -22, 7, 5], [-4, -32, 5, 6], [6, -30, 5, 5], [-10, -18, 6, 4], [0, -36, 4, 5]]
    : [[-6, -18, 5, 5], [2, -22, 5, 6], [6, -16, 5, 4], [-2, -24, 4, 5]];
  for (const [lx, ly, lw, lh] of leaves) {
    ctx.fillStyle = Math.random() > 0.4 ? PAL.plantGreen : PAL.plantDark;
    ctx.fillRect(x + lx!, y + ly!, lw!, lh!);
  }
  ctx.fillStyle = PAL.plantLight;
  ctx.fillRect(x - 1, y - potH - 4, 2, 6);
}

function drawHangingPlant(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.potBrown;
  ctx.fillRect(x - 6, y, 12, 10);
  ctx.fillStyle = PAL.stringLightWire;
  ctx.fillRect(x, y - 12, 1, 12);
  const vines = [[-10, 8], [-6, 12], [0, 14], [6, 12], [10, 8]];
  for (const [vx, vy] of vines) {
    ctx.fillStyle = PAL.plantGreen;
    ctx.fillRect(x + vx!, y + vy!, 4, 4);
    ctx.fillStyle = PAL.plantDark;
    ctx.fillRect(x + vx! - 2, y + vy! + 3, 3, 4);
    ctx.fillStyle = PAL.plantLight;
    ctx.fillRect(x + vx! + 2, y + vy! + 6, 3, 3);
  }
}

function drawStringLights(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number): void {
  ctx.fillStyle = PAL.stringLightWire;
  const segCount = Math.floor((x2 - x1) / 20);
  for (let i = 0; i <= segCount; i++) {
    const t = i / segCount;
    const x = x1 + t * (x2 - x1);
    const sag = Math.sin(t * Math.PI) * 8;
    ctx.fillRect(Math.floor(x), Math.floor(y1 + sag), 2, 1);
  }
  for (let i = 0; i <= segCount; i++) {
    const t = i / segCount;
    const x = x1 + t * (x2 - x1);
    const sag = Math.sin(t * Math.PI) * 8;
    if (i % 2 === 0) {
      ctx.fillStyle = PAL.stringLightBulb;
      ctx.fillRect(Math.floor(x) - 1, Math.floor(y1 + sag) + 1, 3, 3);
      ctx.fillStyle = "rgba(255,240,180,0.2)";
      ctx.fillRect(Math.floor(x) - 3, Math.floor(y1 + sag) - 1, 7, 7);
    }
  }
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.clockFrame;
  ctx.fillRect(x - 12, y - 12, 24, 24);
  ctx.fillStyle = PAL.clockFace;
  ctx.fillRect(x - 10, y - 10, 20, 20);
  ctx.fillStyle = PAL.clockFrame;
  ctx.fillRect(x - 1, y - 8, 2, 8);
  ctx.fillRect(x, y, 6, 2);
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawPictureFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = PAL.pictureFrame;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x + 3, y + 3, w - 6, 2);
}

function drawRecordPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.recordPlayer;
  ctx.fillRect(x, y, 40, 28);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y, 40, 2);
  ctx.fillStyle = PAL.vinylBlack;
  const vcx = x + 20;
  const vcy = y + 14;
  for (let r = 10; r > 0; r--) {
    ctx.fillStyle = r % 3 === 0 ? "#3A3030" : PAL.vinylBlack;
    ctx.fillRect(vcx - r, vcy - r, r * 2, r * 2);
  }
  ctx.fillStyle = PAL.bookRed;
  ctx.fillRect(vcx - 2, vcy - 2, 4, 4);
}

function drawSpeaker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.speakerBlack;
  ctx.fillRect(x, y, 16, 32);
  ctx.fillStyle = "#4A4040";
  ctx.fillRect(x + 3, y + 4, 10, 10);
  ctx.fillRect(x + 4, y + 18, 8, 8);
  ctx.fillStyle = "#5A5050";
  ctx.fillRect(x + 6, y + 7, 4, 4);
  ctx.fillRect(x + 6, y + 20, 4, 4);
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.lampPole;
  ctx.fillRect(x - 2, y, 4, 48);
  ctx.fillRect(x - 6, y + 46, 12, 4);
  ctx.fillStyle = PAL.lampShade;
  ctx.fillRect(x - 10, y - 16, 20, 18);
  ctx.fillStyle = "rgba(255,240,180,0.25)";
  ctx.fillRect(x - 16, y - 8, 32, 60);
}

function drawDoorMat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = PAL.matRed;
  ctx.fillRect(x, y, 48, 28);
  ctx.fillStyle = PAL.rugRedDark;
  ctx.fillRect(x + 2, y + 2, 44, 24);
  ctx.fillStyle = PAL.matRed;
  ctx.fillRect(x + 6, y + 6, 36, 16);
}

function drawGameTable(ctx: CanvasRenderingContext2D, x: number, y: number, label: string): void {
  ctx.fillStyle = PAL.coffeeTable;
  ctx.fillRect(x, y, 56, 40);
  ctx.fillStyle = PAL.coffeeTableTop;
  ctx.fillRect(x + 2, y + 2, 52, 36);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 2, y + 2, 52, 2);
  ctx.fillStyle = PAL.coffeeTable;
  ctx.fillRect(x + 4, y + 38, 4, 8);
  ctx.fillRect(x + 48, y + 38, 4, 8);
}

/**
 * @deprecated Textures are now drawn directly onto the background canvas in renderWorld.
 *             This function is kept for backwards compatibility and will be removed in a future release.
 */
let hasWarnedGenerateWorldTextures = false;

export function generateWorldTextures(_scene: Phaser.Scene): void {
  if (!hasWarnedGenerateWorldTextures) {
    console.warn(
      "[TileRenderer] generateWorldTextures is deprecated and no longer needed; " +
        "textures are now drawn directly onto the background canvas in renderWorld().",
    );
    hasWarnedGenerateWorldTextures = true;
  }
}

export interface FurnitureItem {
  tileX: number;
  tileY: number;
  textureKey: string;
  widthTiles: number;
  heightTiles: number;
  depth: number;
}

export function buildRoomLayout(): FurnitureItem[] {
  return GAME_TABLES.map((table) => ({
    tileX: table.x - 1,
    tileY: table.y - 1,
    textureKey: "tile_game_table",
    widthTiles: 2,
    heightTiles: 2,
    depth: 3,
  }));
}

export function renderWorld(scene: Phaser.Scene): void {
  const worldWidth = W * TILE;
  const worldHeight = H * TILE;
  const wallHeight = 5 * TILE;

  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = worldWidth;
  bgCanvas.height = worldHeight;
  const ctx = bgCanvas.getContext("2d")!;

  ctx.fillStyle = PAL.ceilingDark;
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  drawWall(ctx, 0, 0, worldWidth, wallHeight);
  drawWoodPlankFloor(ctx, 0, wallHeight, worldWidth, worldHeight - wallHeight);

  const fireCx = Math.floor(worldWidth * 0.5);
  drawFireplace(ctx, fireCx, wallHeight - 80);

  drawWindow(ctx, TILE * 6, TILE * 1, 56, 64);
  drawWindow(ctx, TILE * 14, TILE * 1, 56, 64);
  drawWindow(ctx, TILE * 38, TILE * 1, 56, 64);
  drawWindow(ctx, TILE * 48, TILE * 1, 56, 64);

  drawStringLights(ctx, TILE * 4, TILE * 0.5, TILE * 18);
  drawStringLights(ctx, TILE * 22, TILE * 0.5, TILE * 38);
  drawStringLights(ctx, TILE * 40, TILE * 0.5, TILE * 56);

  drawClock(ctx, fireCx, TILE * 1.5);
  drawPictureFrame(ctx, TILE * 11, TILE * 1.5, 24, 20, PAL.pictureCanvas);
  drawPictureFrame(ctx, TILE * 44, TILE * 1.5, 20, 24, "#7A8AAA");

  drawBookshelf(ctx, TILE * 52, wallHeight + 4, TILE * 3, TILE * 5);
  drawBookshelf(ctx, TILE * 55.5, wallHeight + 4, TILE * 2.5, TILE * 5);

  drawCouch(ctx, fireCx - 80, wallHeight + TILE * 5, 100, "up");
  drawCouch(ctx, fireCx - 10, wallHeight + TILE * 8, 130, "up");

  drawArmchair(ctx, TILE * 3, wallHeight + TILE * 2, );
  drawArmchair(ctx, TILE * 3, wallHeight + TILE * 6);
  drawArmchair(ctx, TILE * 50, wallHeight + TILE * 4);

  drawCoffeeTable(ctx, fireCx - 40, wallHeight + TILE * 6.5, 80);
  drawCoffeeTable(ctx, TILE * 6, wallHeight + TILE * 4, 48);

  drawRoundRug(ctx, TILE * 10, wallHeight + TILE * 8, 48);
  drawRectRug(ctx, TILE * 36, wallHeight + TILE * 10, TILE * 6, TILE * 4);
  drawDoorMat(ctx, TILE * 28, worldHeight - TILE * 3, );

  drawRecordPlayer(ctx, TILE * 50, wallHeight + TILE * 1);
  drawSpeaker(ctx, TILE * 54, wallHeight + TILE * 1.5);
  drawSpeaker(ctx, TILE * 48, wallHeight + TILE * 1.5);

  drawLamp(ctx, TILE * 8, wallHeight + TILE * 1);
  drawLamp(ctx, TILE * 44, wallHeight + TILE * 3);

  drawPlant(ctx, TILE * 2, wallHeight + TILE * 1.5, true);
  drawPlant(ctx, TILE * 57, wallHeight + TILE * 2, true);
  drawPlant(ctx, TILE * 30, wallHeight + TILE * 12, false);
  drawPlant(ctx, TILE * 20, wallHeight + TILE * 3, false);
  drawPlant(ctx, TILE * 46, wallHeight + TILE * 10, false);

  drawHangingPlant(ctx, TILE * 5, TILE * 0.5);
  drawHangingPlant(ctx, TILE * 19, TILE * 0.5);
  drawHangingPlant(ctx, TILE * 55, TILE * 1);

  for (const table of GAME_TABLES) {
    const tx = table.x * TILE - TILE;
    const ty = table.y * TILE - TILE;
    const kindLabel = table.kind === "ttt" ? "TIC-TAC-TOE" : table.kind.toUpperCase();
    drawGameTable(ctx, tx, ty, kindLabel);
  }

  ctx.fillStyle = "rgba(255,160,60,0.06)";
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  if (scene.textures.exists("world_bg")) scene.textures.remove("world_bg");
  scene.textures.addCanvas("world_bg", bgCanvas);
  scene.add.image(worldWidth / 2, worldHeight / 2, "world_bg").setDepth(-10);

  for (const table of GAME_TABLES) {
    const kindLabel = table.kind === "ttt" ? "TIC-TAC-TOE" : table.kind.toUpperCase();
    scene.add
      .text(table.x * TILE, table.y * TILE - TILE - 8, kindLabel, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#ffe8b0",
        stroke: "#2a1e14",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(10);
  }

  const vigCanvas = document.createElement("canvas");
  vigCanvas.width = 960;
  vigCanvas.height = 640;
  const vCtx = vigCanvas.getContext("2d")!;
  const vGrad = vCtx.createRadialGradient(480, 320, 150, 480, 320, 520);
  vGrad.addColorStop(0, "rgba(0,0,0,0)");
  vGrad.addColorStop(1, "rgba(0,0,0,0.35)");
  vCtx.fillStyle = vGrad;
  vCtx.fillRect(0, 0, 960, 640);
  if (scene.textures.exists("vignette_overlay")) scene.textures.remove("vignette_overlay");
  scene.textures.addCanvas("vignette_overlay", vigCanvas);
  scene.add.image(480, 320, "vignette_overlay").setScrollFactor(0).setDepth(100).setAlpha(0.5);
}
