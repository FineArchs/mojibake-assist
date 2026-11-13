<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { characterRange, display, encode, parseHex, type View } from './codec'
const bytes = ref<Uint8Array>(new Uint8Array())
const selected = ref<[number, number]>([0, 0])
const error = ref('')
const pendingHex = ref<string | null>(null)
const composing = ref(false)
const focused = ref<View | null>(null)
function range(id: View) { return characterRange(views.value[id], ...selected.value) }
const areas: Partial<Record<View, HTMLTextAreaElement>> = {}
const panels: {id: View; title: string; subtitle: string; number: string}[] = [
  {id:'sjis',title:'Shift-JIS',subtitle:'シフトJISとして解釈',number:'01'},
  {id:'hex',title:'Binary',subtitle:'バイト列 · 16進数',number:'02'},
  {id:'utf8',title:'UTF-8',subtitle:'UTF-8として解釈',number:'03'}
]
const views = computed(() => ({sjis:display(bytes.value,'sjis'),hex:display(bytes.value,'hex'),utf8:display(bytes.value,'utf8')}))
function syncSelection(source?: View) {
  for (const p of panels) {
    if (p.id === source) continue
    const el = areas[p.id]; if (!el) continue
    const [a,b] = characterRange(views.value[p.id], ...selected.value)
    el.setSelectionRange(a,b)
  }
}
function select(id: View) {
  if (composing.value || pendingHex.value !== null) return
  const el = areas[id]; if (!el || document.activeElement !== el) return
  const d = views.value[id]
  selected.value = [d.boundaries[el.selectionStart] ?? 0, d.boundaries[el.selectionEnd] ?? bytes.value.length]
  syncSelection(id)
}
async function update(id: View, event: Event) {
  if (composing.value) return
  const el = event.target as HTMLTextAreaElement
  if (id === 'hex') {
    const parsed = parseHex(el.value)
    if (!parsed) { pendingHex.value = el.value; error.value = '16進数を2桁ずつ入力してください（空白・改行で区切れます）。'; return }
    bytes.value = parsed
  } else bytes.value = encode(el.value, id)
  pendingHex.value = null; error.value = ''
  const a = el.selectionStart, b = el.selectionEnd
  selected.value = id === 'hex'
    ? [Math.floor(el.value.slice(0,a).replace(/\s/g,'').length/2),Math.floor(el.value.slice(0,b).replace(/\s/g,'').length/2)]
    : [encode(el.value.slice(0,a),id).length, encode(el.value.slice(0,b),id).length]
  await nextTick(); syncSelection()
}
function sample() { bytes.value = encode('こんにちは、世界！\n文字化けを、読み解こう。','utf8'); pendingHex.value=null; error.value=''; selected.value=[0,0]; nextTick(() => syncSelection()) }
function clear() { bytes.value = new Uint8Array(); pendingHex.value=null; error.value=''; selected.value=[0,0] }
</script>

<template>
  <div class="shell">
    <header><a class="brand" href="./"><span class="brand-icon">文</span> Mojibake<span class="lab">LAB</span></a><span class="local"><i></i> ブラウザ内で処理</span></header>
    <main>
      <div class="intro"><p class="eyebrow">ENCODING WORKSPACE</p><h1>文字化けを、<span>読み解く。</span></h1><p class="description">ひとつのバイト列を、3つの視点から。入力も選択範囲も、リアルタイムに同期します。</p></div>
      <div class="toolbar"><div class="connected"><span>↔</span> 3つのビューが同期中</div><div class="actions"><button @click="sample">サンプルを試す <span>↗</span></button><button @click="clear">クリア</button></div></div>
      <section class="workspace" aria-label="文字コード変換ワークスペース">
        <article v-for="p in panels" :key="p.id" :class="['panel',p.id]">
          <div class="panel-head"><div class="panel-title"><span class="number">{{p.number}}</span><h2>{{p.title}}</h2></div><span class="tag">{{p.id === 'hex' ? 'HEX' : 'TEXT'}}</span></div>
          <p class="subtitle">{{p.subtitle}}</p>
          <div class="editor">
          <pre v-if="focused !== p.id && selected[0] !== selected[1] && pendingHex === null" class="selection-mirror" aria-hidden="true"><span>{{views[p.id].text.slice(0,range(p.id)[0])}}</span><mark>{{views[p.id].text.slice(...range(p.id))}}</mark><span>{{views[p.id].text.slice(range(p.id)[1])}}</span></pre>
          <textarea @focus="focused=p.id" @blur="focused=null" @scroll="event => { const el=event.target as HTMLTextAreaElement; const mirror=el.previousElementSibling; if(mirror) { mirror.scrollTop=el.scrollTop; mirror.scrollLeft=el.scrollLeft } }":ref="el => { if(el) areas[p.id] = el as HTMLTextAreaElement }" :value="p.id === 'hex' && pendingHex !== null ? pendingHex : views[p.id].text" :aria-label="p.title" :placeholder="p.id === 'hex' ? 'E3 81 93 E3 82 93 …' : 'ここにテキストを入力…'" spellcheck="false" :class="{invalid:p.id === 'hex' && error}" @input="update(p.id,$event)" @select="select(p.id)" @keyup="select(p.id)" @pointerup="select(p.id)" @compositionstart="composing=true" @compositionend="composing=false; update(p.id,$event)"></textarea></div>
          <div class="panel-foot"><span>{{ p.id === 'hex' ? `${bytes.length} bytes` : `${views[p.id].text.length} UTF-16 units` }}</span><span>{{p.id === 'hex' ? '00 — FF' : '編集可能'}}</span></div>
        </article>
      </section>
      <div v-if="error" class="error" role="alert">{{error}} 他のビューは最後に確定したバイト列を表示しています。</div>
      <div class="status" aria-live="polite"><span><i></i> {{bytes.length}} bytes</span><span>選択範囲 <b>{{selected[0]}} — {{selected[1]}}</b> <span class="muted">（{{selected[1]-selected[0]}} bytes）</span></span></div>
      <aside><span class="info">i</span><div><strong>使い方</strong><p>どの欄からでも入力できます。文字を選択すると、対応するバイト範囲が他の欄でも選択されます。</p><p>Shift-JISにない文字は「?」に変換されます。不正なバイトは「�」などで表示されますが、編集するまでは元のバイトを保持します。文字の途中のバイト選択は、文字境界に丸めて表示します。</p></div></aside>
    </main><footer><span>MOJIBAKE LAB</span><span>データはサーバーに送信されません。</span></footer>
  </div>
</template>



