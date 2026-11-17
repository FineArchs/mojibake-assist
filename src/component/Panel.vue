<template>
  <article :class="['panel', kind]">
    <div class="panel-head">
      <div class="panel-title">
        <h2>{{ title }}</h2>
      </div>
    </div>
    <p class="subtitle">{{ subtitle }}</p>
    <slot />
    <div class="panel-foot">
      <span>{{ countLabel }}</span>
      <span>{{ positionLabel }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ViewType } from "../codec";

defineProps<{
  kind: ViewType;
  title: string;
  subtitle: string;
  countLabel: string;
  positionLabel: string;
}>();
</script>
