import { describe, expect, it } from "vitest";
import { byteRangeToHex, characterRange, display, encode, normalizeHexRange, parseHex, selectedByteCount } from "./codec";

describe("shared byte model", () => {
  it("encodes Japanese in both encodings", () => {
    expect([...encode("あ", "sjis")]).toEqual([0x82, 0xa0]);
    expect([...encode("あ", "utf8")]).toEqual([0xe3, 0x81, 0x82]);
    expect(display(new Uint8Array([0x82, 0xa0]), "sjis").text).toBe("あ");
  });
  it("accepts whitespace and rejects incomplete or invalid hex", () => {
    expect([...parseHex("e3 81\n82")!]).toEqual([227, 129, 130]);
    expect(parseHex("E")).toBeNull();
    expect(parseHex("ZZ")).toBeNull();
  });
  it("tracks multibyte characters and surrogate pairs", () => {
    const d = display(encode("Aあ😀", "utf8"), "utf8");
    expect(d.text).toBe("Aあ😀");
    expect(d.boundaries).toEqual([0, 1, 4, 4, 8]);
    expect(characterRange(d, 3, 11)).toEqual([1, 2]);
  });
  it("matches the platform decoder on malformed input", () => {
    for (const data of [
      [0xe3, 0x81],
      [0xe3, 0x81, 0x41],
      [0xf0, 0x80, 0x80, 0x80],
      [0xff, 0xc2, 0xa0],
      [0x82, 0x20],
    ]) {
      const bytes = new Uint8Array(data);
      for (const kind of ["utf8", "sjis"] as const)
        expect(display(bytes, kind).text).toBe(
          new TextDecoder(kind === "sjis" ? "shift-jis" : "utf-8").decode(
            bytes,
          ),
        );
    }
  });
  it("highlights a UTF-8 character for every nonempty subset of its HEX text", () => {
    const utf8 = display(encode("Aあ😀", "utf8"), "utf8");
    for (let start = 3; start < 11; start++) {
      for (let end = start + 1; end <= 11; end++) {
        expect(characterRange(utf8, start, end)).toEqual([1, 2]);
      }
    }
    expect(characterRange(utf8, 2, 3)).toEqual([1, 1]);
    expect(characterRange(utf8, 5, 5)).toEqual([2, 2]);
    expect(characterRange(utf8, 14, 15)).toEqual([2, 4]);
    expect(characterRange(utf8, 10, 13)).toEqual([1, 4]);
  });

  it("includes spaces inside a Shift-JIS character", () => {
    const sjis = display(encode("あ", "sjis"), "sjis");
    expect(characterRange(sjis, 2, 3)).toEqual([0, 1]);
  });

  it("preserves exact HEX positions and maps byte spans back to HEX", () => {
    const hex = display(encode("Aあ", "utf8"), "hex");
    expect(characterRange(hex, 5, 6)).toEqual([5, 6]);
    expect(byteRangeToHex(1, 4, hex.text.length)).toEqual([3, 11]);
    expect(byteRangeToHex(4, 4, hex.text.length)).toEqual([11, 11]);
    expect(normalizeHexRange("e3 81\n82", [2, 3])).toEqual([2, 3]);
    expect(normalizeHexRange("e38182", [2, 2])).toEqual([2, 2]);
    expect(selectedByteCount([2, 3])).toBe(0);
    expect(selectedByteCount([1, 4])).toBe(2);
  });
});
