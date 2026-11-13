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

  const showHighlight = computed(
    () => pendingHex.value === null && selected.value[0] !== selected.value[1],
  );

  const displays = computed(() => ({
    sjis: display(bytes.value, "sjis"),
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

  function update(id: ViewType, value: string, [a, b]: Range) {
    if (id === "hex") {
      const parsed = parseHex(value);
      if (!parsed) {
        pendingHex.value = value;

        return;
      }
      bytes.value = parsed;
    } else bytes.value = encode(value, id);
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

  function sample() {
    bytes.value = encode("こんにちは、世界！\n文字化けを、読み解こう。", "utf8");
    pendingHex.value = null;
    selected.value = [0, 0];
    selectionSource.value = null;
  }

  function clear() {
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

  return { shiftJis, binary, utf8, error, select, update, sample, clear };
}
