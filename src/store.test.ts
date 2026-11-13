import { describe, expect, it } from "vitest";
import { createPanelStore } from "./store";

describe("panel store", () => {
  it("preserves an exact HEX selection while highlighting the matching character", () => {
    const store = createPanelStore();
    store.update("utf8", "あ", [1, 1]);
    store.select("hex", [2, 3]);

    expect(store.binary.value).toMatchObject({
      value: "E3 81 82",
      selection: [2, 3],
      applySelection: false,
    });
    expect(store.utf8.value).toMatchObject({
      selection: [0, 1],
      applySelection: true,
      showHighlight: true,
    });
  });

  it("keeps committed bytes while HEX input is incomplete", () => {
    const store = createPanelStore();
    store.update("utf8", "A", [1, 1]);
    store.update("hex", "4", [1, 1]);

    expect(store.binary.value).toMatchObject({ value: "4", invalid: true, byteCount: 1 });
    expect(store.utf8.value.value).toBe("A");
    expect(store.error.value).not.toBe("");

    store.update("hex", "42", [2, 2]);
    expect(store.binary.value.invalid).toBe(false);
    expect(store.utf8.value.value).toBe("B");
    expect(store.error.value).toBe("");
  });
});
