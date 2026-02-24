import { describe, it, expect } from "vitest";
import { cleanText } from "../lib/filter";

describe("cleanText", () => {
  it("returns clean text unchanged", () => {
    expect(cleanText("Hello World")).toBe("Hello World");
  });

  it("trims whitespace", () => {
    expect(cleanText("  hello  ")).toBe("hello");
  });

  it("filters profanity", () => {
    const result = cleanText("what the hell is this");
    expect(result).toContain("***");
  });

  it("handles empty string after trim", () => {
    expect(cleanText("   ")).toBe("");
  });

  it("preserves normal characters", () => {
    expect(cleanText("StudyRoom123")).toBe("StudyRoom123");
  });

  it("handles special characters", () => {
    expect(cleanText("Room #1 (Study)")).toBe("Room #1 (Study)");
  });
});
