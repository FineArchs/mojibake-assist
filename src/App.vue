<template>
  <div class="shell">
    <header>
      <a class="brand" href="./">
        <span class="brand-icon">縺</span>
        文字化けアシスト
      </a>
      <div class="toolbar">
        <div class="actions">
          <button @click="sample">サンプルを試す <span>↓</span></button
          ><button @click="clear">クリア</button>
        </div>
      </div>
    </header>
    <div class="divider"></div>
    <main>
      <section class="workspace">
        <ShiftJisPanel
          :value="displays.sjis.text"
          :selection="characterRange(displays.sjis, ...selected)"
          :apply-selection="pendingHex === null && selectionSource !== 'sjis'"
          :show-highlight="showHighlight"
          @edit="(value, range) => update('sjis', value, range)"
          @selection-change="select('sjis', $event)"
        />
        <BinaryPanel
          :value="pendingHex ?? displays.hex.text"
          :byte-count="bytes.length"
          :invalid="!!error"
          :selection="characterRange(displays.hex, ...selected)"
          :apply-selection="pendingHex === null && selectionSource !== 'hex'"
          :show-highlight="showHighlight"
          @edit="(value, range) => update('hex', value, range)"
          @selection-change="select('hex', $event)"
        />
        <Utf8Panel
          :value="displays.utf8.text"
          :selection="characterRange(displays.utf8, ...selected)"
          :apply-selection="pendingHex === null && selectionSource !== 'utf8'"
          :show-highlight="showHighlight"
          @edit="(value, range) => update('utf8', value, range)"
          @selection-change="select('utf8', $event)"
        />
      </section>
      <div v-if="error" class="error" role="alert">
        {{ error }} 他のビューは最後に確定したバイト列を表示しています。
      </div>
    </main>
    <div class="divider"></div>
    <footer>
      <span>Mojibake Assist</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ShiftJisPanel from "./ShiftJisPanel.vue";
import BinaryPanel from "./BinaryPanel.vue";
import Utf8Panel from "./Utf8Panel.vue";
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

const bytes = ref<Uint8Array>(new Uint8Array());
const selected = ref<Range>([0, 0]);
const error = ref("");
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
      error.value =
        "16進数を2桁ずつ入力してください（空白・改行で区切れます）。";
      return;
    }
    bytes.value = parsed;
  } else bytes.value = encode(value, id);
  pendingHex.value = null;
  error.value = "";
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
  error.value = "";
  selected.value = [0, 0];
  selectionSource.value = null;
}

function clear() {
  selectionSource.value = null;
  bytes.value = new Uint8Array();
  pendingHex.value = null;
  error.value = "";
  selected.value = [0, 0];
}
</script>
