const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '..');
global.window = { DND: {} };
global.document = { activeElement: null };

function loadSource(relativePath) {
  const code = fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
  vm.runInThisContext(code, { filename: relativePath });
}

loadSource('js/utils/InteractionUtils.js');
loadSource('js/core/SelectionManager.js');
loadSource('js/core/HistoryManager.js');

const { InteractionUtils, SelectionManager, HistoryManager } = window.DND;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeNode(tagName = 'DIV', options = {}) {
  return {
    tagName,
    isContentEditable: !!options.isContentEditable,
    getAttribute(name) {
      if (name === 'contenteditable') return options.contentEditable ?? null;
      return null;
    },
    matches(selector) {
      return Array.isArray(options.matches) && options.matches.some(token => selector.includes(token));
    }
  };
}

function keyboardEvent(key, eventPath, options = {}) {
  const event = new Event('keydown', { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    key: { value: key },
    ctrlKey: { value: !!options.ctrlKey },
    metaKey: { value: !!options.metaKey },
    shiftKey: { value: !!options.shiftKey }
  });
  Object.defineProperty(event, 'composedPath', { value: () => eventPath });
  return event;
}

function createCore(data = { objects: [] }) {
  const listeners = {};
  return {
    data,
    mode: 'design',
    on(name, handler) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(handler);
    },
    emit(name, payload) {
      (listeners[name] || []).forEach(handler => handler(payload));
    },
    getMode() { return this.mode; },
    setHistoryManager(manager) { this.historyManager = manager; },
    loadProject(nextData) { this.data = nextData; }
  };
}

function createSelectionHarness(root, signal) {
  const overlay = { style: {}, className: '', innerHTML: '', querySelector() { return null; } };
  const stage = {
    tagName: 'DIV',
    isContentEditable: false,
    getAttribute() { return null; },
    matches() { return false; },
    getRootNode() { return root; },
    querySelector(selector) { return selector === '#selection-overlay' ? overlay : null; },
    querySelectorAll() { return []; }
  };
  const object = { id: 'obj-1', x: 0, y: 0, width: 100, height: 40 };
  const core = createCore({ stage: { width: 1200, height: 675 }, objects: [object] });
  const objectManager = {
    getObject(id) { return id === object.id ? object : null; },
    getObjects() { return [object]; }
  };
  const manager = new SelectionManager(core, {}, objectManager, stage, { root, signal });
  manager.selectedIds.add(object.id);
  return { manager, stage };
}

// Editable ve interaktif hedefler Shadow DOM event path'i üzerinden tanınmalı.
const input = fakeNode('INPUT');
const editable = fakeNode('SPAN', { isContentEditable: true });
const button = fakeNode('BUTTON');
assert(InteractionUtils.shouldIgnoreEditorShortcut({ composedPath: () => [input] }), 'Input kısayollardan izole edilmedi.');
assert(InteractionUtils.shouldIgnoreEditorShortcut({ composedPath: () => [editable] }), 'Contenteditable kısayollardan izole edilmedi.');
assert(InteractionUtils.shouldIgnoreEditorShortcut({ composedPath: () => [button] }), 'Buton kısayollardan izole edilmedi.');

// Kısayollar yalnızca event'in ait olduğu editör root'unda çalışmalı.
const rootA = new EventTarget();
const rootB = new EventTarget();
rootA.activeElement = null;
rootB.activeElement = null;
const harnessA = createSelectionHarness(rootA);
const harnessB = createSelectionHarness(rootB);
let deletesA = 0;
let deletesB = 0;
let nudgesA = 0;
let selectAllA = 0;
harnessA.manager.deleteSelected = () => { deletesA += 1; };
harnessB.manager.deleteSelected = () => { deletesB += 1; };
harnessA.manager.nudgeSelected = () => { nudgesA += 1; };
harnessA.manager.selectAll = () => { selectAllA += 1; };

rootA.activeElement = input;
rootA.dispatchEvent(keyboardEvent('Backspace', [input, rootA]));
rootA.dispatchEvent(keyboardEvent('ArrowLeft', [input, rootA]));
rootA.dispatchEvent(keyboardEvent('a', [input, rootA], { ctrlKey: true }));
assert(deletesA === 0 && nudgesA === 0 && selectAllA === 0, 'Input odağında tasarım kısayolu çalıştı.');

rootA.activeElement = editable;
rootA.dispatchEvent(keyboardEvent('Backspace', [editable, rootA]));
assert(deletesA === 0, 'Inline metin düzenlerken Backspace nesneyi sildi.');

rootA.activeElement = harnessA.stage;
rootA.dispatchEvent(keyboardEvent('Backspace', [harnessA.stage, rootA]));
assert(deletesA === 1, 'Sahne odaktayken Delete/Backspace kısayolu çalışmadı.');
assert(deletesB === 0, 'Bir editörün kısayolu diğer editör örneğini etkiledi.');

// History kısayolu da aynı root ve editable izolasyonuna uymalı.
const historyRoot = new EventTarget();
historyRoot.activeElement = input;
const historyCore = createCore({ objects: [] });
const history = new HistoryManager(historyCore, 40, { root: historyRoot });
let undoCount = 0;
history.undo = () => { undoCount += 1; };
historyRoot.dispatchEvent(keyboardEvent('z', [input, historyRoot], { ctrlKey: true, metaKey: true }));
assert(undoCount === 0, 'Input odağında editör Undo kısayolu çalıştı.');
historyRoot.activeElement = harnessA.stage;
historyRoot.dispatchEvent(keyboardEvent('z', [harnessA.stage, historyRoot], { ctrlKey: true, metaKey: true }));
assert(undoCount === 1, 'Sahne odağında Undo kısayolu çalışmadı.');

// Abort/destroy yaşam döngüsü listener'ı tamamen kaldırmalı.
const abortRoot = new EventTarget();
abortRoot.activeElement = null;
const controller = new AbortController();
const abortHarness = createSelectionHarness(abortRoot, controller.signal);
let abortedDeletes = 0;
abortHarness.manager.deleteSelected = () => { abortedDeletes += 1; };
abortRoot.activeElement = abortHarness.stage;
abortRoot.dispatchEvent(keyboardEvent('Backspace', [abortHarness.stage, abortRoot]));
controller.abort();
abortRoot.dispatchEvent(keyboardEvent('Backspace', [abortHarness.stage, abortRoot]));
assert(abortedDeletes === 1, 'Abort sonrasında eski editör listener almaya devam etti.');

console.log('Shadow DOM interaction isolation: OK');
