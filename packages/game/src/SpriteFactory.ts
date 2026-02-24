import * as Phaser from "phaser";
import type { Direction } from "@chillspace/protocol";

const SPRITE_W = 16;
const SPRITE_H = 16;
const FRAME_COUNT = 4;

const HAIR_STYLES = [
  [[4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
   [3, 1], [4, 1], [11, 1], [12, 1], [3, 2], [12, 2]],
  [[5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0],
   [4, 1], [5, 1], [10, 1], [11, 1], [4, 2], [11, 2],
   [3, 3], [12, 3]],
  [[4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
   [3, 0], [12, 0], [3, 1], [4, 1], [11, 1], [12, 1],
   [3, 2], [12, 2], [3, 3], [12, 3], [3, 4], [12, 4]],
  [[5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0],
   [4, 1], [11, 1], [4, 2], [11, 2]],
] as const;

const BODY_PATTERNS = [
  { collar: true, stripe: false },
  { collar: false, stripe: true },
  { collar: true, stripe: true },
  { collar: false, stripe: false },
] as const;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = Number.parseInt(clean, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

function darken(color: { r: number; g: number; b: number }, factor: number) {
  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor),
  };
}

function lighten(color: { r: number; g: number; b: number }, factor: number) {
  return {
    r: Math.min(255, Math.round(color.r + (255 - color.r) * factor)),
    g: Math.min(255, Math.round(color.g + (255 - color.g) * factor)),
    b: Math.min(255, Math.round(color.b + (255 - color.b) * factor)),
  };
}

function generateSkinTone(hash: number): { r: number; g: number; b: number } {
  const tones = [
    { r: 255, g: 224, b: 189 },
    { r: 241, g: 194, b: 150 },
    { r: 198, g: 134, b: 103 },
    { r: 141, g: 85, b: 56 },
    { r: 224, g: 172, b: 130 },
    { r: 255, g: 205, b: 170 },
  ];
  return tones[hash % tones.length]!;
}

function generateHairColor(hash: number): { r: number; g: number; b: number } {
  const colors = [
    { r: 50, g: 30, b: 20 },
    { r: 140, g: 80, b: 30 },
    { r: 200, g: 170, b: 100 },
    { r: 80, g: 40, b: 25 },
    { r: 30, g: 30, b: 40 },
    { r: 180, g: 60, b: 50 },
    { r: 100, g: 60, b: 120 },
    { r: 60, g: 130, b: 130 },
  ];
  return colors[hash % colors.length]!;
}

interface SpriteColors {
  skin: { r: number; g: number; b: number };
  skinShadow: { r: number; g: number; b: number };
  hair: { r: number; g: number; b: number };
  shirt: { r: number; g: number; b: number };
  shirtAccent: { r: number; g: number; b: number };
  pants: { r: number; g: number; b: number };
  shoes: { r: number; g: number; b: number };
  eyes: { r: number; g: number; b: number };
}

function computeColors(avatarColor: string, userId: string): SpriteColors {
  const shirt = hexToRgb(avatarColor);
  const hash = hashString(userId);
  const skin = generateSkinTone(hash >> 4);
  const hair = generateHairColor(hash >> 8);
  return {
    skin,
    skinShadow: darken(skin, 0.75),
    hair,
    shirt,
    shirtAccent: lighten(shirt, 0.35),
    pants: darken(shirt, 0.45),
    shoes: { r: 60, g: 50, b: 45 },
    eyes: { r: 35, g: 30, b: 30 },
  };
}

type PixelGrid = (number | null)[][];

function createEmptyGrid(): PixelGrid {
  return Array.from({ length: SPRITE_H }, () => Array(SPRITE_W).fill(null) as (number | null)[]);
}

function setPixel(grid: PixelGrid, x: number, y: number, color: { r: number; g: number; b: number }): void {
  if (y >= 0 && y < SPRITE_H && x >= 0 && x < SPRITE_W) {
    grid[y]![x] = rgbToHex(color.r, color.g, color.b);
  }
}

function drawBody(grid: PixelGrid, colors: SpriteColors, pattern: typeof BODY_PATTERNS[number], dir: Direction): void {
  for (let y = 5; y <= 7; y++) {
    for (let x = 5; x <= 10; x++) {
      setPixel(grid, x, y, colors.skin);
    }
  }
  if (dir === "down" || dir === "left" || dir === "right") {
    setPixel(grid, 6, 6, colors.eyes);
    setPixel(grid, 9, 6, colors.eyes);
    setPixel(grid, 7, 7, colors.skinShadow);
    setPixel(grid, 8, 7, colors.skinShadow);
  }
  if (dir === "up") {
    setPixel(grid, 7, 6, colors.skinShadow);
    setPixel(grid, 8, 6, colors.skinShadow);
  }
  if (dir === "left") {
    setPixel(grid, 10, 6, colors.skin);
  }
  if (dir === "right") {
    setPixel(grid, 5, 6, colors.skin);
  }

  for (let y = 8; y <= 11; y++) {
    for (let x = 4; x <= 11; x++) {
      setPixel(grid, x, y, colors.shirt);
    }
  }
  if (pattern.collar) {
    setPixel(grid, 6, 8, colors.shirtAccent);
    setPixel(grid, 7, 8, colors.shirtAccent);
    setPixel(grid, 8, 8, colors.shirtAccent);
    setPixel(grid, 9, 8, colors.shirtAccent);
  }
  if (pattern.stripe) {
    for (let x = 4; x <= 11; x++) {
      setPixel(grid, x, 10, colors.shirtAccent);
    }
  }

  setPixel(grid, 3, 9, colors.skin);
  setPixel(grid, 3, 10, colors.skin);
  setPixel(grid, 12, 9, colors.skin);
  setPixel(grid, 12, 10, colors.skin);

  for (let x = 5; x <= 10; x++) {
    setPixel(grid, x, 12, colors.pants);
    setPixel(grid, x, 13, colors.pants);
  }

  setPixel(grid, 5, 14, colors.shoes);
  setPixel(grid, 6, 14, colors.shoes);
  setPixel(grid, 9, 14, colors.shoes);
  setPixel(grid, 10, 14, colors.shoes);
}

function drawHair(grid: PixelGrid, colors: SpriteColors, style: typeof HAIR_STYLES[number]): void {
  for (const [x, y] of style) {
    setPixel(grid, x, y + 3, colors.hair);
  }
}

function clearPixel(grid: PixelGrid, x: number, y: number): void {
  if (y >= 0 && y < SPRITE_H && x >= 0 && x < SPRITE_W) {
    grid[y]![x] = null;
  }
}

function applyWalkOffset(grid: PixelGrid, frame: number, colors: SpriteColors): void {
  if (frame === 1) {
    clearPixel(grid, 5, 14);
    setPixel(grid, 4, 14, colors.shoes);
    clearPixel(grid, 10, 14);
    setPixel(grid, 11, 14, colors.shoes);
    clearPixel(grid, 3, 9);
    setPixel(grid, 2, 9, colors.skin);
  } else if (frame === 3) {
    clearPixel(grid, 6, 14);
    setPixel(grid, 7, 14, colors.shoes);
    clearPixel(grid, 9, 14);
    setPixel(grid, 8, 14, colors.shoes);
    clearPixel(grid, 12, 9);
    setPixel(grid, 13, 9, colors.skin);
  }
}

function renderGrid(scene: Phaser.Scene, key: string, grid: PixelGrid): void {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(SPRITE_W, SPRITE_H);

  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const color = grid[y]?.[x];
      if (color != null) {
        const idx = (y * SPRITE_W + x) * 4;
        imageData.data[idx] = (color >> 16) & 0xff;
        imageData.data[idx + 1] = (color >> 8) & 0xff;
        imageData.data[idx + 2] = color & 0xff;
        imageData.data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  scene.textures.addCanvas(key, canvas);
}

export function generateCharacterSpriteSheet(
  scene: Phaser.Scene,
  userId: string,
  avatarColor: string
): string {
  const hash = hashString(userId);
  const colors = computeColors(avatarColor, userId);
  const hairIdx = hash % HAIR_STYLES.length;
  const bodyIdx = (hash >> 2) % BODY_PATTERNS.length;
  const hairStyle = HAIR_STYLES[hairIdx]!;
  const bodyPattern = BODY_PATTERNS[bodyIdx]!;

  const directions: Direction[] = ["down", "left", "right", "up"];
  const sheetWidth = SPRITE_W * FRAME_COUNT;
  const sheetHeight = SPRITE_H * directions.length;

  const canvas = document.createElement("canvas");
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext("2d")!;

  for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
    const dir = directions[dirIdx]!;
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      const grid = createEmptyGrid();
      drawBody(grid, colors, bodyPattern, dir);
      drawHair(grid, colors, hairStyle);
      if (frame !== 0) {
        applyWalkOffset(grid, frame, colors);
      }

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = SPRITE_W;
      frameCanvas.height = SPRITE_H;
      const frameCtx = frameCanvas.getContext("2d")!;
      const imageData = frameCtx.createImageData(SPRITE_W, SPRITE_H);

      for (let y = 0; y < SPRITE_H; y++) {
        for (let x = 0; x < SPRITE_W; x++) {
          const color = grid[y]?.[x];
          if (color != null) {
            const idx = (y * SPRITE_W + x) * 4;
            imageData.data[idx] = (color >> 16) & 0xff;
            imageData.data[idx + 1] = (color >> 8) & 0xff;
            imageData.data[idx + 2] = color & 0xff;
            imageData.data[idx + 3] = 255;
          }
        }
      }

      frameCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(frameCanvas, frame * SPRITE_W, dirIdx * SPRITE_H);
    }
  }

  const key = `avatar_${userId}`;
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  const img = new Image();
  img.src = canvas.toDataURL();
  scene.textures.addSpriteSheet(key, img, {
    frameWidth: SPRITE_W,
    frameHeight: SPRITE_H,
  });

  const dirNames = ["down", "left", "right", "up"];
  for (let dirIdx = 0; dirIdx < dirNames.length; dirIdx++) {
    const animKey = `${key}_walk_${dirNames[dirIdx]}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(key, {
          start: dirIdx * FRAME_COUNT,
          end: dirIdx * FRAME_COUNT + FRAME_COUNT - 1,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }
    const idleKey = `${key}_idle_${dirNames[dirIdx]}`;
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: [{ key, frame: dirIdx * FRAME_COUNT }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  return key;
}

export function playWalkAnim(sprite: Phaser.GameObjects.Sprite, textureKey: string, dir: Direction): void {
  const animKey = `${textureKey}_walk_${dir}`;
  if (sprite.anims.currentAnim?.key !== animKey) {
    sprite.play(animKey);
  }
}

export function playIdleAnim(sprite: Phaser.GameObjects.Sprite, textureKey: string, dir: Direction): void {
  const animKey = `${textureKey}_idle_${dir}`;
  if (sprite.anims.currentAnim?.key !== animKey) {
    sprite.play(animKey);
  }
}

export { SPRITE_W, SPRITE_H, hashString, hexToRgb, rgbToHex, darken, lighten, computeColors, renderGrid };
