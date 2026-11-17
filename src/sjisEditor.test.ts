import { describe, expect, it } from "vitest";
import { shiftJisDisplay } from "./byteEditor";
import { createPanelStore } from "./store";

describe("Shift-JIS byte editing", () => {
  it("matches decoding errors without swallowing a following ASCII byte", () => {
    expect(shiftJisDisplay(Uint8Array.of(0x82, 0x41, 0x3f, 0x82))).toEqual({
      text: "�A?�", boundaries: [0, 1, 2, 3, 4],
    });
    expect(shiftJisDisplay(Uint8Array.of(0x82, 0xff))).toEqual({
      text: "�", boundaries: [0, 2],
    });
  });

  it("edits only the selected bytes and supports lossless undo and redo", () => {
    const store = createPanelStore();
    store.update("hex", "FF 41 82", [8, 8]);
    expect(store.shiftJis.value.value).toBe("�A�");
    store.update("sjis", "�B�", [2, 2], [1, 2]);
    expect(store.binary.value.value).toBe("FF 42 82");
    const payload = store.copyTextBytes("sjis", [2, 3]);
    store.pasteBytes("sjis", [2, 3], new Uint8Array());
    expect(store.binary.value.value).toBe("FF 42");
    store.textHistory("undo");
    expect(store.binary.value.value).toBe("FF 42 82");
    store.textHistory("redo");
    expect(store.binary.value.value).toBe("FF 42");
    store.pasteBytes("utf8", [0, 0], payload);
    expect(store.binary.value.value).toBe("82 FF 42");
  });

  it("deletes the intended marker when two markers look identical", () => {
    const store = createPanelStore();
    store.update("hex", "FF 82", [5, 5]);
    store.update("sjis", "�", [0, 0], [1, 1]);
    expect(store.binary.value.value).toBe("82");
  });
});
