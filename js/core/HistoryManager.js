/**
 * HistoryManager - Geri Al (Undo) ve İleri Al (Redo) geçmiş yönetim sistemi.
 * Nesne taşıma, boyutlandırma, silme, ekleme ve eşleştirme durumlarını kaydeder.
 */
class HistoryManager {
  constructor(core, maxHistory = 40, options = {}) {
    this.core = core;
    if (this.core) {
      this.core.historyManager = this;
      if (typeof this.core.setHistoryManager === 'function') {
        this.core.setHistoryManager(this);
      }
    }
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];
    this.isApplying = false;
    this.signal = options.signal;
    this.root = options.root || document;

    this.init();

    // Çekirdekte mevcut bir proje verisi varsa başlangıç taban durumunu kaydet
    if (this.core && this.core.data) {
      this.pushState('Başlangıç');
    }
  }

  init() {
    // Dışarıdan yeni bir proje yüklendiğinde geçmiş sıfırlanır ve yeni başlangıç durumu kaydedilir;
    // ancak iç geri yüklemelerde (undo/redo sırasında isApplying veya saveToHistory === false) geçmiş korunur!
    this.core.on('projectLoaded', (payload) => {
      if (this.isApplying) return;
      if (payload && (payload.saveToHistory === false || payload.isHistoryRestore)) return;
      this.clear();
      this.pushState('Proje Yüklendi');
    });

    // Çekirdekten veya bileşenlerden gelen açık geçmiş kaydetme isteği
    this.core.on('requestHistoryPush', (payload) => {
      if (this.isApplying) return;
      this.pushState(payload?.description || '');
    });

    // Nesne ekleme işlemi
    this.core.on('objectAdded', (payload) => {
      if (this.isApplying) return;
      if (this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction()) return;
      if (payload && payload.saveHistory === false) return;
      this.pushState('Nesne Eklendi');
    });

    // Nesne silme işlemi
    this.core.on('objectDeleted', (payload) => {
      if (this.isApplying) return;
      if (this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction()) return;
      if (payload && payload.saveHistory === false) return;
      this.pushState('Nesne Silindi');
    });

    // Nesne özelliği güncelleme (renk, rol, metin, boyut vb.)
    this.core.on('objectUpdated', (payload) => {
      if (this.isApplying) return;
      if (this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction()) return;
      if (payload && (payload.saveHistory === false || payload.options?.saveHistory === false)) return;
      this.pushState('Nesne Güncellendi');
    });

    // Katman sırası değişimi
    this.core.on('layerChanged', (payload) => {
      if (this.isApplying) return;
      if (this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction()) return;
      if (payload && payload.saveHistory === false) return;
      this.pushState('Katman Değiştirildi');
    });

    // Cevap anahtarı eşleşme değişimi
    this.core.on('answerKeyChanged', (payload) => {
      if (this.isApplying) return;
      if (this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction()) return;
      if (payload && payload.saveHistory === false) return;
      this.pushState('Cevap Anahtarı Güncellendi');
    });

    // Klavye kısayolları: Ctrl+Z / Ctrl+Y
    this.root.addEventListener('keydown', (e) => {
      if (window.DND.InteractionUtils.shouldIgnoreEditorShortcut(e, this.root)) return;

      if (this.core.getMode() !== 'design') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          this.redo();
        } else {
          // Undo
          e.preventDefault();
          this.undo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        // Redo
        e.preventDefault();
        this.redo();
      }
    }, this.signal ? { signal: this.signal } : undefined);
  }

  push(description = '') {
    return this.pushState(description);
  }

  pushState(description = '') {
    if (this.isApplying) return;

    const snapshot = JSON.stringify(this.core.data);

    // En son kaydedilen durumla aynıysa mükerrer kayıt yapma
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
      return;
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // Yeni işlem yapıldığında Redo yığını sıfırlanır
    this.redoStack = [];

    this.notifyState(description);
  }

  undo() {
    if (this.undoStack.length <= 1) return; // En az 1 başlangıç durumu kalmalı

    this.isApplying = true;
    try {
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);

      const prevState = this.undoStack[this.undoStack.length - 1];
      const parsed = JSON.parse(prevState);
      this.core.loadProject(parsed, { saveToHistory: false, isHistoryRestore: true });
    } finally {
      this.isApplying = false;
      this.notifyState('Geri Alındı');
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;

    this.isApplying = true;
    try {
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);

      const parsed = JSON.parse(nextState);
      this.core.loadProject(parsed, { saveToHistory: false, isHistoryRestore: true });
    } finally {
      this.isApplying = false;
      this.notifyState('İleri Alındı');
    }
  }

  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyState('Geçmiş Sıfırlandı');
  }

  notifyState(action = '') {
    this.core.emit('historyChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: Math.max(0, this.undoStack.length - 1),
      redoCount: this.redoStack.length,
      action
    });
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.HistoryManager = HistoryManager;
