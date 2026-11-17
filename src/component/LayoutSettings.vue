<template>
<dialog ref="layoutDialog" class="layout-dialog" aria-labelledby="layout-title">
  <h2 id="layout-title">レイアウト設定</h2>
  <fieldset>
    <legend>表示モード</legend>
    <label><input v-model="layout.theme" type="radio" value="light" autofocus /> ライト</label>
    <label><input v-model="layout.theme" type="radio" value="dark" /> ダーク</label>
  </fieldset>
  <form method="dialog">
    <button type="submit">閉じる</button>
  </form>
</dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const layoutDialog = ref<HTMLDialogElement | null>(null);
type Theme = "light" | "dark";
type LayoutSettings = { theme: Theme };

const layoutKey = "mojibake-assist-layout";
const legacyThemeKey = "mojibake-assist-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function readLayoutSettings(): LayoutSettings {
  try {
    const raw = localStorage.getItem(layoutKey);
    if (raw !== null) {
      try {
        const saved = JSON.parse(raw) as { theme?: unknown } | null;
        if (isTheme(saved?.theme)) return { theme: saved.theme };
      } catch {
        // Ignore invalid JSON and try the old preference.
      }
    }

    const legacyTheme = localStorage.getItem(legacyThemeKey);
    if (isTheme(legacyTheme)) return { theme: legacyTheme };
  } catch {
    // Theme selection still works when storage is unavailable.
  }

  return {
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  };
}

const layout = ref<LayoutSettings>(readLayoutSettings());
watch(
  layout,
  (settings) => {
    document.documentElement.dataset.theme = settings.theme;
    try {
      localStorage.setItem(layoutKey, JSON.stringify(settings));
      localStorage.removeItem(legacyThemeKey);
    } catch {
      // Keep the selection for this session.
    }
  },
  { deep: true, immediate: true },
);

function open() {
  const dialog = layoutDialog.value;
  if (dialog && !dialog.open) dialog.showModal();
}

defineExpose({ open });
</script>

<style scoped>
.layout-dialog {
  inline-size: min(24rem, calc(100% - 2rem));
  padding: 1.25rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
}
.layout-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}
.layout-dialog fieldset {
  margin: 1rem 0;
  padding: .5rem .75rem;
  border: 1px solid var(--panel-border);
  border-radius: 6px;
}
.layout-dialog label {
  display: flex;
  align-items: center;
  gap: .5rem;
  min-block-size: 2.25rem;
  cursor: pointer;
}
.layout-dialog form {
  text-align: right;
}
</style>
