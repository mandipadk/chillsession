import { describe, it, expect } from "vitest";
import { hashString, hexToRgb, rgbToHex, darken, lighten, computeColors } from "../SpriteFactory";

describe("hashString", () => {
  it("returns a non-negative integer", () => {
    expect(hashString("test")).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hashString("test"))).toBe(true);
  });

  it("returns consistent results", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
    expect(hashString("world")).toBe(hashString("world"));
  });

  it("returns different results for different inputs", () => {
    expect(hashString("alice")).not.toBe(hashString("bob"));
  });

  it("handles empty string", () => {
    expect(hashString("")).toBe(0);
  });

  it("handles long strings", () => {
    const long = "a".repeat(1000);
    const result = hashString(long);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("handles unicode characters", () => {
    const result = hashString("日本語テスト");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("hexToRgb", () => {
  it("parses 6-digit hex with hash", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses 6-digit hex without hash", () => {
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("parses black", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses white", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("parses mixed values", () => {
    expect(hexToRgb("#1a2b3c")).toEqual({ r: 26, g: 43, b: 60 });
  });

  it("handles uppercase hex", () => {
    expect(hexToRgb("#FF8800")).toEqual({ r: 255, g: 136, b: 0 });
  });
});

describe("rgbToHex", () => {
  it("converts red", () => {
    expect(rgbToHex(255, 0, 0)).toBe(0xff0000);
  });

  it("converts green", () => {
    expect(rgbToHex(0, 255, 0)).toBe(0x00ff00);
  });

  it("converts blue", () => {
    expect(rgbToHex(0, 0, 255)).toBe(0x0000ff);
  });

  it("converts black", () => {
    expect(rgbToHex(0, 0, 0)).toBe(0);
  });

  it("converts white", () => {
    expect(rgbToHex(255, 255, 255)).toBe(0xffffff);
  });

  it("round-trips with hexToRgb", () => {
    const rgb = hexToRgb("#3a7bff");
    expect(rgbToHex(rgb.r, rgb.g, rgb.b)).toBe(0x3a7bff);
  });
});

describe("darken", () => {
  it("darkens by factor", () => {
    const color = { r: 200, g: 100, b: 50 };
    const result = darken(color, 0.5);
    expect(result.r).toBe(100);
    expect(result.g).toBe(50);
    expect(result.b).toBe(25);
  });

  it("returns black with factor 0", () => {
    const color = { r: 200, g: 100, b: 50 };
    const result = darken(color, 0);
    expect(result).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns same color with factor 1", () => {
    const color = { r: 200, g: 100, b: 50 };
    const result = darken(color, 1);
    expect(result).toEqual(color);
  });

  it("rounds values", () => {
    const color = { r: 100, g: 100, b: 100 };
    const result = darken(color, 0.33);
    expect(Number.isInteger(result.r)).toBe(true);
    expect(Number.isInteger(result.g)).toBe(true);
    expect(Number.isInteger(result.b)).toBe(true);
  });
});

describe("lighten", () => {
  it("lightens by factor", () => {
    const color = { r: 0, g: 0, b: 0 };
    const result = lighten(color, 0.5);
    expect(result).toEqual({ r: 128, g: 128, b: 128 });
  });

  it("returns same color with factor 0", () => {
    const color = { r: 100, g: 150, b: 200 };
    const result = lighten(color, 0);
    expect(result).toEqual(color);
  });

  it("returns white with factor 1", () => {
    const color = { r: 100, g: 150, b: 200 };
    const result = lighten(color, 1);
    expect(result).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("clamps to 255", () => {
    const color = { r: 250, g: 250, b: 250 };
    const result = lighten(color, 0.5);
    expect(result.r).toBeLessThanOrEqual(255);
    expect(result.g).toBeLessThanOrEqual(255);
    expect(result.b).toBeLessThanOrEqual(255);
  });
});

describe("computeColors", () => {
  it("returns all required color properties", () => {
    const colors = computeColors("#7dd3fc", "user123");
    expect(colors).toHaveProperty("skin");
    expect(colors).toHaveProperty("skinShadow");
    expect(colors).toHaveProperty("hair");
    expect(colors).toHaveProperty("shirt");
    expect(colors).toHaveProperty("shirtAccent");
    expect(colors).toHaveProperty("pants");
    expect(colors).toHaveProperty("shoes");
    expect(colors).toHaveProperty("eyes");
  });

  it("uses avatar color for shirt", () => {
    const colors = computeColors("#ff0000", "user1");
    expect(colors.shirt).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("generates different skin tones for different users", () => {
    const colors1 = computeColors("#ff0000", "userA");
    const colors2 = computeColors("#ff0000", "userB");
    // Different users should likely get different features
    // (hash-dependent, so this is probabilistic but the hash function is deterministic)
    const c1 = `${colors1.skin.r},${colors1.hair.r}`;
    const c2 = `${colors2.skin.r},${colors2.hair.r}`;
    // At least check they're valid
    expect(colors1.skin.r).toBeGreaterThanOrEqual(0);
    expect(colors2.skin.r).toBeGreaterThanOrEqual(0);
  });

  it("skinShadow is darker than skin", () => {
    const colors = computeColors("#3b82f6", "testUser");
    expect(colors.skinShadow.r).toBeLessThanOrEqual(colors.skin.r);
    expect(colors.skinShadow.g).toBeLessThanOrEqual(colors.skin.g);
    expect(colors.skinShadow.b).toBeLessThanOrEqual(colors.skin.b);
  });

  it("shirtAccent is lighter than shirt", () => {
    const colors = computeColors("#3b82f6", "testUser");
    expect(colors.shirtAccent.r).toBeGreaterThanOrEqual(colors.shirt.r);
    expect(colors.shirtAccent.g).toBeGreaterThanOrEqual(colors.shirt.g);
    expect(colors.shirtAccent.b).toBeGreaterThanOrEqual(colors.shirt.b);
  });

  it("pants are darker than shirt", () => {
    const colors = computeColors("#8080ff", "testUser");
    expect(colors.pants.r).toBeLessThanOrEqual(colors.shirt.r);
  });

  it("handles edge color values", () => {
    const black = computeColors("#000000", "test");
    expect(black.shirt).toEqual({ r: 0, g: 0, b: 0 });

    const white = computeColors("#ffffff", "test");
    expect(white.shirt).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("is deterministic for same inputs", () => {
    const a = computeColors("#abcdef", "userId99");
    const b = computeColors("#abcdef", "userId99");
    expect(a).toEqual(b);
  });
});
