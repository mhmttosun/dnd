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
  }

  // Geçmiş Yönetimi Entegrasyonu (Merkezi API)
  setHistoryManager(historyManager) {
    this.historyManager = historyManager;
  }

  pushHistoryState(description = '') {
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
