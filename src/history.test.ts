import { describe, expect, it } from "vitest";
import { createPanelStore } from "./store";

describe("shared edit history", () => {
  it("restores commits and unfinished HEX edits in both directions", () => {
    const store = createPanelStore();
    store.update("utf8", "A", [1, 1]);
    store.update("hex", "41 F", [4, 4]);
    store.update("hex", "41 FF", [5, 5]);

    store.editHistory("undo");
    expect(store.binary.value).toMatchObject({
      value: "41 F", selection: [4, 4], invalid: true, applySelection: true,
    });
    expect(store.utf8.value.value).toBe("A");

    store.editHistory("undo");
    expect(store.binary.value.value).toBe("41");
    store.editHistory("undo");
    expect(store.binary.value.value).toBe("");

    for (let i = 0; i < 3; i++) store.editHistory("redo");
    expect(store.binary.value.value).toBe("41 FF");
    expect(store.utf8.value.markers).toEqual([{ index: 1, hex: "FF" }]);
  });

  it("undoes clear and discards redo after a new edit", () => {
    const store = createPanelStore();
    store.update("hex", "FF", [2, 2]);
    store.clear();
    store.editHistory("undo");
    expect(store.binary.value.value).toBe("FF");
    store.update("hex", "82", [2, 2]);
    store.editHistory("redo");
    expect(store.binary.value.value).toBe("82");
  });
});
