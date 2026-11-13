import Encoding from "encoding-japanese";
export type ViewType = "sjis" | "hex" | "utf8";
export interface Display {
  text: string;
  boundaries: number[];
  hex?: boolean;
}
export function encode(text: string, view: ViewType): Uint8Array {
  if (view === "utf8") return new TextEncoder().encode(text);
  return new Uint8Array(
    Encoding.convert(Encoding.stringToCode(text), {
      to: "SJIS",
      from: "UNICODE",
      type: "array",
    }),
  );
}
export function parseHex(text: string): Uint8Array | null {
  const compact = text.replace(/\s/g, "");
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(compact)) return null;
  return Uint8Array.from(compact.match(/../g) ?? [], (h) => parseInt(h, 16));
}
export function display(bytes: Uint8Array, view: ViewType): Display {
  if (view === "hex") {
    const text = Array.from(bytes, (b) =>
      b.toString(16).padStart(2, "0").toUpperCase(),
    ).join(" ");
    return {
      text,
      hex: true,
      boundaries: [],
    };
  }
  const decoder = new TextDecoder(view === "sjis" ? "shift-jis" : "utf-8", {
    ignoreBOM: true,
  });
  let text = "";
  const boundaries = [0];
  for (let i = 0; i < bytes.length;) {
    let size = 1;
    const b = bytes[i]!;
    if (view === "sjis") {
      if (
        ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) &&
        i + 1 < bytes.length &&
        bytes[i + 1]! >= 0x40 &&
        bytes[i + 1]! <= 0xfc &&
        bytes[i + 1] !== 0x7f
      )
        size = 2;
    } else {
      const n =
        b >= 0xc2 && b <= 0xdf
          ? 2
          : b >= 0xe0 && b <= 0xef
            ? 3
            : b >= 0xf0 && b <= 0xf4
              ? 4
              : 1;
      if (n > 1) {
        let valid = true;
        let j = 1;
        for (; j < n && i + j < bytes.length; j++) {
          const c = bytes[i + j]!;
          if (
            c < 0x80 ||
            c > 0xbf ||
            (j === 1 &&
              ((b === 0xe0 && c < 0xa0) ||
                (b === 0xed && c > 0x9f) ||
                (b === 0xf0 && c < 0x90) ||
                (b === 0xf4 && c > 0x8f)))
          ) {
            valid = false;
            break;
          }
        }
        size = valid ? Math.min(n, bytes.length - i) : j;
      }
    }
    const chunk = decoder.decode(bytes.slice(i, i + size));
    text += chunk;
    for (let k = 1; k <= chunk.length; k++)
      boundaries.push(k === chunk.length ? i + size : i);
    i += size;
  }
  let normalized = "";
  const mapped = [boundaries[0]!];
  for (let c = 0; c < text.length; c++) {
    if (text[c] === "\r") {
      if (text[c + 1] === "\n") c++;
      normalized += "\n";
    } else normalized += text[c];
    mapped.push(boundaries[c + 1]!);
  }
  return { text: normalized, boundaries: mapped };
}
export type Range = [number, number];

// In canonical HEX, a byte starts at 3 * offset and occupies two digits.
export function byteRangeToHex(start: number, end: number, hexLength: number): Range {
  return [
    Math.min(hexLength, start * 3),
    Math.min(hexLength, start === end ? end * 3 : end * 3 - 1),
  ];
}

// Map the selection in an editable HEX draft to the normalized HEX string.
export function normalizeHexRange(text: string, [start, end]: Range): Range {
  const digits = (offset: number) => text.slice(0, offset).replace(/\s/g, "").length;
  const a = digits(start);
  const z = digits(end);
  const count = digits(text.length);
  const digitPosition = (index: number) => index + Math.floor(index / 2);
  const length = count === 0 ? 0 : digitPosition(count - 1) + 1;
  const from = Math.min(length, digitPosition(a));
  if (start === end) {
    // Keep either side of an existing separator distinguishable.
    const caret = a > 0 && a < count && a % 2 === 0 && !/\s/.test(text[start - 1]!)
      ? from - 1 : from;
    return [caret, caret];
  }
  if (a < z) return [from, digitPosition(z - 1) + 1];
  if (a > 0 && a < count && a % 2 === 0) return [from - 1, from];
  return [from, from];
}

export function selectedByteCount([start, end]: Range): number {
  if (start === end) return 0;
  const first = Math.floor(start / 3) + (start % 3 === 2 ? 1 : 0);
  return Math.max(0, Math.floor((end - 1) / 3) - first + 1);
}

export function characterRange(d: Display, start: number, end: number): Range {
  if (d.hex) return [start, end];

  const { boundaries, text } = d;
  // A character covers its first through last HEX digit, including internal spaces.
  const after = boundaries.findIndex((byte) => byte * 3 >= end);
  const z = after < 0 ? text.length : after;
  if (start === end) return [z, z];

  const firstEnd = boundaries.findIndex((byte, i) => i > 0 && byte * 3 - 1 > start);
  let a = firstEnd < 0 ? text.length : firstEnd - 1;
  // A surrogate pair can have two UTF-16 positions at the same byte offset.
  if (firstEnd >= 0) {
    while (a > 0 && boundaries[a] === boundaries[a - 1]) a--;
  }
  return [Math.min(a, z), z];
}
