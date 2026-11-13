<template>
  <div class="shell">
    <header>
      <a class="brand" href="./">
        <span class="brand-icon">縺</span>
        文字化けアシスト
      </a>
    </header>
    <main>
      <div class="toolbar">
        <div class="actions">
          <button @click="sample">サンプルを試す <span>↗</span></button
          ><button @click="clear">クリア</button>
        </div>
      </div>
      <section class="workspace">
        <EncodingPanel
          v-for="p in panels"
          :key="p.id"
          :kind="p.id"
          :title="p.title"
          :subtitle="p.subtitle"
          :number="p.number"
          :value="p.id === 'hex' && pendingHex !== null ? pendingHex : views[p.id].text"
          :count-label="p.id === 'hex' ? `${bytes.length} bytes` : `${views[p.id].text.length} UTF-16 units`"
          :selection="characterRange(views[p.id], ...selected)"
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
        <span><i></i> {{ bytes.length }} bytes</span
        ><span
          >選択範囲 <b>{{ selected[0] }} — {{ selected[1] }}</b>
          <span class="muted"
            >（{{ selected[1] - selected[0] }} bytes）</span
          ></span
        >
      </div>
      <aside>
        <span class="info">i</span>
        <div>
          <strong>使い方</strong>
          <p>
            どの欄からでも入力できます。文字を選択すると、対応するバイト範囲が他の欄でも選択されます。
          </p>
          <p>
            Shift-JISにない文字は「?」に変換されます。不正なバイトは「�」などで表示されますが、編集するまでは元のバイトを保持します。文字の途中のバイト選択は、文字境界に丸めて表示します。
          </p>
        </div>
      </aside>
    </main>
    <footer>
      <span>MOJIBAKE LAB</span><span>データはサーバーに送信されません。</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import EncodingPanel from "./EncodingPanel.vue";
import { characterRange, display, encode, parseHex, type View } from "./codec";

const bytes = ref<Uint8Array>(new Uint8Array());
const selected = ref<[number, number]>([0, 0]);
const error = ref("");
const pendingHex = ref<string | null>(null);
const selectionSource = ref<View | null>(null);

const panels: { id: View; title: string; subtitle: string; number: string }[] =
  [
    {
      id: "sjis",
      title: "Shift-JIS",
      subtitle: "シフトJISとして解釈",
      number: "01",
    },
    { id: "hex", title: "Binary", subtitle: "バイト列 · 16進数", number: "02" },
    { id: "utf8", title: "UTF-8", subtitle: "UTF-8として解釈", number: "03" },
  ];

const views = computed(() => ({
  sjis: display(bytes.value, "sjis"),
  hex: display(bytes.value, "hex"),
  utf8: display(bytes.value, "utf8"),
}));

function select(id: View, [start, end]: [number, number]) {
  if (pendingHex.value !== null) return;
  const d = views.value[id];
  selectionSource.value = id;
  selected.value = [
    d.boundaries[start] ?? 0,
    d.boundaries[end] ?? bytes.value.length,
  ];
}

function update(id: View, value: string, [a, b]: [number, number]) {
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
  selected.value =
    id === "hex"
      ? [
          Math.floor(value.slice(0, a).replace(/\s/g, "").length / 2),
          Math.floor(value.slice(0, b).replace(/\s/g, "").length / 2),
        ]
      : [
          encode(value.slice(0, a), id).length,
          encode(value.slice(0, b), id).length,
        ];
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