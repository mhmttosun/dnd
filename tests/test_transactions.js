const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '..');

class FakeElement {
  constructor(tagName = 'div', className = '') {
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.innerHTML = '';
    this.textContent = '';
    this.listeners = {};
    this.tabIndex = 0;
  }
  get classList() {
    const self = this;
    return {
      add(...classes) {
        const cur = (self.className || '').split(/\s+/).filter(Boolean);
        classes.forEach(c => { if (!cur.includes(c)) cur.push(c); });
        self.className = cur.join(' ');
      },
      remove(...classes) {
        const cur = (self.className || '').split(/\s+/).filter(Boolean);
        self.className = cur.filter(c => !classes.includes(c)).join(' ');
      },
      contains(c) {
        return (self.className || '').split(/\s+/).includes(c);
      },
      toggle(c, force) {
        const has = this.contains(c);
        const shouldHave = force !== undefined ? !!force : !has;
        if (shouldHave && !has) this.add(c);
        else if (!shouldHave && has) this.remove(c);
        return shouldHave;
      }
    };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  hasAttribute(k) { return k in this.attributes; }
  removeAttribute(k) { delete this.attributes[k]; }
  appendChild(child) {
    if (!child) return child;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parentNode = null;
      this.children.splice(idx, 1);
    }
    return child;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }
  dispatchEvent(event) {
    const list = (this.listeners[event.type] || []).slice();
    list.forEach(fn => fn(event));
    if (event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  querySelectorAll(selector) {
    const results = [];
    const check = (el) => {
      let match = false;
      if (selector.startsWith('#')) {
        match = el.getAttribute('id') === selector.slice(1);
      } else if (selector.startsWith('.')) {
        const classes = selector.slice(1).split('.');
        const elClasses = (el.className || '').split(/\s+/);
        match = classes.every(c => elClasses.includes(c));
      } else if (selector.startsWith('[')) {
        const m = selector.match(/\[([a-zA-Z0-9_-]+)="?([^"\]]*)"?\]/);
        if (m) match = el.getAttribute(m[1]) === m[2];
      } else {
        match = el.tagName.toLowerCase() === selector.toLowerCase();
      }
      if (match) results.push(el);
      el.children.forEach(check);
    };
    this.children.forEach(check);
    return results;
  }
  closest(selector) {
    let cur = this;
    while (cur) {
      let match = false;
      const tokens = selector.split(',').map(s => s.trim());
      for (const tok of tokens) {
        if (tok.startsWith('.')) {
          if ((cur.className || '').split(/\s+/).includes(tok.slice(1))) match = true;
        } else if (tok.startsWith('#')) {
          if (cur.getAttribute('id') === tok.slice(1)) match = true;
        } else if (tok.startsWith('[')) {
          const m = tok.match(/\[([a-zA-Z0-9_-]+)="?([^"\]]*)"?\]/);
          if (m && cur.getAttribute(m[1]) === m[2]) match = true;
        } else if (cur.tagName && cur.tagName.toLowerCase() === tok.toLowerCase()) {
          match = true;
        }
      }
      if (match) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  getRootNode() {
    return global.document;
  }
  getBoundingClientRect() {
    return { top: 0, left: 0, width: 250, height: 40, right: 250, bottom: 40 };
  }
  focus() {}
}

global.window = { DND: {} };

function loadSource(relPath) {
  const code = fs.readFileSync(path.join(baseDir, relPath), 'utf8');
  vm.runInThisContext(code, { filename: relPath });
}

loadSource('js/engine/ValidationEngine.js');
loadSource('js/utils/InteractionUtils.js');
loadSource('js/core/EditorCore.js');
loadSource('js/core/ObjectManager.js');
loadSource('js/core/HistoryManager.js');
loadSource('js/core/SelectionManager.js');
loadSource('js/core/LayerManager.js');
loadSource('js/engine/TransformEngine.js');
loadSource('js/ui/MiniToolbar.js');

function createHarness() {
  const storage = {};
  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { for (const k in storage) delete storage[k]; }
  };

  const docBody = new FakeElement('body');
  const stageViewport = new FakeElement('div', 'stage-viewport');
  stageViewport.setAttribute('id', 'stage-viewport');
  const stageEl = new FakeElement('div', 'stage');
  stageEl.setAttribute('id', 'stage');
  const objectsContainer = new FakeElement('div', 'stage-objects');
  objectsContainer.setAttribute('id', 'stage-objects');
  const selectionOverlay = new FakeElement('div', 'selection-overlay');
  selectionOverlay.setAttribute('id', 'selection-overlay');

  stageEl.appendChild(objectsContainer);
  stageEl.appendChild(selectionOverlay);
  stageViewport.appendChild(stageEl);
  docBody.appendChild(stageViewport);

  global.document = {
    body: docBody,
    activeElement: null,
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => docBody.querySelector('#' + id),
    querySelector: (sel) => docBody.querySelector(sel),
    querySelectorAll: (sel) => docBody.querySelectorAll(sel),
    addEventListener: (ev, fn) => docBody.addEventListener(ev, fn),
    removeEventListener: (ev, fn) => docBody.removeEventListener(ev, fn)
  };

  const windowListeners = {};
  global.window.addEventListener = (ev, fn) => {
    windowListeners[ev] = windowListeners[ev] || [];
    windowListeners[ev].push(fn);
  };
  global.window.removeEventListener = (ev, fn) => {
    if (!windowListeners[ev]) return;
    windowListeners[ev] = windowListeners[ev].filter(l => l !== fn);
  };
  global.window.dispatchEvent = (ev) => {
    const list = (windowListeners[ev.type] || []).slice();
    list.forEach(fn => fn(ev));
  };
  global.navigator = { platform: 'MacIntel' };

  const { EditorCore, ObjectManager, HistoryManager, SelectionManager, LayerManager, TransformEngine, MiniToolbar } = window.DND;

  const core = new EditorCore();
  const stageManager = {
    clientToStage: (cx, cy) => ({ x: cx, y: cy }),
    stageToClient: (sx, sy) => ({ x: sx, y: sy }),
    showGuidelines: () => {},
    clearGuidelines: () => {},
    snapToGrid: false,
    snap: (v) => v
  };
  const objectManager = new ObjectManager(core, stageEl);
  const selectionManager = new SelectionManager(core, stageManager, objectManager, stageEl, { root: global.document });
  const historyManager = new HistoryManager(core, 40, { root: global.document });
  const layerManager = new LayerManager(core, objectManager);
  const transformEngine = new TransformEngine(core, stageManager, objectManager, selectionManager, historyManager, stageEl, { root: global.document });
  const miniToolbar = new MiniToolbar(core, objectManager, selectionManager, layerManager, stageManager);

  return {
    core,
    stageManager,
    objectManager,
    selectionManager,
    historyManager,
    layerManager,
    transformEngine,
    miniToolbar,
    stageEl,
    objectsContainer,
    selectionOverlay
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ============================================================================
// SENARYO 1: Tek nesne, 50 pointer move, 1 pointer up
// ============================================================================
{
  const h = createHarness();
  const obj = h.objectManager.createObject('rectangle', 'draggable', { x: 100, y: 100, width: 120, height: 80 });
  h.selectionManager.select(obj.id, false);

  let autoSaveCalls = 0;
  let dataChangedCalls = 0;
  let historyPushCalls = 0;

  const origAutoSave = h.core.autoSave.bind(h.core);
  h.core.autoSave = () => { autoSaveCalls++; return origAutoSave(); };
  h.core.on('dataChanged', () => { dataChangedCalls++; });
  const origPush = h.historyManager.pushState.bind(h.historyManager);
  h.historyManager.pushState = (desc) => { historyPushCalls++; return origPush(desc); };

  const initialUndoCount = h.historyManager.undoStack.length;
  const objEl = h.objectsContainer.querySelector(`[data-id="${obj.id}"]`);

  // Pointerdown
  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 110,
    clientY: 110,
    pointerId: 1,
    target: objEl,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  // 50 pointermove
  let movesAutoSave = 0;
  let movesDataChanged = 0;
  for (let i = 1; i <= 50; i++) {
    global.window.dispatchEvent({
      type: 'pointermove',
      clientX: 110 + i * 2,
      clientY: 110 + i * 2,
      pointerId: 1,
      shiftKey: false
    });
    movesAutoSave += autoSaveCalls;
    movesDataChanged += dataChangedCalls;
  }

  assert(movesAutoSave === 0, `Senaryo 1: Pointermove sırasında autosave çağrılmamalı! (Alınan: ${movesAutoSave})`);
  assert(movesDataChanged === 0, `Senaryo 1: Pointermove sırasında dataChanged yayınlanmamalı! (Alınan: ${movesDataChanged})`);
  assert(obj.x === 200 && obj.y === 200, `Senaryo 1: Pointermove sırasında model anlık güncellenmeli! x=${obj.x}, y=${obj.y}`);

  // Pointerup
  global.window.dispatchEvent({
    type: 'pointerup',
    clientX: 210,
    clientY: 210,
    pointerId: 1
  });

  assert(autoSaveCalls === 1, `Senaryo 1: Finalde tam olarak 1 autosave olmalı! (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 1, `Senaryo 1: Finalde tam olarak 1 dataChanged olmalı! (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 1, `Senaryo 1: Finalde tam olarak 1 history adımı eklenmeli! (Alınan: ${historyPushCalls})`);
  assert(h.historyManager.undoStack.length === initialUndoCount + 1, 'Senaryo 1: UndoStack boyutu tam 1 artmalı');

  // Undo / Redo
  h.core.undo();
  const undoneObj = h.core.data.objects.find(o => o.id === obj.id);
  assert(undoneObj.x === 100 && undoneObj.y === 100, `Senaryo 1: Undo nesneyi 100, 100'e döndürmeli! (Alınan: ${undoneObj.x}, ${undoneObj.y})`);

  h.core.redo();
  const redoneObj = h.core.data.objects.find(o => o.id === obj.id);
  assert(redoneObj.x === 200 && redoneObj.y === 200, `Senaryo 1: Redo nesneyi 200, 200'e taşımalı! (Alınan: ${redoneObj.x}, ${redoneObj.y})`);

  console.log('Senaryo 1 (Tek nesne 50 hareket): OK (Move sırasında 0 autosave/dataChanged, finalde 1 autosave, 1 dataChanged, 1 history)');
}

// ============================================================================
// SENARYO 2: On nesneli çoklu seçim, 50 pointer move
// ============================================================================
{
  const h = createHarness();
  const objects = [];
  for (let i = 0; i < 10; i++) {
    const o = h.objectManager.createObject('rectangle', 'draggable', {
      x: 50 + i * 20,
      y: 50 + i * 20,
      width: 60,
      height: 40
    });
    objects.push(o);
  }

  // Hepsini seç
  h.selectionManager.selectAll();
  assert(h.selectionManager.getSelectedObjects().length === 10, 'Senaryo 2: 10 nesne seçilmiş olmalı');

  let autoSaveCalls = 0;
  let dataChangedCalls = 0;
  let historyPushCalls = 0;

  const origAutoSave = h.core.autoSave.bind(h.core);
  h.core.autoSave = () => { autoSaveCalls++; return origAutoSave(); };
  h.core.on('dataChanged', () => { dataChangedCalls++; });
  const origPush = h.historyManager.pushState.bind(h.historyManager);
  h.historyManager.pushState = (desc) => { historyPushCalls++; return origPush(desc); };

  const firstObjEl = h.objectsContainer.querySelector(`[data-id="${objects[0].id}"]`);

  // Pointerdown
  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 60,
    clientY: 60,
    pointerId: 2,
    target: firstObjEl,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  // 50 pointermove
  let movesAutoSave = 0;
  let movesDataChanged = 0;
  for (let i = 1; i <= 50; i++) {
    global.window.dispatchEvent({
      type: 'pointermove',
      clientX: 60 + i * 2,
      clientY: 60 + i * 2,
      pointerId: 2,
      shiftKey: false
    });
    movesAutoSave += autoSaveCalls;
    movesDataChanged += dataChangedCalls;
  }

  assert(movesAutoSave === 0, `Senaryo 2: 10 nesne taşınırken autosave 0 olmalı! (Alınan: ${movesAutoSave})`);
  assert(movesDataChanged === 0, `Senaryo 2: 10 nesne taşınırken dataChanged 0 olmalı! (Alınan: ${movesDataChanged})`);

  // Pointerup
  global.window.dispatchEvent({
    type: 'pointerup',
    clientX: 160,
    clientY: 160,
    pointerId: 2
  });

  assert(autoSaveCalls === 1, `Senaryo 2: 10 nesne için finalde tam 1 autosave olmalı! (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 1, `Senaryo 2: 10 nesne için finalde tam 1 dataChanged olmalı! (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 1, `Senaryo 2: 10 nesne için finalde tam 1 history adımı olmalı! (Alınan: ${historyPushCalls})`);

  // Tek Undo 10 nesnenin tamamını başlangıç konumuna döndürmeli
  h.core.undo();
  for (let i = 0; i < 10; i++) {
    const undone = h.core.data.objects.find(o => o.id === objects[i].id);
    assert(undone.x === 50 + i * 20 && undone.y === 50 + i * 20, `Senaryo 2: Nesne ${i} başlangıç konumuna dönmeli`);
  }

  // Redo 10 nesnenin tamamını taşınan konuma getirmeli
  h.core.redo();
  for (let i = 0; i < 10; i++) {
    const redone = h.core.data.objects.find(o => o.id === objects[i].id);
    assert(redone.x === 50 + i * 20 + 100 && redone.y === 50 + i * 20 + 100, `Senaryo 2: Nesne ${i} final konuma gitmeli`);
  }

  console.log('Senaryo 2 (10 nesneli çoklu sürükleme): OK (Finalde tek commit: 1 autosave, 1 dataChanged, 1 history, tam undo/redo)');
}

// ============================================================================
// SENARYO 3: Hareket olmadan pointerdown/pointerup (<= 4px)
// ============================================================================
{
  const h = createHarness();
  const obj = h.objectManager.createObject('rectangle', 'draggable', { x: 100, y: 100, width: 100, height: 60 });
  h.selectionManager.select(obj.id, false);

  let autoSaveCalls = 0;
  let dataChangedCalls = 0;
  let historyPushCalls = 0;

  h.core.autoSave = () => { autoSaveCalls++; };
  h.core.on('dataChanged', () => { dataChangedCalls++; });
  const origPush = h.historyManager.pushState.bind(h.historyManager);
  h.historyManager.pushState = (desc) => { historyPushCalls++; return origPush(desc); };

  const initialUndoCount = h.historyManager.undoStack.length;
  const objEl = h.objectsContainer.querySelector(`[data-id="${obj.id}"]`);

  // Pointerdown
  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 120,
    clientY: 120,
    pointerId: 3,
    target: objEl,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  // Ufak titreme (2px <= 4px eşik)
  global.window.dispatchEvent({
    type: 'pointermove',
    clientX: 122,
    clientY: 121,
    pointerId: 3
  });

  // Pointerup
  global.window.dispatchEvent({
    type: 'pointerup',
    clientX: 122,
    clientY: 121,
    pointerId: 3
  });

  assert(autoSaveCalls === 0, `Senaryo 3: Hareket olmadığında autosave yapılmamalı! (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 0, `Senaryo 3: Hareket olmadığında dataChanged yayınlanmamalı! (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 0, `Senaryo 3: Hareket olmadığında history kaydı olmamalı! (Alınan: ${historyPushCalls})`);
  assert(h.historyManager.undoStack.length === initialUndoCount, 'Senaryo 3: Undo yığını değişmemeli');
  assert(!h.core.isInTransaction(), 'Senaryo 3: Transaction açık kalmamalı');

  console.log('Senaryo 3 (Tıklayıp bırakma / hareket yok): OK (0 autosave, 0 dataChanged, 0 history, transaction temiz kapandı)');
}

// ============================================================================
// SENARYO 4: Resize ve Rotate
// ============================================================================
{
  const h = createHarness();
  const obj = h.objectManager.createObject('rectangle', 'draggable', { x: 100, y: 100, width: 120, height: 80 });
  h.selectionManager.select(obj.id, false);

  // 4A: Resize
  let autoSaveCalls = 0;
  let dataChangedCalls = 0;
  let historyPushCalls = 0;

  h.core.autoSave = () => { autoSaveCalls++; };
  h.core.on('dataChanged', () => { dataChangedCalls++; });
  const origPush = h.historyManager.pushState.bind(h.historyManager);
  h.historyManager.pushState = (desc) => { historyPushCalls++; return origPush(desc); };

  const resizeHandle = new FakeElement('div', 'resize-handle');
  resizeHandle.setAttribute('data-handle', 'se');

  // Pointerdown handle
  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 220,
    clientY: 180,
    pointerId: 4,
    target: resizeHandle,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  for (let i = 1; i <= 50; i++) {
    global.window.dispatchEvent({
      type: 'pointermove',
      clientX: 220 + i * 2,
      clientY: 180 + i * 2,
      pointerId: 4
    });
  }

  assert(autoSaveCalls === 0, 'Senaryo 4A: Resize sırasında autosave 0 olmalı');
  assert(dataChangedCalls === 0, 'Senaryo 4A: Resize sırasında dataChanged 0 olmalı');

  global.window.dispatchEvent({
    type: 'pointerup',
    clientX: 320,
    clientY: 280,
    pointerId: 4
  });

  assert(autoSaveCalls === 1, `Senaryo 4A: Resize sonrasında tam 1 autosave olmalı (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 1, `Senaryo 4A: Resize sonrasında tam 1 dataChanged olmalı (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 1, `Senaryo 4A: Resize sonrasında tam 1 history adımı olmalı (Alınan: ${historyPushCalls})`);

  // 4B: Rotate
  autoSaveCalls = 0;
  dataChangedCalls = 0;
  historyPushCalls = 0;

  const rotateHandle = new FakeElement('div', 'rotate-handle');

  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 160,
    clientY: 80,
    pointerId: 5,
    target: rotateHandle,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  for (let i = 1; i <= 50; i++) {
    global.window.dispatchEvent({
      type: 'pointermove',
      clientX: 160 + i * 3,
      clientY: 80 + i * 2,
      pointerId: 5
    });
  }

  assert(autoSaveCalls === 0, 'Senaryo 4B: Rotate sırasında autosave 0 olmalı');
  assert(dataChangedCalls === 0, 'Senaryo 4B: Rotate sırasında dataChanged 0 olmalı');

  global.window.dispatchEvent({
    type: 'pointerup',
    clientX: 310,
    clientY: 180,
    pointerId: 5
  });

  assert(autoSaveCalls === 1, `Senaryo 4B: Rotate sonrasında tam 1 autosave olmalı (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 1, `Senaryo 4B: Rotate sonrasında tam 1 dataChanged olmalı (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 1, `Senaryo 4B: Rotate sonrasında tam 1 history adımı olmalı (Alınan: ${historyPushCalls})`);

  console.log('Senaryo 4 (Resize ve Rotate): OK (Her biri hareket sırasında 0, finalde tam olarak 1 commit)');
}

// ============================================================================
// SENARYO 5: Pointer Cancel (Açık transaction bırakmama)
// ============================================================================
{
  const h = createHarness();
  const obj = h.objectManager.createObject('rectangle', 'draggable', { x: 100, y: 100, width: 100, height: 60 });
  h.selectionManager.select(obj.id, false);
  const objEl = h.objectsContainer.querySelector(`[data-id="${obj.id}"]`);

  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 110,
    clientY: 110,
    pointerId: 6,
    target: objEl,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  assert(h.core.isInTransaction(), 'Senaryo 5: Pointerdown sonrası transaction başlamış olmalı');

  for (let i = 1; i <= 10; i++) {
    global.window.dispatchEvent({
      type: 'pointermove',
      clientX: 110 + i * 5,
      clientY: 110 + i * 5,
      pointerId: 6
    });
  }

  // Pointercancel
  global.window.dispatchEvent({
    type: 'pointercancel',
    pointerId: 6
  });

  assert(!h.core.isInTransaction(), 'Senaryo 5: Pointercancel sonrası transaction sonlanmış olmalı');
  assert(h.core.getTransaction() === null, 'Senaryo 5: Aktif transaction referansı temizlenmiş olmalı');

  console.log('Senaryo 5 (Pointer Cancel): OK (Açık veya yarım transaction kalmadı)');
}

// ============================================================================
// SENARYO 6: Iframe postMessage Köprüsü ve Coalescing
// ============================================================================
{
  const h = createHarness();
  const obj = h.objectManager.createObject('rectangle', 'draggable', { x: 100, y: 100, width: 100, height: 60 });
  h.selectionManager.select(obj.id, false);
  const objEl = h.objectsContainer.querySelector(`[data-id="${obj.id}"]`);

  // Iframe ortamı ve postMessage köprüsü simülasyonu
  const parentMessages = [];
  const fakeParent = {
    postMessage: (msg) => {
      parentMessages.push(msg);
    }
  };

  let pendingRaf = null;
  let rafCallback = null;
  const fakeRequestAnimationFrame = (cb) => {
    rafCallback = cb;
    pendingRaf = 123;
    return pendingRaf;
  };
  const fakeCancelAnimationFrame = (id) => {
    if (pendingRaf === id) {
      pendingRaf = null;
      rafCallback = null;
    }
  };

  // app.js listener simülasyonu
  let pendingSource = 'dataChanged';
  h.core.on('dataChanged', (e) => {
    if (h.core.isInTransaction && h.core.isInTransaction()) return;
    pendingSource = (e && e.source) || 'dataChanged';
    if (pendingRaf !== null) fakeCancelAnimationFrame(pendingRaf);
    pendingRaf = fakeRequestAnimationFrame(() => {
      fakeParent.postMessage({
        type: 'DND_DATA_CHANGED',
        source: pendingSource,
        data: h.core.getProjectData()
      });
      pendingRaf = null;
    });
  });

  // Pointerdown
  h.stageEl.dispatchEvent({
    type: 'pointerdown',
    button: 0,
    clientX: 110,
    clientY: 110,
    pointerId: 7,
    target: objEl,
    stopPropagation: () => {},
    preventDefault: () => {}
  });

  // 50 hareket
  for (let i = 1; i <= 50; i++) {
    global.window.dispatchEvent({
      type: 'pointermove',
      clientX: 110 + i * 2,
      clientY: 110 + i * 2,
      pointerId: 7
    });
  }

  assert(parentMessages.length === 0, `Senaryo 6: Hareket sırasında üst uygulamaya mesaj gitmemeli! (Giden: ${parentMessages.length})`);

  // Pointerup
  global.window.dispatchEvent({
    type: 'pointerup',
    clientX: 210,
    clientY: 210,
    pointerId: 7
  });

  // rAF tetikle (coalesce flush)
  if (rafCallback) rafCallback();

  assert(parentMessages.length === 1, `Senaryo 6: Finalde tam olarak 1 postMessage gönderilmeli! (Giden: ${parentMessages.length})`);
  assert(parentMessages[0].type === 'DND_DATA_CHANGED', 'Senaryo 6: Mesaj tipi DND_DATA_CHANGED olmalı');
  assert(parentMessages[0].source === 'move', `Senaryo 6: Mesaj source 'move' olmalı! (Alınan: ${parentMessages[0].source})`);

  console.log('Senaryo 6 (Iframe Köprüsü): OK (Hareket sırasında 0 mesaj, finalde tam olarak 1 DND_DATA_CHANGED mesajı)');
}

// ============================================================================
// SENARYO 7: Toplu Hizalama ve Stil (Batch Operations)
// ============================================================================
{
  const h = createHarness();
  const objects = [];
  for (let i = 0; i < 5; i++) {
    const o = h.objectManager.createObject('rectangle', 'draggable', {
      x: 50 + i * 30,
      y: 50 + i * 15,
      width: 100,
      height: 50,
      backgroundColor: '#f1f5f9'
    });
    objects.push(o);
  }

  h.selectionManager.selectAll();

  let autoSaveCalls = 0;
  let dataChangedCalls = 0;
  let historyPushCalls = 0;

  h.core.autoSave = () => { autoSaveCalls++; };
  h.core.on('dataChanged', () => { dataChangedCalls++; });
  const origPush = h.historyManager.pushState.bind(h.historyManager);
  h.historyManager.pushState = (desc) => { historyPushCalls++; return origPush(desc); };

  const initialUndoCount = h.historyManager.undoStack.length;

  // 7A: Toplu Hizalama (alignSelectedObjects)
  h.miniToolbar.alignSelectedObjects('left');

  assert(autoSaveCalls === 1, `Senaryo 7A: Toplu hizalama için tam 1 autosave olmalı (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 1, `Senaryo 7A: Toplu hizalama için tam 1 dataChanged olmalı (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 1, `Senaryo 7A: Toplu hizalama için tam 1 history adımı olmalı (Alınan: ${historyPushCalls})`);
  assert(h.historyManager.undoStack.length === initialUndoCount + 1, 'Senaryo 7A: UndoStack boyutu 1 artmalı');

  // Tüm nesnelerin x değeri sol hizaya (50) eşitlenmiş olmalı
  h.core.data.objects.forEach(o => {
    assert(o.x === 50, `Senaryo 7A: Nesne ${o.id} x=50 olmalı, alınan: ${o.x}`);
  });

  // Undo yapıldığında 5 nesne birden eski x değerlerine dönmeli
  h.core.undo();
  for (let i = 0; i < 5; i++) {
    const restored = h.core.data.objects.find(o => o.id === objects[i].id);
    assert(restored.x === 50 + i * 30, `Senaryo 7A: Undo sonrasında nesne ${i} eski x değerine dönmeli`);
  }

  // 7B: Toplu Stil Değişikliği (batchUpdateObjects)
  h.selectionManager.selectAll();
  autoSaveCalls = 0;
  dataChangedCalls = 0;
  historyPushCalls = 0;

  h.miniToolbar.batchUpdateObjects(
    h.selectionManager.getSelectedObjects(),
    () => ({ backgroundColor: '#3b82f6' }),
    'Toplu Renk Güncelle',
    'batch-style'
  );

  assert(autoSaveCalls === 1, `Senaryo 7B: Toplu stil için tam 1 autosave olmalı (Alınan: ${autoSaveCalls})`);
  assert(dataChangedCalls === 1, `Senaryo 7B: Toplu stil için tam 1 dataChanged olmalı (Alınan: ${dataChangedCalls})`);
  assert(historyPushCalls === 1, `Senaryo 7B: Toplu stil için tam 1 history adımı olmalı (Alınan: ${historyPushCalls})`);

  h.core.data.objects.forEach(o => {
    assert(o.backgroundColor === '#3b82f6', `Senaryo 7B: Nesne ${o.id} rengi güncellenmiş olmalı`);
  });

  // Undo yapıldığında hepsi eski rengine dönmeli
  h.core.undo();
  h.core.data.objects.forEach(o => {
    assert(o.backgroundColor === '#f1f5f9', `Senaryo 7B: Undo sonrasında nesne ${o.id} eski rengine dönmeli`);
  });

  console.log('Senaryo 7 (Toplu Hizalama ve Stil): OK (Döngüdeki çoklu updateObject çağrılarına rağmen tek commit, tek undo)');
}

console.log('Transaction and Debounce Scenarios: ALL_OK');
