<template>
  <div class="shell">
    <header>
      <a class="brand" href="./">
        <img class="brand-icon" src="../../icon.png" alt="" width="37" height="37" />
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
        <PanelShiftJis
          v-bind="shiftJis"
          @edit="(value, range, before) => update('sjis', value, range, before)"
          @selection-change="select('sjis', $event)"
        />
        <PanelBinary
          v-bind="binary"
          @edit="(value, range) => update('hex', value, range)"
          @selection-change="select('hex', $event)"
        />
        <PanelUtf8
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
import PanelShiftJis from "./PanelShiftJis.vue";
import PanelBinary from "./PanelBinary.vue";
import PanelUtf8 from "./PanelUtf8.vue";
import { display, encode, parseHex, type Range, type ViewType } from "../codec";
import { editorSelection } from "../editorDom";
import { byteClipboardType } from "../byteEditor";
import { createPanelStore } from "../store";

const { shiftJis, binary, utf8, error, select, update, sample, clear, copyTextBytes, pasteBytes, editHistory } =
  createPanelStore();
function clipboardTarget(event: Event) {
  const el = event.target;
  if (!(el instanceof HTMLElement)) return;
  const panel = el.closest(".panel");
  const id: ViewType | undefined = panel?.classList.contains("sjis") ? "sjis"
    : panel?.classList.contains("hex") ? "hex"
    : panel?.classList.contains("utf8") ? "utf8" : undefined;
  const range: Range | undefined = el instanceof HTMLTextAreaElement
    ? [el.selectionStart, el.selectionEnd]
    : el.hasAttribute("data-byte-editor") ? editorSelection(el) : undefined;
  return id && range ? { id, range } : undefined;
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
  if (!target || !event.clipboardData) return;
  const bytes = raw ? parseHex(raw) : null;
  if (bytes?.length && pasteBytes(target.id, target.range, bytes)) {
    event.preventDefault();
  } else if (target.id !== "hex") {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    if (text) pasteBytes(target.id, target.range, encode(text, target.id));
  }
}
function isPanelEditor(event: Event) {
  return event.target instanceof HTMLElement &&
    event.target.matches("textarea, [data-byte-editor]");
}

function historyKey(event: KeyboardEvent) {
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey ||
      !isPanelEditor(event)) return;
  const key = event.key.toLowerCase();
  if (key !== "z" && key !== "y") return;
  event.preventDefault();
  editHistory(key === "y" || event.shiftKey ? "redo" : "undo");
}

function historyInput(event: InputEvent) {
  if (!isPanelEditor(event) || !event.cancelable) return;
  if (event.inputType !== "historyUndo" && event.inputType !== "historyRedo") return;
  event.preventDefault();
  editHistory(event.inputType === "historyUndo" ? "undo" : "redo");
}
</script>
