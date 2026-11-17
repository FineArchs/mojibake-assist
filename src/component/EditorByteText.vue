<template>
  <div
    ref="editor"
    class="byte-text-editor"
    data-byte-editor
    contenteditable="plaintext-only"
    role="textbox"
    aria-multiline="true"
    :aria-label="title"
    :data-placeholder="placeholder"
    :data-empty="value.length === 0"
    spellcheck="false"
    @focus="focus"
    @blur="focused = false"
    @beforeinput="beforeInput"
    @input="reportEdit"
    @pointerup="reportSelection"
    @keyup="reportSelection"
    @compositionstart="startComposition"
    @compositionend="finishComposition"
    @dragstart.prevent
    @drop.prevent
  ></div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watchEffect } from "vue";
import type { Range } from "../codec";
import {
  applyEditorSelection,
  editorSelection,
  editorText,
} from "../editorDom";
import type { ByteMarker, PanelEvents, PanelProps } from "../panel";

const props = defineProps<
  PanelProps & {
    title: string;
    placeholder: string;
  }
>();
const emit = defineEmits<PanelEvents>();
const editor = ref<HTMLDivElement | null>(null);
const focused = ref(false);
const composing = ref(false);
let before: Range | undefined;
let last: Range | undefined;

function paint(
  el: HTMLDivElement,
  value: string,
  markers: ByteMarker[],
  highlight?: Range,
) {
  const fragment = document.createDocumentFragment();
  function appendText(start: number, end: number) {
    const from = Math.max(start, Math.min(end, highlight?.[0] ?? end));
    const to = Math.max(from, Math.min(end, highlight?.[1] ?? end));
    fragment.append(value.slice(start, from));
    if (from < to) {
      const mark = document.createElement("mark");
      mark.textContent = value.slice(from, to);
      fragment.append(mark);
    }
    fragment.append(value.slice(to, end));
  }
  let offset = 0;
  for (const { index, hex } of markers) {
    appendText(offset, index);
    const atom = document.createElement("span");
    atom.contentEditable = "false";
    atom.className = "byte-marker";
    atom.dataset.byteMarker = value[index]!;
    atom.textContent = hex;
    atom.setAttribute("aria-label", `不正なバイト列 ${hex}`);
    if (highlight && index >= highlight[0] && index < highlight[1])
      atom.classList.add("selected");
    fragment.append(atom);
    offset = index + 1;
  }
  appendText(offset, value.length);
  if (value.endsWith("\n")) {
    const tail = document.createElement("br");
    tail.setAttribute("data-editor-tail", "");
    fragment.append(tail);
  }
  el.replaceChildren(fragment);
}

function paintActiveSelection(el: HTMLElement, range?: Range) {
  for (const [index, atom] of el.querySelectorAll(".byte-marker").entries()) {
    const offset = props.markers?.[index]?.index;
    atom.classList.toggle(
      "active-selection",
      !!range &&
        offset !== undefined &&
        range[0] <= offset &&
        offset < range[1],
    );
  }
}

function reconcile(force = false) {
  const el = editor.value;
  if (!el || composing.value) return;
  const selection = props.selection;
  const markers = props.markers ?? [];
  const active = focused.value;
  const highlight = !active && props.showHighlight ? selection : undefined;
  const current = active ? editorSelection(el) : undefined;
  if (
    force ||
    editorText(el) !== props.value ||
    !active ||
    el.querySelector("mark,.byte-marker.selected") ||
    Array.from(el.querySelectorAll(".byte-marker"), (e) => e.textContent).join(
      "|",
    ) !== markers.map((marker) => marker.hex).join("|")
  ) {
    paint(el, props.value, markers, highlight);
  }
  if (active) {
    const wanted = props.applySelection ? selection : current;
    if (wanted) {
      const actual = editorSelection(el);
      last = wanted;
      if (actual?.[0] !== wanted[0] || actual[1] !== wanted[1])
        applyEditorSelection(el, wanted);
      paintActiveSelection(el, wanted);
    }
  }
}
watchEffect(() => reconcile(), { flush: "post" });

function focus() {
  focused.value = true;
}

function reportSelection() {
  const el = editor.value;
  if (!el || !focused.value || composing.value || before) return;
  const range = editorSelection(el);
  paintActiveSelection(el, range);
  if (!range || (range[0] === last?.[0] && range[1] === last[1])) return;
  last = range;
  emit("selection-change", range);
}
onMounted(() => document.addEventListener("selectionchange", reportSelection));
onUnmounted(() =>
  document.removeEventListener("selectionchange", reportSelection),
);

function beforeInput(event: InputEvent) {
  const el = editor.value;
  if (
    !el ||
    composing.value ||
    event.defaultPrevented ||
    event.inputType === "historyUndo" ||
    event.inputType === "historyRedo"
  )
    return;
  before = editorSelection(el);
  if (!before || !event.cancelable) return;
  const [start, end] = before;
  const lineBreak =
    event.inputType === "insertParagraph" ||
    event.inputType === "insertLineBreak";
  // Handle deleting an atom explicitly; its label must never become editable text.
  const marker = (index: number) =>
    props.markers?.some((atom) => atom.index === index);
  const back =
    start === end &&
    event.inputType === "deleteContentBackward" &&
    marker(start - 1);
  const forward =
    start === end &&
    event.inputType === "deleteContentForward" &&
    marker(start);
  if (!lineBreak && !back && !forward) return;
  event.preventDefault();
  const a = back ? start - 1 : start;
  const b = forward ? end + 1 : end;
  const inserted = lineBreak ? "\n" : "";
  before = undefined;
  emit(
    "edit",
    props.value.slice(0, a) + inserted + props.value.slice(b),
    [a + inserted.length, a + inserted.length],
    [a, b],
  );
  void nextTick(() => reconcile(true));
}

function reportEdit() {
  const el = editor.value;
  if (!el || composing.value) return;
  const previous = before;
  before = undefined;
  const value = editorText(el);
  if (value === props.value && (!previous || previous[0] === previous[1]))
    return;
  const range = editorSelection(el) ?? [value.length, value.length];
  last = range;
  emit("edit", value, range, previous);
  void nextTick(() => reconcile(true));
}

function startComposition() {
  before = editor.value ? editorSelection(editor.value) : undefined;
  composing.value = true;
}
function finishComposition() {
  composing.value = false;
  reportEdit();
}
</script>
