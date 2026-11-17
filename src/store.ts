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

import { shiftJisDisplay, shiftJisEdit, spliceBytes } from "./sjisEditor";

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

  type Snapshot = { bytes: Uint8Array; selection: Range };
  const undo: Snapshot[] = [];
  const redo: Snapshot[] = [];
  const snapshot = (): Snapshot => ({ bytes: bytes.value, selection: selected.value });
  function resetHistory() {
    undo.length = redo.length = 0;
  }
  function shiftJisHistory(direction: "undo" | "redo") {
    const [from, to] = direction === "undo" ? [undo, redo] : [redo, undo];
    const entry = from.pop();
    if (!entry) return;
    to.push(snapshot());
    bytes.value = entry.bytes;
    selected.value = entry.selection;
    pendingHex.value = null;
    selectionSource.value = null;
  }

  const showHighlight = computed(
    () => pendingHex.value === null && selected.value[0] !== selected.value[1],
  );

  const displays = computed(() => ({
    sjis: shiftJisDisplay(bytes.value),
    hex: display(bytes.value, "hex"),
    utf8: display(bytes.value, "utf8"),
  }));

  function select(id: ViewType, [start, end]: Range) {
    if (pendingHex.value !== null) return;
    selectionSource.value = id;
    const { boundaries } = displays.value[id];
    selected.value = id === "hex"
      ? [start, end]
      : byteRangeToHex(boundaries[start]!, boundaries[end]!, displays.value.hex.text.length);
  }

  function update(id: ViewType, value: string, [a, b]: Range, before?: Range) {
    if (id === "sjis") {
      const previous = displays.value.sjis;
      if (!before && value === previous.text) return;
      const edit = shiftJisEdit(previous, value, b, before);
      replaceBytes(edit.range, edit.inserted, edit.caret, true);
      return;
    }
    if (id === "hex") {
      const parsed = parseHex(value);
      if (!parsed) {
        pendingHex.value = value;

        return;
      }
      bytes.value = parsed;
    } else bytes.value = encode(value, id);
    resetHistory();
    pendingHex.value = null;
    selectionSource.value = null;
    selected.value = id === "hex"
      ? normalizeHexRange(value, [a, b])
      : byteRangeToHex(
          encode(value.slice(0, a), id).length,
          encode(value.slice(0, b), id).length,
          displays.value.hex.text.length,
        );
  }

  function replaceBytes(range: Range, inserted: Uint8Array, caret = range[0] + inserted.length, track = false) {
    if (track) {
      undo.push(snapshot());
      redo.length = 0;
    } else resetHistory();
    bytes.value = spliceBytes(bytes.value, range, inserted);
    pendingHex.value = null;
    selectionSource.value = null;
    selected.value = byteRangeToHex(caret, caret, displays.value.hex.text.length);
  }

  function copyShiftJis(range: Range) {
    const { boundaries } = displays.value.sjis;
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
    replaceBytes([boundaries[range[0]]!, boundaries[range[1]]!], inserted, undefined, id === "sjis");
    return true;
  }

  function sample() {
    resetHistory();
    bytes.value = encode("文字化けのテストです。", "utf8");
    pendingHex.value = null;
    selected.value = [0, 0];
    selectionSource.value = null;
  }

  function clear() {
    resetHistory();
    selectionSource.value = null;
    bytes.value = new Uint8Array();
    pendingHex.value = null;
    selected.value = [0, 0];
  }

  function panelState(id: ViewType) {
    return computed(() => ({
      value: id === "hex"
        ? pendingHex.value ?? displays.value.hex.text
        : displays.value[id].text,
      selection: characterRange(displays.value[id], ...selected.value),
      applySelection: pendingHex.value === null && selectionSource.value !== id,
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

  return { shiftJis, binary, utf8, error, select, update, sample, clear, copyShiftJis, pasteBytes, shiftJisHistory };
}
