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
        <EncodingPanel
          v-for="p in panels"
          :key="p.id"
          :kind="p.id"
          :title="p.title"
          :subtitle="p.subtitle"
          :value="
            p.id === 'hex' && pendingHex !== null
              ? pendingHex
              : displays[p.id].text
          "
          :count-label="
            p.id === 'hex'
              ? `${bytes.length} bytes`
              : `${displays[p.id].text.length}文字`
          "
          :selection="characterRange(displays[p.id], ...selected)"
          :apply-selection="pendingHex === null && selectionSource !== p.id"
          :show-highlight="pendingHex === null && selected[0] !== selected[1]"
          :invalid="p.id === 'hex' && !!error"
          @edit="(value, range) => update(p.id, value, range)"
          @selection-change="select(p.id, $event)"
        />
      </section>
      <div v-if="error" class="error" role="alert">
        {{ error }} 他のビューは最後に確定したバイト列を表示しています。
      </div>
      <div class="status" aria-live="polite">
        <span
          ><b>{{ selectedBytes.start }} — {{ selectedBytes.end }}</b>
          <span class="muted"
            >（{{ selectedBytes.count }} bytes）</span
          >選択中</span
        >
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
import EncodingPanel from "./EncodingPanel.vue";
import {
  byteRangeToHex,
  characterRange,
  display,
  encode,
  normalizeHexRange,
  parseHex,
  selectedByteCount,
  type Range,
  type ViewType,
} from "./codec";

const bytes = ref<Uint8Array>(new Uint8Array());
const selected = ref<Range>([0, 0]);
const selectedBytes = computed(() => {
  const count = selectedByteCount(selected.value);
  // A HEX separator denotes the boundary before the next byte.
  const start = Math.floor((selected.value[0] + 1) / 3);
  return { start, end: start + count, count };
});
const error = ref("");
const pendingHex = ref<string | null>(null);
const selectionSource = ref<ViewType | null>(null);

const panels: { id: ViewType; title: string; subtitle: string; }[] =
  [
    {
      id: "sjis",
      title: "Shift-JIS",
      subtitle: "文字化けしたテキスト",
    },
    { id: "hex", title: "Binary", subtitle: "バイト列 · 16進数" },
    { id: "utf8", title: "UTF-8", subtitle: "復元後のテキスト" },
  ];

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
