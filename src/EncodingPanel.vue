<template>
  <article :class="['panel', kind]">
    <div class="panel-head">
      <div class="panel-title">
        <span class="number">{{ number }}</span>
        <h2>{{ title }}</h2>
      </div>
      <span class="tag">{{ kind === "hex" ? "HEX" : "TEXT" }}</span>
    </div>
    <p class="subtitle">{{ subtitle }}</p>
    <div class="editor">
      <pre
        v-if="!focused && showHighlight"
        ref="mirror"
        class="selection-mirror"
        aria-hidden="true"
      ><span>{{ value.slice(0, selection[0]) }}</span><mark>{{ value.slice(...selection) }}</mark><span>{{ value.slice(selection[1]) }}</span></pre>
      <textarea
        ref="textarea"
        :value="value"
        :aria-label="title"
        :placeholder="
          kind === 'hex' ? 'E3 81 93 E3 82 93 …' : 'ここにテキストを入力…'
        "
        :class="{ invalid }"
        spellcheck="false"
        @focus="focused = true"
        @blur="blur"
        @scroll="syncScroll"
        @input="reportEdit"
        @select="reportSelection"
        @keyup="reportSelection"
        @pointerup="reportSelection"
        @compositionstart="composing = true"
        @compositionend="finishComposition"
      ></textarea>
    </div>
    <div class="panel-foot">
      <span>{{ countLabel }}</span><span>{{
        kind === "hex" ? "00 — FF" : "編集可能"
      }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { nextTick, ref, watchEffect } from "vue";
import type { View } from "./codec";

type Range = [number, number];
const props = defineProps<{
  kind: View;
  title: string;
  subtitle: string;
  number: string;
  value: string;
  countLabel: string;
  selection: Range;
  applySelection: boolean;
  showHighlight: boolean;
  invalid: boolean;
}>();
const emit = defineEmits<{
  edit: [value: string, selection: Range];
  "selection-change": [selection: Range];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const mirror = ref<HTMLPreElement | null>(null);
const focused = ref(false);
let composing = false;
let lastSelection: Range | undefined;

function readSelection(el: HTMLTextAreaElement): Range {
  return [el.selectionStart, el.selectionEnd];
}

function syncScroll() {
  if (!textarea.value || !mirror.value) return;
  mirror.value.scrollTop = textarea.value.scrollTop;
  mirror.value.scrollLeft = textarea.value.scrollLeft;
}

watchEffect(
  () => {
    const el = textarea.value;
    const [start, end] = props.selection;
    // Apply after Vue has updated the textarea value and rendered the mirror.
    if (el && props.applySelection && !composing) {
      if (el.selectionStart !== start || el.selectionEnd !== end) {
        el.setSelectionRange(start, end);
      }
      lastSelection = readSelection(el);
    }
    syncScroll();
  },
  { flush: "post" },
);

function reportSelection() {
  const el = textarea.value;
  if (!el || !focused.value || composing) return;
  const range = readSelection(el);
  if (lastSelection?.[0] === range[0] && lastSelection[1] === range[1]) return;
  lastSelection = range;
  emit("selection-change", range);
}

function reportEdit() {
  const el = textarea.value;
  if (!el || composing) return;
  lastSelection = readSelection(el);
  emit("edit", el.value, lastSelection);
}

function finishComposition() {
  composing = false;
  reportEdit();
}

function blur() {
  focused.value = false;
  void nextTick(syncScroll);
}
</script>
