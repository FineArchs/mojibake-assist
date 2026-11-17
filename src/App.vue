<template>
  <div class="shell">
    <header>
      <a class="brand" href="./">
        <img class="brand-icon" src="../icon.png" alt="" width="37" height="37" />
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
      <section class="workspace" @copy="copy" @cut="cut" @paste="paste" @keydown="historyKey" @beforeinput="historyInput">
        <ShiftJisPanel
          v-bind="shiftJis"
          @edit="(value, range, before) => update('sjis', value, range, before)"
          @selection-change="select('sjis', $event)"
        />
        <BinaryPanel
          v-bind="binary"
          @edit="(value, range) => update('hex', value, range)"
          @selection-change="select('hex', $event)"
        />
        <Utf8Panel
          v-bind="utf8"
          @edit="(value, range, before) => update('utf8', value, range, before)"
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
import ShiftJisPanel from "./ShiftJisPanel.vue";
import BinaryPanel from "./BinaryPanel.vue";
import Utf8Panel from "./Utf8Panel.vue";
import { display, parseHex, type Range, type ViewType } from "./codec";
import { byteClipboardType } from "./byteEditor";
import { createPanelStore } from "./store";

const { shiftJis, binary, utf8, error, select, update, sample, clear, copyTextBytes, pasteBytes, textHistory } =
  createPanelStore();
function clipboardTarget(event: Event) {
  const el = event.target;
  if (!(el instanceof HTMLTextAreaElement)) return;
  const panel = el.closest(".panel");
  const id: ViewType | undefined = panel?.classList.contains("sjis") ? "sjis"
    : panel?.classList.contains("hex") ? "hex"
    : panel?.classList.contains("utf8") ? "utf8" : undefined;
  return id ? { id, range: [el.selectionStart, el.selectionEnd] as Range } : undefined;
}

function copy(event: ClipboardEvent) {
  const target = clipboardTarget(event);
  const clipboard = event.clipboardData;
  if (!target || target.id === "hex" || !clipboard || target.range[0] === target.range[1]) return;
  const bytes = copyTextBytes(target.id, target.range);
  clipboard.setData("text/plain", new TextDecoder(target.id === "sjis" ? "shift-jis" : "utf-8", { ignoreBOM: true }).decode(bytes));
  clipboard.setData(byteClipboardType, display(bytes, "hex").text);
  event.preventDefault();
  return target;
}

function cut(event: ClipboardEvent) {
  const target = copy(event);
  if (target) pasteBytes(target.id, target.range, new Uint8Array());
}

function paste(event: ClipboardEvent) {
  const target = clipboardTarget(event);
  const raw = event.clipboardData?.getData(byteClipboardType);
  if (!target || !raw) return;
  const bytes = parseHex(raw);
  if (bytes?.length && pasteBytes(target.id, target.range, bytes)) event.preventDefault();
}
function isTextEditor(event: Event) {
  const id = clipboardTarget(event)?.id;
  return id === "sjis" || id === "utf8";
}

function historyKey(event: KeyboardEvent) {
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey ||
      !isTextEditor(event)) return;
  const key = event.key.toLowerCase();
  if (key !== "z" && key !== "y") return;
  event.preventDefault();
  textHistory(key === "y" || event.shiftKey ? "redo" : "undo");
}

function historyInput(event: InputEvent) {
  if (!isTextEditor(event) || !event.cancelable) return;
  if (event.inputType !== "historyUndo" && event.inputType !== "historyRedo") return;
  event.preventDefault();
  textHistory(event.inputType === "historyUndo" ? "undo" : "redo");
}
</script>
