<template>
  <EncodingPanel
    v-bind="props"
    kind="utf8"
    title="UTF-8"
    subtitle="復元後のテキスト（枠内は不正なバイト列）"
    placeholder="ここにテキストを入力…"
    :count-label="`${Array.from(props.value).length}文字`"
    :position-label="label"
    @edit="(value, range, before) => emit('edit', value, range, before)"
    @selection-change="emit('selection-change', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import EncodingPanel from "./EncodingPanel.vue";
import { textPositionLabel, type PanelEvents, type PanelProps } from "./panel";

const props = defineProps<PanelProps>();
const emit = defineEmits<PanelEvents>();
const label = computed(() =>
  textPositionLabel(props.value, props.selection),
);
</script>
