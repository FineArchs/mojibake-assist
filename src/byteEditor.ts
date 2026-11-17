import { encode, type Display, type Range } from "./codec";

const marker = "\uFFFD";
export const byteClipboardType = "application/x-mojibake-assist-bytes";

export function shiftJisDisplay(
  bytes: Uint8Array,
  markInvalid = false,
): Display {
  const strict = new TextDecoder("shift-jis", { fatal: true });
  let text = "";
  const boundaries = [0];
  const invalidOffsets: number[] = [];
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i]!;
    const next = bytes[i + 1];
    const lead = (b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc);
    let size = lead && next !== undefined ? 2 : 1;
    let piece: string;
    try {
      piece = strict.decode(bytes.subarray(i, i + size));
    } catch {
      // A failed lead followed by ASCII leaves the ASCII byte for the next step.
      if (size === 2 && next! <= 0x7f) size = 1;
      invalidOffsets.push(text.length);
      piece = marker;
    }
    if (b === 0x0d) {
      if (next === 0x0a) size = 2;
      piece = "\n";
    }
    text += piece;
    for (let j = 1; j <= piece.length; j++) {
      boundaries.push(j === piece.length ? i + size : i);
    }
    i += size;
  }
  return { text, boundaries, ...(markInvalid ? { invalidOffsets } : {}) };
}

export function spliceBytes(
  bytes: Uint8Array,
  [start, end]: Range,
  inserted: Uint8Array,
) {
  const result = new Uint8Array(bytes.length - (end - start) + inserted.length);
  result.set(bytes.subarray(0, start));
  result.set(inserted, start);
  result.set(bytes.subarray(end), start + inserted.length);
  return result;
}

export function textByteEdit(
  previous: Display,
  value: string,
  caret: number,
  encoding: "sjis" | "utf8",
  before?: Range,
) {
  const old = previous.text;
  // Anchor the unchanged suffix to the post-edit caret, so deleting one
  // of several identical markers preserves the bytes of the other markers.
  let suffix = 0;
  const maxSuffix = Math.min(
    old.length,
    value.length - caret,
    before ? old.length - before[1] : old.length,
  );
  while (
    suffix < maxSuffix &&
    old[old.length - 1 - suffix] === value[value.length - 1 - suffix]
  )
    suffix++;
  let start = 0;
  const maxStart = Math.min(
    old.length - suffix,
    value.length - suffix,
    caret,
    before?.[0] ?? old.length,
  );
  while (start < maxStart && old[start] === value[start]) start++;
  // A shared surrogate is not an independently editable part of a character.
  while (
    start > 0 &&
    previous.boundaries[start] === previous.boundaries[start - 1]
  )
    start--;
  while (
    suffix > 0 &&
    previous.boundaries[old.length - suffix] ===
      previous.boundaries[old.length - suffix - 1]
  )
    suffix--;
  const end = old.length - suffix;
  const inserted = encode(value.slice(start, value.length - suffix), encoding);
  const offset = previous.boundaries[start]!;
  return {
    range: [offset, previous.boundaries[end]!] as Range,
    inserted,
    caret: offset + encode(value.slice(start, caret), encoding).length,
  };
}
