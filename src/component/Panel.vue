<template>
  <article :class="['panel', kind]">
    <div class="panel-head">
      <h2 class="panel-title">{{ title }}</h2>
      <div class="subtitle">{{ subtitle }}</div>
    </div>
    <slot />
    <div class="panel-foot" :class="{ 'has-error': error }">
      <span>{{ countLabel }}</span>
      <span>{{ positionLabel }}</span>
      <span v-if="error !== undefined" class="panel-error" role="alert" :title="error">
        {{ error }}
      </span>
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
  error?: string;
}>();
</script>
