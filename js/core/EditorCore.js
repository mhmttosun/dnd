/**
 * EditorCore - Merkezi veri modeli, durum yönetimi ve olay yayınlama sistemi.
 * DOM'u veri kaynağı olarak kullanmaz; tek doğru kaynak (Single Source of Truth) bu sınıftır.
 */
class EditorCore {
  constructor() {
    this.events = {};
    this.mode = 'design'; // 'design' | 'answer-key' | 'preview'
    this.data = this.createDefaultProject();
    this.activeSubMode = null;
    this.historyManager = null;

    // Transaction & Mutation Yönetimi (Toplu ve Canlı Değişiklikler İçin)
    this._transactionDepth = 0;
    this._activeTransaction = null;
  }

  // --- Merkezi Transaction / Mutation API ---
  beginTransaction(options = {}) {
    this._transactionDepth++;
    if (this._transactionDepth === 1) {
      this._activeTransaction = {
        description: options.description || '',
        source: options.source || 'transaction',
        saveHistory: options.saveHistory !== false,
        persist: options.persist !== false,
        emitDataChanged: options.emitDataChanged !== false,
        mutated: false,
        changesCount: 0,
        startTime: Date.now()
      };
    } else if (this._activeTransaction) {
      if (options.saveHistory !== undefined) {
        this._activeTransaction.saveHistory = this._activeTransaction.saveHistory || options.saveHistory;
      }
      if (options.source && (!this._activeTransaction.source || this._activeTransaction.source === 'transaction')) {
        this._activeTransaction.source = options.source;
      }
      if (options.description && !this._activeTransaction.description) {
        this._activeTransaction.description = options.description;
      }
    }
    return this._activeTransaction;
  }

  isInTransaction() {
    return this._transactionDepth > 0;
  }

  getTransaction() {
    return this._activeTransaction;
  }

  recordMutation(info = {}) {
    if (this._transactionDepth > 0 && this._activeTransaction) {
      this._activeTransaction.mutated = true;
      this._activeTransaction.changesCount++;
      if (info.source && (!this._activeTransaction.source || this._activeTransaction.source === 'transaction')) {
        this._activeTransaction.source = info.source;
      }
      if (info.description && !this._activeTransaction.description) {
        this._activeTransaction.description = info.description;
      }
    }
  }

  endTransaction(options = {}) {
    if (this._transactionDepth <= 0) {
      this._transactionDepth = 0;
      this._activeTransaction = null;
      return null;
    }

    this._transactionDepth--;
    if (this._transactionDepth > 0) {
      return this._activeTransaction;
    }

    const tx = this._activeTransaction;
    this._activeTransaction = null;
    this._transactionDepth = 0;

    if (!tx) return null;

    if (options.rollback === true) {
      return null;
    }

    const hasMutated = tx.mutated || options.forceCommit === true || options.mutated === true;
    if (!hasMutated) {
      return null;
    }

    const source = options.source || tx.source || 'transaction';
    const description = options.description || tx.description || '';
    const saveHistory = options.saveHistory !== undefined ? options.saveHistory : tx.saveHistory;
    const persist = options.persist !== undefined ? options.persist : tx.persist;
    const emitDataChanged = options.emitDataChanged !== undefined ? options.emitDataChanged : tx.emitDataChanged;

    if (saveHistory && !tx.historyPushed) {
      this.pushHistoryState(description);
    }
    if (emitDataChanged) {
      this.emit('dataChanged', { source, description });
    }
    if (persist) {
      this.autoSave();
    }
    return tx;
  }

  commitTransaction(options = {}) {
    return this.endTransaction(options);
  }

  rollbackTransaction() {
    this._transactionDepth = 0;
    this._activeTransaction = null;
  }

  beginMutation(options = {}) {
    return this.beginTransaction(options);
  }

  commitMutation(options = {}) {
    return this.endTransaction(options);
  }

  rollbackMutation() {
    return this.rollbackTransaction();
  }

  runTransaction(callback, options = {}) {
    this.beginTransaction(options);
    try {
      const result = callback(this);
      this.endTransaction(options);
      return result;
    } catch (err) {
      this.rollbackTransaction();
      throw err;
    }
  }

  // Geçmiş Yönetimi Entegrasyonu (Merkezi API)
  setHistoryManager(historyManager) {
    this.historyManager = historyManager;
  }

  pushHistoryState(description = '') {
    if (this._transactionDepth > 0 && this._activeTransaction) {
      this._activeTransaction.historyPushed = true;
    }
    if (this.historyManager && typeof this.historyManager.pushState === 'function') {
      this.historyManager.pushState(description);
    } else {
      this.emit('requestHistoryPush', { description });
    }
  }

  undo() {
    if (this.historyManager && typeof this.historyManager.undo === 'function') {
      return this.historyManager.undo();
    }
  }

  redo() {
    if (this.historyManager && typeof this.historyManager.redo === 'function') {
      return this.historyManager.redo();
    }
  }

  canUndo() {
    return this.historyManager ? this.historyManager.canUndo() : false;
  }

  canRedo() {
    return this.historyManager ? this.historyManager.canRedo() : false;
  }

  createDefaultProject(activityType = 'image-labeling', name = 'Yeni Etkinlik') {
    return {
      schemaVersion: 1,
      version: '1.0',
      project: {
        id: 'proj_' + Date.now().toString(36),
        name: name,
        activityType: activityType,
        description: 'Öğretmen tarafından hazırlanan etkileşimli sürükle-bırak etkinliği'
      },
      stage: {
        width: 1200,
        height: 675,
        backgroundColor: '#f8fafc',
        backgroundImage: null
      },
      objects: [],
      answerKey: {},
      settings: {
        evaluationMode: 'instant',        // 'instant' | 'submit'
        wrongAnswerBehavior: 'return',    // 'return' | 'stay'
        correctAnswerBehavior: 'lock',    // 'lock'
        showFeedback: true,
        showScore: true,
        allowRetry: true,
        shuffleDraggables: true,
        soundEnabled: true,
        showTargetsInGame: true,
        completionMessage: 'Harika İş! Etkinliği başarıyla tamamladınız.'
      }
    };
  }

  // Olay Dinleme ve Tetikleme
  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(h => h !== handler);
  }

  emit(event, payload) {
    if (this.events[event]) {
      this.events[event].forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Olay işleyici hatası [${event}]:`, err);
        }
      });
    }
  }

  // Mod Değişimi: 'design', 'answer-key', 'preview'
  setMode(newMode) {
    if (this.mode === newMode) return;
    const oldMode = this.mode;
    this.mode = newMode;
    this.emit('modeChanged', { oldMode, newMode });
  }

  getMode() {
    return this.mode;
  }

  // Proje Veri Yönetimi
  loadProject(projectData, saveToHistory = true) {
    const valResult = window.DND.ValidationEngine.validateProject(projectData);
    if (!valResult.valid) {
      throw new Error('Proje yüklenemedi: ' + valResult.errors.join(', '));
    }

    // Güvenli kopyalama ve varsayılan alan tamamlama
    const defaults = this.createDefaultProject(
      projectData.project?.activityType || 'image-labeling',
      projectData.project?.name || 'Etkinlik'
    );

    this.data = {
      schemaVersion: projectData.schemaVersion || 1,
      version: projectData.version || '1.0',
      project: Object.assign({}, defaults.project, projectData.project),
      stage: Object.assign({}, defaults.stage, projectData.stage),
      objects: (projectData.objects || []).map(obj => Object.assign({}, obj)),
      answerKey: Object.assign({}, projectData.answerKey || {}),
      settings: Object.assign({}, defaults.settings, projectData.settings)
    };

    const isHistoryRestore = (saveToHistory === false) || (typeof saveToHistory === 'object' && saveToHistory.isHistoryRestore);
    const shouldSaveHistory = typeof saveToHistory === 'object' ? (saveToHistory.saveToHistory ?? true) : !!saveToHistory;

    this.emit('projectLoaded', { project: this.data, saveToHistory: shouldSaveHistory, isHistoryRestore });
    this.emit('dataChanged', { source: 'loadProject' });
    this.autoSave();
  }

  getProjectData() {
    // Derin kopya döndür
    return JSON.parse(JSON.stringify(this.data));
  }

  setActivityType(newType) {
    if (!window.DND.ValidationEngine.VALID_ACTIVITY_TYPES.includes(newType)) return;
    this.data.project.activityType = newType;
    this.emit('activityTypeChanged', { activityType: newType });
    this.emit('dataChanged', { source: 'setActivityType' });
    this.autoSave();
  }

  setProjectName(name) {
    this.data.project.name = String(name).trim() || 'Adsız Etkinlik';
    this.emit('projectNameChanged', { name: this.data.project.name });
    this.emit('dataChanged', { source: 'setProjectName' });
    this.autoSave();
  }

  updateSettings(partialSettings) {
    this.data.settings = Object.assign({}, this.data.settings, partialSettings);
    this.emit('settingsChanged', { settings: this.data.settings });
    this.emit('dataChanged', { source: 'updateSettings' });
    this.autoSave();
  }

  updateStage(partialStage) {
    this.data.stage = Object.assign({}, this.data.stage, partialStage);
    this.emit('stageChanged', { stage: this.data.stage });
    this.emit('dataChanged', { source: 'updateStage' });
    this.autoSave();
  }

  // Yerel depolama (Autosave)
  autoSave() {
    try {
      const serialized = JSON.stringify(this.data);
      // localStorage boyut sınırı (~5MB) kontrolü
      if (serialized.length < 4 * 1024 * 1024) {
        localStorage.setItem('dnd_autosave_project', serialized);
        localStorage.setItem('dnd_autosave_time', Date.now().toString());
      }
    } catch (e) {
      console.warn('Otomatik kayıt localStorage kapasitesi aşıldı veya depolama devre dışı.');
    }
  }

  hasAutoSavedProject() {
    try {
      return !!localStorage.getItem('dnd_autosave_project');
    } catch (e) {
      return false;
    }
  }

  loadAutoSavedProject() {
    try {
      const raw = localStorage.getItem('dnd_autosave_project');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.loadProject(parsed, false);
        return true;
      }
    } catch (e) {
      console.error('Otomatik kayıt yükleme hatası:', e);
    }
    return false;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.EditorCore = EditorCore;
