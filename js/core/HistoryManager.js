/**
 * HistoryManager - Geri Al (Undo) ve İleri Al (Redo) geçmiş yönetim sistemi.
 * Nesne taşıma, boyutlandırma, silme, ekleme ve eşleştirme durumlarını kaydeder.
 */
class HistoryManager {
  constructor(core, maxHistory = 40, options = {}) {
    this.core = core;
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];
    this.isApplying = false;
    this.signal = options.signal;

    this.init();
  }

  init() {
    this.core.on('projectLoaded', () => {
      this.clear();
      this.pushState(); // İlk durumu kaydet
    });

    // Klavye kısayolları: Ctrl+Z / Ctrl+Y
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
          document.activeElement?.isContentEditable) {
        return;
      }

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

  pushState() {
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

    this.notifyState();
  }

  undo() {
    if (this.undoStack.length <= 1) return; // En az 1 başlangıç durumu kalmalı

    this.isApplying = true;
    try {
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);

      const prevState = this.undoStack[this.undoStack.length - 1];
      const parsed = JSON.parse(prevState);
      this.core.loadProject(parsed, false);
    } finally {
      this.isApplying = false;
      this.notifyState();
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;

    this.isApplying = true;
    try {
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);

      const parsed = JSON.parse(nextState);
      this.core.loadProject(parsed, false);
    } finally {
      this.isApplying = false;
      this.notifyState();
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
    this.notifyState();
  }

  notifyState() {
    this.core.emit('historyChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.HistoryManager = HistoryManager;
