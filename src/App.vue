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
      <section class="workspace">
        <ShiftJisPanel
          v-bind="shiftJis"
          @edit="(value, range) => update('sjis', value, range)"
          @selection-change="select('sjis', $event)"
        />
        <BinaryPanel
          v-bind="binary"
          @edit="(value, range) => update('hex', value, range)"
          @selection-change="select('hex', $event)"
        />
        <Utf8Panel
          v-bind="utf8"
          @edit="(value, range) => update('utf8', value, range)"
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
import { createPanelStore } from "./store";

const { shiftJis, binary, utf8, error, select, update, sample, clear } =
  createPanelStore();
</script>
