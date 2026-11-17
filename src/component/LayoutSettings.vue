<template>
<dialog ref="layoutDialog" class="layout-dialog" aria-labelledby="layout-title">
  <h2 id="layout-title">レイアウト設定</h2>
  <fieldset>
    <legend>表示モード</legend>
    <label><input v-model="layout.theme" type="radio" name="theme" value="light" autofocus /> ライト</label>
    <label><input v-model="layout.theme" type="radio" name="theme" value="dark" /> ダーク</label>
  </fieldset>
  <fieldset>
    <legend>パネルの並び方</legend>
    <label><input v-model="layout.arrangement" type="radio" name="arrangement" value="horizontal" /> 横並び</label>
    <label><input v-model="layout.arrangement" type="radio" name="arrangement" value="vertical" /> 縦並び</label>
    <label>
      <input v-model="layout.arrangement" type="radio" name="arrangement" value="vertical-overflow" />
      縦並び（長い行は右にスクロール）
    </label>
  </fieldset>
  <label class="binary-option">
    <input v-model="layout.showBinary" type="checkbox" />
    バイト列パネルを表示
  </label>
  <form method="dialog">
    <button type="submit">閉じる</button>
  </form>
</dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const layoutDialog = ref<HTMLDialogElement | null>(null);
type Theme = "light" | "dark";
type Arrangement = "horizontal" | "vertical" | "vertical-overflow";
type LayoutSettings = { theme: Theme; arrangement: Arrangement; showBinary: boolean };

function isArrangement(value: unknown): value is Arrangement {
  return value === "horizontal" || value === "vertical" || value === "vertical-overflow";
}

const layoutKey = "mojibake-assist-layout";
const legacyThemeKey = "mojibake-assist-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function readLayoutSettings(): LayoutSettings {
  const defaults: LayoutSettings = {
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    arrangement: window.matchMedia("(max-width: 900px)").matches ? "vertical" : "horizontal",
    showBinary: true,
  };
  try {
    const raw = localStorage.getItem(layoutKey);
    if (raw !== null) {
      try {
        const saved = JSON.parse(raw) as Record<string, unknown> | null;
        return {
          theme: isTheme(saved?.theme) ? saved.theme : defaults.theme,
          arrangement: isArrangement(saved?.arrangement) ? saved.arrangement : defaults.arrangement,
          showBinary: typeof saved?.showBinary === "boolean" ? saved.showBinary : defaults.showBinary,
        };
      } catch {
        // Ignore invalid JSON and try the old preference.
      }
    }

    const legacyTheme = localStorage.getItem(legacyThemeKey);
    if (isTheme(legacyTheme)) return { ...defaults, theme: legacyTheme };
  } catch {
    // Theme selection still works when storage is unavailable.
  }

  return defaults;
}

const layout = ref<LayoutSettings>(readLayoutSettings());
watch(
  layout,
  (settings) => {
    const { dataset } = document.documentElement;
    dataset.theme = settings.theme;
    dataset.arrangement = settings.arrangement;
    dataset.binary = settings.showBinary ? "visible" : "hidden";
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
.binary-option {
  margin-block-end: 1rem;
}
.layout-dialog form {
  text-align: right;
}
</style>
