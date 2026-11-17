import type { Range as OffsetRange } from "./codec";

export function editorText(node: Node): string {
  if (node instanceof HTMLElement && node.dataset.byteMarker !== undefined)
    return node.dataset.byteMarker;
  if (node instanceof HTMLBRElement) return node.hasAttribute("data-editor-tail") ? "" : "\n";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return Array.from(node.childNodes, editorText).join("");
}

export function editorSelection(editor: HTMLElement): OffsetRange | undefined {
  const selection = editor.ownerDocument.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return;
  function offset(node: Node, position: number) {
    const atom = (node instanceof Element ? node : node.parentElement)?.closest("[data-byte-marker]");
    if (atom && editor.contains(atom)) {
      position = Array.from(atom.parentNode!.childNodes).indexOf(atom);
      node = atom.parentNode!;
    }
    const prefix = editor.ownerDocument.createRange();
    prefix.selectNodeContents(editor);
    prefix.setEnd(node, position);
    return editorText(prefix.cloneContents()).length;
  }
  return [offset(range.startContainer, range.startOffset), offset(range.endContainer, range.endOffset)];
}

export function applyEditorSelection(editor: HTMLElement, [start, end]: OffsetRange) {
  function point(offset: number): [Node, number] {
    for (const [index, node] of Array.from(editor.childNodes).entries()) {
      if (offset === 0) return [editor, index];
      const length = editorText(node).length;
      if (offset < length && node.nodeType === Node.TEXT_NODE) return [node, offset];
      offset -= length;
    }
    return [editor, editor.childNodes.length];
  }
  const range = editor.ownerDocument.createRange();
  range.setStart(...point(start));
  range.setEnd(...point(end));
  const selection = editor.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
