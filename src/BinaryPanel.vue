<template>
  <EncodingPanel
    :value="props.value"
    :selection="props.selection"
    :apply-selection="props.applySelection"
    :show-highlight="props.showHighlight"
    :invalid="props.invalid"
    kind="hex"
    title="Binary"
    subtitle="バイト列 · 16進数"
    placeholder="E3 81 93 E3 82 93 …"
    :count-label="`${props.byteCount} bytes`"
    :position-label="label"
    @edit="(value, range) => emit('edit', value, range)"
    @selection-change="emit('selection-change', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import EncodingPanel from "./EncodingPanel.vue";
import { selectedByteCount } from "./codec";
import { positionLabel, type PanelEvents, type PanelProps } from "./panel";

const props = defineProps<PanelProps & { byteCount: number; invalid: boolean }>();
const emit = defineEmits<PanelEvents>();
const label = computed(() =>
  props.invalid ? "—" : positionLabel(
    Math.floor((props.selection[0] + 1) / 3),
    selectedByteCount(props.selection),
    "バイト",
  ),
);
</script>
