import { describe, expect, it } from "vitest";
import { display, encode, parseHex, characterRange } from "./codec";

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
    expect(characterRange(d, 1, 4)).toEqual([1, 2]);
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
  it("highlights characters overlapped by a partial byte selection", () => {
    const utf8 = display(encode("Aあ😀", "utf8"), "utf8");
    expect(characterRange(utf8, 2, 3)).toEqual([1, 2]);
    expect(characterRange(utf8, 5, 6)).toEqual([2, 4]);
    expect(characterRange(utf8, 3, 5)).toEqual([1, 4]);
    expect(characterRange(utf8, 2, 2)).toEqual([2, 2]);

    const sjis = display(encode("あ", "sjis"), "sjis");
    expect(characterRange(sjis, 1, 2)).toEqual([0, 1]);
  });
  it("selects exact hex byte groups", () => {
    expect(
      characterRange(display(new Uint8Array([1, 2, 3]), "hex"), 1, 3),
    ).toEqual([3, 8]);
  });
});
