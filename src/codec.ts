import Encoding from 'encoding-japanese'
export type View = 'sjis' | 'hex' | 'utf8'
export interface Display { text: string; boundaries: number[]; hex?: boolean }
export function encode(text: string, view: View): Uint8Array {
  if (view === 'utf8') return new TextEncoder().encode(text)
  return new Uint8Array(Encoding.convert(Encoding.stringToCode(text), { to: 'SJIS', from: 'UNICODE', type: 'array' }))
}
export function parseHex(text: string): Uint8Array | null {
  const compact = text.replace(/\s/g, '')
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(compact)) return null
  return Uint8Array.from(compact.match(/../g) ?? [], h => parseInt(h, 16))
}
export function display(bytes: Uint8Array, view: View): Display {
  if (view === 'hex') {
    const text = Array.from(bytes, b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    return { text, hex: true, boundaries: Array.from({length: text.length + 1}, (_, i) => Math.min(bytes.length, Math.floor((i + 1) / 3))) }
  }
  const decoder = new TextDecoder(view === 'sjis' ? 'shift-jis' : 'utf-8', { ignoreBOM: true })
  let text = ''; const boundaries = [0]
  for (let i = 0; i < bytes.length;) {
    let size = 1
    const b = bytes[i]!
    if (view === 'sjis') {
      if (((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) && i + 1 < bytes.length && bytes[i+1]! >= 0x40 && bytes[i+1]! <= 0xfc && bytes[i+1] !== 0x7f) size = 2
    } else {
      const n = b >= 0xc2 && b <= 0xdf ? 2 : b >= 0xe0 && b <= 0xef ? 3 : b >= 0xf0 && b <= 0xf4 ? 4 : 1
      if (n > 1) {
        let valid = true; let j = 1
        for (; j < n && i+j < bytes.length; j++) {
          const c = bytes[i+j]!
          if (c < 0x80 || c > 0xbf || (j === 1 && ((b === 0xe0 && c < 0xa0) || (b === 0xed && c > 0x9f) || (b === 0xf0 && c < 0x90) || (b === 0xf4 && c > 0x8f)))) { valid = false; break }
        }
        size = valid ? Math.min(n, bytes.length-i) : j
      }
    }
    const chunk = decoder.decode(bytes.slice(i, i+size))
    text += chunk
    for (let k = 1; k <= chunk.length; k++) boundaries.push(k === chunk.length ? i+size : i)
    i += size
  }
  let normalized = ''; const mapped = [boundaries[0]!]
  for (let c = 0; c < text.length; c++) {
    if (text[c] === '\r') {
      if (text[c+1] === '\n') c++
      normalized += '\n'
    } else normalized += text[c]
    mapped.push(boundaries[c+1]!)
  }
  return { text: normalized, boundaries: mapped }
}
export function characterRange(d: Display, start: number, end: number): [number, number] {
  if (d.hex) return [Math.min(d.text.length, start*3), Math.min(d.text.length, end === start ? end*3 : end*3-1)]
  const a = d.boundaries.findIndex(b => b >= start)
  const z = d.boundaries.findIndex(b => b >= end)
  return [a < 0 ? d.text.length : a, z < 0 ? d.text.length : z]
}


