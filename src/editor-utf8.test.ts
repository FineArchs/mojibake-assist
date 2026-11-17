import { describe, expect, it } from "vitest";
import { createPanelStore } from "./store";

describe("UTF-8 byte editing", () => {
  it("preserves a truncated sequence while editing adjacent text", () => {
    const store = createPanelStore();
    store.update("hex", "41 E3 81", [8, 8]);
    expect(store.utf8.value.value).toBe("A\uFFFC");
    expect(store.utf8.value.markers).toEqual([{ index: 1, hex: "E3 81" }]);
    store.update("utf8", "B\uFFFC", [1, 1], [0, 1]);
    expect(store.binary.value.value).toBe("42 E3 81");
    store.select("utf8", [1, 2]);
    expect(store.binary.value.selection).toEqual([3, 8]);
    const payload = store.copyTextBytes("utf8", [1, 2]);
    store.pasteBytes("utf8", [1, 2], new Uint8Array());
    expect(store.binary.value.value).toBe("42");
    store.editHistory("undo");
    expect(store.binary.value.value).toBe("42 E3 81");
    store.editHistory("redo");
    expect(store.binary.value.value).toBe("42");
    store.pasteBytes("sjis", [0, 1], payload);
    expect(store.binary.value.value).toBe("E3 81");
  });

  it("distinguishes a real replacement character and preserves adjacent astral text", () => {
    const store = createPanelStore();
    store.update("hex", "EF BF BD FF F0 9F 98 80", [23, 23]);
    expect(store.utf8.value.value).toBe("�\uFFFC😀");
    expect(store.utf8.value.markers).toEqual([{ index: 1, hex: "FF" }]);
    store.update("utf8", "�\uFFFC😁", [4, 4], [2, 4]);
    expect(store.binary.value.value).toBe("EF BF BD FF F0 9F 98 81");
  });
});
