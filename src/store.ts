import { computed, ref } from "vue";
import {
  byteRangeToHex,
  characterRange,
  display,
  encode,
  normalizeHexRange,
  parseHex,
  type Range,
  type ViewType,
} from "./codec";

import { shiftJisDisplay, textByteEdit, spliceBytes } from "./byteEditor";

export function createPanelStore() {
  const bytes = ref<Uint8Array>(new Uint8Array());
  const selected = ref<Range>([0, 0]);
  const error = computed(() =>
    pendingHex.value === null
      ? ""
      : "16進数を2桁ずつ入力してください（空白・改行で区切れます）。",
  );
  const pendingHex = ref<string | null>(null);
  const selectionSource = ref<ViewType | null>(null);

  const draftSelection = ref<Range>([0, 0]);
  type Snapshot = {
    bytes: Uint8Array;
    selection: Range;
    draft: string | null;
    draftSelection: Range;
  };
  const undo: Snapshot[] = [];
  const redo: Snapshot[] = [];
  const snapshot = (): Snapshot => ({
    bytes: bytes.value,
    selection: selected.value,
    draft: pendingHex.value,
    draftSelection: draftSelection.value,
  });
  function recordEdit() {
    undo.push(snapshot());
    if (undo.length > 100) undo.shift();
    redo.length = 0;
  }
  function editHistory(direction: "undo" | "redo") {
    const [from, to] = direction === "undo" ? [undo, redo] : [redo, undo];
    const entry = from.pop();
    if (!entry) return;
    to.push(snapshot());
    bytes.value = entry.bytes;
    selected.value = entry.selection;
    pendingHex.value = entry.draft;
    draftSelection.value = entry.draftSelection;
    selectionSource.value = null;
  }

  const showHighlight = computed(
    () => pendingHex.value === null && selected.value[0] !== selected.value[1],
  );

  const displays = computed(() => ({
    sjis: shiftJisDisplay(bytes.value, true),
    hex: display(bytes.value, "hex"),
    utf8: display(bytes.value, "utf8", "\uFFFC"),
  }));

  function select(id: ViewType, [start, end]: Range) {
    if (pendingHex.value !== null) {
      if (id === "hex") draftSelection.value = [start, end];
      return;
    }
    selectionSource.value = id;
    const { boundaries } = displays.value[id];
    selected.value =
      id === "hex"
        ? [start, end]
        : byteRangeToHex(
            boundaries[start]!,
            boundaries[end]!,
            displays.value.hex.text.length,
          );
  }

  function update(id: ViewType, value: string, [a, b]: Range, before?: Range) {
    if (id !== "hex") {
      const previous = displays.value[id];
      if (!before && value === previous.text) return;
      const edit = textByteEdit(previous, value, b, id, before);
      replaceBytes(edit.range, edit.inserted, edit.caret);
      return;
    }
    if (value !== (pendingHex.value ?? displays.value.hex.text)) recordEdit();
    const parsed = parseHex(value);
    if (!parsed) {
      pendingHex.value = value;
      draftSelection.value = [a, b];
      selectionSource.value = "hex";
      return;
    }
    bytes.value = parsed;
    pendingHex.value = null;
    selectionSource.value = null;
    selected.value = normalizeHexRange(value, [a, b]);
  }

  function replaceBytes(
    range: Range,
    inserted: Uint8Array,
    caret = range[0] + inserted.length,
  ) {
    recordEdit();
    bytes.value = spliceBytes(bytes.value, range, inserted);
    pendingHex.value = null;
    selectionSource.value = null;
    selected.value = byteRangeToHex(
      caret,
      caret,
      displays.value.hex.text.length,
    );
  }

  function copyTextBytes(id: "sjis" | "utf8", range: Range) {
    const { boundaries } = displays.value[id];
    return bytes.value.slice(boundaries[range[0]]!, boundaries[range[1]]!);
  }

  function pasteBytes(id: ViewType, range: Range, inserted: Uint8Array) {
    if (id === "hex") {
      const value = pendingHex.value ?? displays.value.hex.text;
      const hex = display(inserted, "hex").text.replaceAll(" ", "");
      const before = value.slice(0, range[0]);
      const after = value.slice(range[1]);
      const caret = before.length + hex.length;
      if (!parseHex(before + hex + after)) return false;
      update("hex", before + hex + after, [caret, caret]);
      return true;
    }
    const { boundaries } = displays.value[id];
    replaceBytes([boundaries[range[0]]!, boundaries[range[1]]!], inserted);
    return true;
  }

  function sample() {
    recordEdit();
    bytes.value = encode("文字化けのテストです。", "utf8");
    pendingHex.value = null;
    selected.value = [0, 0];
    selectionSource.value = null;
  }

  function clear() {
    if (bytes.value.length || pendingHex.value !== null) recordEdit();
    selectionSource.value = null;
    bytes.value = new Uint8Array();
    pendingHex.value = null;
    selected.value = [0, 0];
  }

  const markers = computed(() => {
    function forView(id: "sjis" | "utf8") {
      const { boundaries, invalidOffsets } = displays.value[id];
      return (invalidOffsets ?? []).map((index) => ({
        index,
        hex: display(
          bytes.value.subarray(boundaries[index], boundaries[index + 1]),
          "hex",
        ).text,
      }));
    }
    return { sjis: forView("sjis"), utf8: forView("utf8") };
  });

  function panelState(id: ViewType) {
    return computed(() => ({
      value:
        id === "hex"
          ? (pendingHex.value ?? displays.value.hex.text)
          : displays.value[id].text,
      markers: id === "hex" ? undefined : markers.value[id],
      selection:
        id === "hex" && pendingHex.value !== null
          ? draftSelection.value
          : characterRange(displays.value[id], ...selected.value),
      applySelection:
        (id === "hex" || pendingHex.value === null) &&
        selectionSource.value !== id,
      showHighlight: showHighlight.value,
    }));
  }

  const shiftJis = panelState("sjis");
  const utf8 = panelState("utf8");
  const hex = panelState("hex");
  const binary = computed(() => ({
    ...hex.value,
    byteCount: bytes.value.length,
    invalid: pendingHex.value !== null,
  }));

  return {
    shiftJis,
    binary,
    utf8,
    error,
    select,
    update,
    sample,
    clear,
    copyTextBytes,
    pasteBytes,
    editHistory,
  };
}
