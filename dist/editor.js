/** @mhmttosun/dnd direct-mount editor bundle */
/**
 * AudioSynthesizer - Tarayıcı Web Audio API kullanarak harici ses dosyalarına
 * ihtiyaç duymadan temiz, profesyonel ses efektleri üretir.
 * Tamamen çevrimdışı çalışır.
 */
class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const startTime = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainLevel, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Ses hatası sessizce geçilir
    }
  }

  // Doğru cevap sesi: Neşeli, yükselen majör akor (C5, E5, G5)
  playCorrect() {
    if (!this.enabled) return;
    this.playTone(523.25, 'triangle', 0.12, 0, 0.18);      // C5
    this.playTone(659.25, 'triangle', 0.14, 0.08, 0.18);   // E5
    this.playTone(783.99, 'triangle', 0.25, 0.16, 0.22);   // G5
  }

  // Yanlış cevap sesi: Yumuşak alçalan uyarı tonu
  playWrong() {
    if (!this.enabled) return;
    this.playTone(320, 'sine', 0.12, 0, 0.15);
    this.playTone(260, 'sine', 0.22, 0.09, 0.15);
  }

  // Nesneyi eline alma / tıklama çıt sesi
  playPickup() {
    if (!this.enabled) return;
    this.playTone(480, 'sine', 0.05, 0, 0.08);
  }

  // Nesneyi bırakma sesi
  playDrop() {
    if (!this.enabled) return;
    this.playTone(360, 'sine', 0.07, 0, 0.1);
  }

  // Etkinlik tamamlandığında kutlama fanfarı
  playComplete() {
    if (!this.enabled) return;
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },       // C5
      { f: 659.25, d: 0.12, t: 0.1 },     // E5
      { f: 783.99, d: 0.14, t: 0.2 },     // G5
      { f: 1046.50, d: 0.45, t: 0.32 }    // C6
    ];
    notes.forEach(n => {
      this.playTone(n.f, 'triangle', n.d, n.t, 0.2);
    });
  }

  // Web Audio Context kapatma ve bellek temizliği (Lifecycle Destroy)
  close() {
    if (this.ctx && typeof this.ctx.close === 'function') {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }
}

// Universal namespace export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioSynthesizer };
}
if (typeof window !== 'undefined') {
  window.DND = window.DND || {};
  window.DND.AudioSynthesizer = AudioSynthesizer;
}

/**
 * ValidationEngine - Proje JSON verisi, cevap anahtarı ve nesne tutarlılığı
 * doğrulamalarını gerçekleştirir. Hatalı ve eksik durumları tespit eder.
 */
class ValidationEngine {
  static get VALID_ACTIVITY_TYPES() {
    return ['image-labeling', 'matching', 'categorization', 'sequencing'];
  }

  static get VALID_ROLES() {
    return ['decorative', 'draggable', 'target', 'category', 'sequence_slot'];
  }

  /**
   * Bir projenin şemasını doğrular
   * @param {Object} projectData
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validateProject(projectData) {
    const errors = [];
    const warnings = [];

    if (!projectData || typeof projectData !== 'object') {
      return { valid: false, errors: ['Proje verisi geçerli bir JSON nesnesi değil.'], warnings };
    }

    // Sürüm kontrolü
    if (!projectData.version) {
      warnings.push('Proje sürüm bilgisi bulunamadı, varsayılan sürüm (1.0) kabul edildi.');
    }

    // Proje başlığı ve türü
    if (!projectData.project || typeof projectData.project !== 'object') {
      errors.push('Proje meta verisi (project alanı) eksik.');
    } else {
      if (!projectData.project.name || typeof projectData.project.name !== 'string') {
        warnings.push('Proje adı belirtilmemiş.');
      }
      if (!this.VALID_ACTIVITY_TYPES.includes(projectData.project.activityType)) {
        errors.push(`Geçersiz etkinlik türü: ${projectData.project.activityType}. Desteklenenler: ${this.VALID_ACTIVITY_TYPES.join(', ')}`);
      }
    }

    // Sahne (Stage) kontrolleri
    if (!projectData.stage || typeof projectData.stage !== 'object') {
      errors.push('Sahne ayarları (stage alanı) eksik.');
    } else {
      if (typeof projectData.stage.width !== 'number' || projectData.stage.width <= 0) {
        errors.push('Sahne genişliği pozitif bir sayı olmalıdır.');
      }
      if (typeof projectData.stage.height !== 'number' || projectData.stage.height <= 0) {
        errors.push('Sahne yüksekliği pozitif bir sayı olmalıdır.');
      }
    }

    // Nesneler (Objects) kontrolleri
    if (!Array.isArray(projectData.objects)) {
      errors.push('Nesneler listesi (objects alanı) bir dizi olmalıdır.');
    } else {
      const idSet = new Set();
      let draggablesCount = 0;
      let targetsCount = 0;

      projectData.objects.forEach((obj, idx) => {
        if (!obj.id) {
          errors.push(`Nesne #${idx + 1} için 'id' alanı eksik.`);
        } else if (idSet.has(obj.id)) {
          errors.push(`Mükerrer nesne ID'si tespit edildi: '${obj.id}'.`);
        } else {
          idSet.add(obj.id);
        }

        if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
          errors.push(`'${obj.id || idx}' nesnesinin X ve Y koordinatları sayı olmalıdır.`);
        }

        if (obj.role === 'draggable') draggablesCount++;
        if (['target', 'category', 'sequence_slot'].includes(obj.role)) targetsCount++;
      });

      if (draggablesCount === 0) {
        warnings.push('Etkinlikte henüz hiç sürüklenebilir nesne bulunmuyor.');
      }
      if (targetsCount === 0) {
        warnings.push('Etkinlikte henüz hiç hedef alan bulunmuyor.');
      }

      // Cevap anahtarı kontrolü
      const answerKey = projectData.answerKey || {};
      for (const [dragId, targetId] of Object.entries(answerKey)) {
        if (!idSet.has(dragId)) {
          warnings.push(`Cevap anahtarındaki '${dragId}' ID'li sürüklenebilir nesne sahnede bulunamadı.`);
        }
        if (projectData.project && projectData.project.activityType !== 'sequencing') {
          if (!idSet.has(targetId)) {
            warnings.push(`Cevap anahtarındaki '${targetId}' ID'li hedef nesne sahnede bulunamadı.`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * HTML dışa aktarmadan önce cevap anahtarının oynanabilirlik durumunu kontrol eder
   */
  static validatePlayability(projectData) {
    const issues = [];
    const objects = projectData.objects || [];
    const answerKey = projectData.answerKey || {};
    const draggables = objects.filter(o => o.role === 'draggable');

    if (draggables.length === 0) {
      issues.push('En az bir adet sürüklenebilir nesne eklemelisiniz.');
    }

    const unassignedDraggables = draggables.filter(d => !answerKey[d.id]);
    if (unassignedDraggables.length > 0) {
      const names = unassignedDraggables.map(d => d.name || d.text || d.id).join(', ');
      issues.push(`Şu sürüklenebilir nesnelerin cevap anahtarında hedefi belirlenmemiş: ${names}`);
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * XSS ve zararlı HTML girişlerini engellemek için metin temizleme
   */
  static sanitizeText(str) {
    if (str === null || str === undefined) return '';
    const temp = document.createElement('div');
    temp.textContent = String(str);
    return temp.innerHTML;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.ValidationEngine = ValidationEngine;

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

    this.emit('projectLoaded', { project: this.data, saveToHistory });
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

/**
 * StageManager - Mantıksal koordinat sistemi (1200x675), yakınlaştırma,
 * responsive ölçeklendirme, ızgara (grid) ve hizalama kılavuzlarını yönetir.
 */
class StageManager {
  constructor(core, containerEl, stageEl, options = {}) {
    this.core = core;
    this.container = containerEl;
    this.stage = stageEl;
    this.stageScaler = null;
    this.stageContainer = null;
    this.svgOverlay = stageEl ? stageEl.querySelector('.stage-svg-overlay') : null;
    this.signal = options.signal;

    this.logicalWidth = 1200;
    this.logicalHeight = 675;

    this.zoomLevel = 1.0; // 0.4 - 2.5
    this.currentScale = 1.0;
    this.showGrid = true;
    this.snapToGrid = false;
    this.gridSize = 20;

    this.guidelines = []; // Aktif hizalama çizgileri

    this.init();
  }

  init() {
    this.setupStageWrapper();
    this.setupWheelZoom();
    this.setupResizeObserver();
    this.renderGrid();
    this.updateDimensions();

    this.core.on('stageChanged', () => this.applyStageStyles());
    this.core.on('projectLoaded', (p) => {
      this.logicalWidth = p.project.stage.width || 1200;
      this.logicalHeight = p.project.stage.height || 675;
      this.applyStageStyles();
      this.fitToScreen();
    });
  }

  setupStageWrapper() {
    if (!this.stage) return;
    let scaler = this.stage.closest ? this.stage.closest('.stage-scaler') : null;
    if (!scaler && this.stage.parentElement && this.stage.parentElement.classList.contains('stage-scaler')) {
      scaler = this.stage.parentElement;
    }
    if (!scaler) {
      let container = this.container ? this.container.querySelector('.stage-container') : null;
      if (!container) {
        container = document.createElement('div');
        container.className = 'stage-container';
        container.id = 'stage-container';
        if (this.container && this.stage.parentNode) {
          this.stage.parentNode.insertBefore(container, this.stage);
        }
      }
      scaler = document.createElement('div');
      scaler.className = 'stage-scaler';
      scaler.id = 'stage-scaler';
      scaler.appendChild(this.stage);
      if (container) {
        container.appendChild(scaler);
      }
    }
    this.stageScaler = scaler;
    this.stageContainer = scaler ? scaler.parentElement : null;
  }

  setupWheelZoom() {
    if (!this.container) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const step = Math.sign(delta) * 0.1;
        this.setZoom(Math.round((this.zoomLevel + step) * 100) / 100);
      }
    };
    const opts = this.signal ? { passive: false, signal: this.signal } : { passive: false };
    this.container.addEventListener('wheel', onWheel, opts);
  }

  setupResizeObserver() {
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScale();
      });
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', () => this.updateScale(), this.signal ? { signal: this.signal } : undefined);
    }
  }

  updateDimensions() {
    this.stage.style.width = `${this.logicalWidth}px`;
    this.stage.style.height = `${this.logicalHeight}px`;
    if (this.svgOverlay) {
      this.svgOverlay.setAttribute('viewBox', `0 0 ${this.logicalWidth} ${this.logicalHeight}`);
      this.svgOverlay.setAttribute('width', this.logicalWidth);
      this.svgOverlay.setAttribute('height', this.logicalHeight);
    }
    this.applyStageStyles();
    this.updateScale();
  }

  applyStageStyles() {
    const stageData = this.core.data.stage;
    this.stage.style.backgroundColor = stageData.backgroundColor || '#ffffff';
    if (stageData.backgroundImage) {
      this.stage.style.backgroundImage = `url("${stageData.backgroundImage}")`;
      this.stage.style.backgroundSize = 'contain';
      this.stage.style.backgroundPosition = 'center';
      this.stage.style.backgroundRepeat = 'no-repeat';
    } else {
      this.stage.style.backgroundImage = 'none';
    }
  }

  updateScale() {
    if (!this.container || !this.stage) return;
    if (!this.stageScaler) {
      this.setupStageWrapper();
    }

    const containerRect = this.container.getBoundingClientRect();
    const padding = 80;
    const availableW = Math.max(containerRect.width - padding, 200);
    const availableH = Math.max(containerRect.height - padding, 200);

    const baseScale = Math.min(
      availableW / this.logicalWidth,
      availableH / this.logicalHeight
    );

    const hasScroll = this.container.scrollWidth > this.container.clientWidth || this.container.scrollHeight > this.container.clientHeight;
    let focusRatioX = 0.5;
    let focusRatioY = 0.5;
    if (hasScroll && this.container.scrollWidth > 0 && this.container.scrollHeight > 0) {
      focusRatioX = (this.container.scrollLeft + this.container.clientWidth / 2) / this.container.scrollWidth;
      focusRatioY = (this.container.scrollTop + this.container.clientHeight / 2) / this.container.scrollHeight;
    }

    this.currentScale = baseScale * this.zoomLevel;

    const scaledW = Math.round(this.logicalWidth * this.currentScale);
    const scaledH = Math.round(this.logicalHeight * this.currentScale);

    if (this.stageScaler) {
      this.stageScaler.style.width = `${scaledW}px`;
      this.stageScaler.style.height = `${scaledH}px`;
    }

    this.stage.style.width = `${this.logicalWidth}px`;
    this.stage.style.height = `${this.logicalHeight}px`;
    this.stage.style.transform = `scale(${this.currentScale})`;
    this.stage.style.transformOrigin = 'top left';

    if (this.zoomLevel > 1.0) {
      if (hasScroll) {
        requestAnimationFrame(() => {
          if (this.container) {
            this.container.scrollLeft = Math.max(0, focusRatioX * this.container.scrollWidth - this.container.clientWidth / 2);
            this.container.scrollTop = Math.max(0, focusRatioY * this.container.scrollHeight - this.container.clientHeight / 2);
          }
        });
      }
    } else {
      this.container.scrollLeft = 0;
      this.container.scrollTop = 0;
    }

    this.core.emit('stageScaleChanged', {
      scale: this.currentScale,
      zoom: this.zoomLevel
    });
  }

  setZoom(zoom) {
    this.zoomLevel = Math.max(0.4, Math.min(2.5, Math.round(zoom * 100) / 100));
    this.updateScale();
  }

  zoomIn() {
    this.setZoom(this.zoomLevel + 0.15);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel - 0.15);
  }

  resetZoom() {
    this.fitToScreen();
  }

  fitToScreen() {
    this.zoomLevel = 1.0;
    this.updateScale();
    if (this.container) {
      this.container.scrollLeft = 0;
      this.container.scrollTop = 0;
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  // Koordinat Dönüşümleri
  clientToStage(clientX, clientY) {
    const rect = this.stage.getBoundingClientRect();
    const scale = rect.width / this.logicalWidth;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  stageToClient(stageX, stageY) {
    const rect = this.stage.getBoundingClientRect();
    const scale = rect.width / this.logicalWidth;
    return {
      clientX: rect.left + stageX * scale,
      clientY: rect.top + stageY * scale
    };
  }

  // Izgaraya yapışma hesabı
  snap(val) {
    if (!this.snapToGrid) return Math.round(val);
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  toggleGrid(forcedState) {
    this.showGrid = forcedState !== undefined ? forcedState : !this.showGrid;
    if (this.showGrid) {
      this.stage.classList.add('grid-visible');
    } else {
      this.stage.classList.remove('grid-visible');
    }
    return this.showGrid;
  }

  toggleSnap(forcedState) {
    this.snapToGrid = forcedState !== undefined ? forcedState : !this.snapToGrid;
    return this.snapToGrid;
  }

  renderGrid() {
    if (this.showGrid) {
      this.stage.classList.add('grid-visible');
    }
  }

  // Akıllı Kılavuz Çizgileri (Hizalama Rehberi)
  showGuidelines(hLines = [], vLines = []) {
    let guideLayer = this.stage.querySelector('.stage-guidelines');
    if (!guideLayer) {
      guideLayer = document.createElement('div');
      guideLayer.className = 'stage-guidelines';
      this.stage.appendChild(guideLayer);
    }
    guideLayer.innerHTML = '';

    hLines.forEach(y => {
      const line = document.createElement('div');
      line.className = 'guideline guideline-h';
      line.style.top = `${y}px`;
      guideLayer.appendChild(line);
    });

    vLines.forEach(x => {
      const line = document.createElement('div');
      line.className = 'guideline guideline-v';
      line.style.left = `${x}px`;
      guideLayer.appendChild(line);
    });
  }

  clearGuidelines() {
    const guideLayer = this.stage.querySelector('.stage-guidelines');
    if (guideLayer) {
      guideLayer.innerHTML = '';
    }
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.StageManager = StageManager;

/**
 * ObjectManager - Sahne nesnelerinin oluşturulması, güncellenmesi, çoğaltılması,
 * silinmesi ve DOM üzerindeki temsillerini yönetir.
 */
class ObjectManager {
  constructor(core, stageEl) {
    this.core = core;
    this.stage = stageEl;
    this.objectsContainer = stageEl.querySelector('#stage-objects');
    this.idCounter = 1;

    this.init();
  }

  init() {
    this.core.on('projectLoaded', () => this.renderAll());
    this.core.on('modeChanged', () => this.updateModeClass());
  }

  generateId(prefix = 'obj') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  }

  // Yeni nesne oluşturma ve varsayılan özellikler
  createObject(type, role = 'decorative', extra = {}) {
    const id = this.generateId(role === 'draggable' ? 'drag' : (['target', 'category', 'sequence_slot'].includes(role) ? 'target' : 'obj'));
    const maxZ = this.getMaxZIndex() + 1;

    const baseObj = {
      id,
      name: extra.name || this.getDefaultName(type, role),
      type, // 'text' | 'image' | 'rectangle' | 'circle' | 'zone'
      role, // 'decorative' | 'draggable' | 'target' | 'category' | 'sequence_slot'
      x: 100,
      y: 100,
      width: 160,
      height: 60,
      rotation: 0,
      zIndex: maxZ,
      locked: false,
      visible: true,
      opacity: 1,

      // Stil özellikleri
      backgroundColor: '#ffffff',
      borderColor: '#94a3b8',
      borderWidth: 2,
      borderStyle: 'solid',
      borderRadius: 8,
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',

      // Metin özellikleri
      text: 'Metin',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 18,
      textColor: '#1e293b',
      fontWeight: '600',
      textAlign: 'center',
      padding: 10,

      // Görsel özellikleri
      src: null,
      alt: '',

      // Hedef / Kategori / Sıralama özellikleri
      targetType: 'single', // 'single' | 'category' | 'sequence'
      acceptLimit: 0,       // 0 = sınırsız
      slotIndex: 0,         // Sıralama için sıra no
      visibleInGame: true   // Oyun sırasında hedefin sınırları görünsün mü?
    };

    // Tür ve role göre özelleştirme
    if (role === 'draggable') {
      baseObj.backgroundColor = '#e0e7ff';
      baseObj.borderColor = '#6366f1';
      baseObj.borderWidth = 2;
      baseObj.borderRadius = 10;
      baseObj.text = 'Sürüklenebilir Öğe';
      baseObj.boxShadow = '0 4px 10px rgba(99, 102, 241, 0.18)';
    } else if (role === 'target') {
      baseObj.backgroundColor = 'rgba(241, 245, 249, 0.7)';
      baseObj.borderColor = '#3b82f6';
      baseObj.borderStyle = 'dashed';
      baseObj.borderWidth = 2.5;
      baseObj.borderRadius = 12;
      baseObj.text = 'Hedef Alanı';
      baseObj.textColor = '#3b82f6';
    } else if (role === 'category') {
      baseObj.width = 280;
      baseObj.height = 360;
      baseObj.backgroundColor = '#f8fafc';
      baseObj.borderColor = '#10b981';
      baseObj.borderWidth = 3;
      baseObj.borderStyle = 'dashed';
      baseObj.borderRadius = 16;
      baseObj.text = 'Kategori Başlığı';
      baseObj.textColor = '#065f46';
      baseObj.targetType = 'category';
      baseObj.acceptLimit = 0; // Sınırsız
    } else if (role === 'sequence_slot') {
      baseObj.width = 140;
      baseObj.height = 120;
      baseObj.backgroundColor = '#f1f5f9';
      baseObj.borderColor = '#8b5cf6';
      baseObj.borderStyle = 'dashed';
      baseObj.borderWidth = 2.5;
      baseObj.borderRadius = 14;
      baseObj.text = 'Adım 1';
      baseObj.textColor = '#6d28d9';
      baseObj.targetType = 'sequence';
      baseObj.slotIndex = 0;
    } else if (type === 'line') {
      baseObj.width = 200;
      baseObj.height = 24;
      baseObj.backgroundColor = 'transparent';
      baseObj.borderColor = '#1e293b';
      baseObj.borderWidth = 3;
      baseObj.borderStyle = 'solid';
      baseObj.borderRadius = 0;
      baseObj.boxShadow = 'none';
      baseObj.text = '';
    } else if (type === 'circle') {
      baseObj.width = 100;
      baseObj.height = 100;
      baseObj.borderRadius = 9999;
      baseObj.backgroundColor = '#fed7aa';
      baseObj.borderColor = '#f97316';
      baseObj.text = '';
    } else if (type === 'rectangle') {
      baseObj.width = 180;
      baseObj.height = 120;
      baseObj.backgroundColor = '#f1f5f9';
      baseObj.borderColor = '#cbd5e1';
      baseObj.text = '';
    }

    const finalObj = Object.assign({}, baseObj, extra);

    this.core.data.objects.push(finalObj);
    this.renderObjectDOM(finalObj);

    this.core.emit('objectAdded', { object: finalObj });
    this.core.emit('dataChanged', { source: 'createObject' });
    this.core.autoSave();

    return finalObj;
  }

  getDefaultName(type, role) {
    if (role === 'draggable') return 'Sürüklenebilir ' + this.idCounter++;
    if (role === 'target') return 'Hedef ' + this.idCounter++;
    if (role === 'category') return 'Kategori ' + this.idCounter++;
    if (role === 'sequence_slot') return 'Sıralama Adımı ' + this.idCounter++;
    if (type === 'image') return 'Görsel ' + this.idCounter++;
    if (type === 'circle') return 'Daire ' + this.idCounter++;
    if (type === 'rectangle') return 'Kutu ' + this.idCounter++;
    if (type === 'line') return 'Çizgi ' + this.idCounter++;
    return 'Metin Kutusu ' + this.idCounter++;
  }

  getMaxZIndex() {
    return this.core.data.objects.reduce((max, o) => Math.max(max, o.zIndex || 1), 1);
  }

  getObject(id) {
    return this.core.data.objects.find(o => o.id === id);
  }

  getObjects() {
    return this.core.data.objects;
  }

  updateObject(id, partialProps, saveHistory = true) {
    const obj = this.getObject(id);
    if (!obj) return null;

    // Sahne dışına taşmayı engelle (nesne sahne içinde kalmalı)
    if (this.core && this.core.data && this.core.data.stage) {
      const stageW = this.core.data.stage.width;
      const stageH = this.core.data.stage.height;
      const w = partialProps.width !== undefined ? partialProps.width : (obj.width || 0);
      const h = partialProps.height !== undefined ? partialProps.height : (obj.height || 0);

      if (partialProps.x !== undefined) {
        partialProps.x = Math.round(Math.max(0, Math.min(stageW - w, partialProps.x)));
      }
      if (partialProps.y !== undefined) {
        partialProps.y = Math.round(Math.max(0, Math.min(stageH - h, partialProps.y)));
      }
    }

    Object.assign(obj, partialProps);
    this.updateObjectDOM(obj);

    this.core.emit('objectUpdated', { object: obj, partialProps, saveHistory });
    this.core.emit('dataChanged', { source: 'updateObject' });
    this.core.autoSave();
    return obj;
  }

  deleteObject(id) {
    const idx = this.core.data.objects.findIndex(o => o.id === id);
    if (idx === -1) return;

    const removed = this.core.data.objects.splice(idx, 1)[0];

    // DOM'dan kaldır
    const el = this.objectsContainer.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();

    // Cevap anahtarından temizle
    if (this.core.data.answerKey) {
      delete this.core.data.answerKey[id];
      // Eğer silinen bir hedef id'si ise ona bağlı sürüklenebilirleri de temizle
      for (const [k, v] of Object.entries(this.core.data.answerKey)) {
        if (v === id) delete this.core.data.answerKey[k];
      }
    }

    this.core.emit('objectDeleted', { object: removed });
    this.core.emit('dataChanged', { source: 'deleteObject' });
    this.core.autoSave();
  }

  duplicateObject(id) {
    const src = this.getObject(id);
    if (!src) return null;

    const copyProps = JSON.parse(JSON.stringify(src));
    delete copyProps.id;
    copyProps.name = `${src.name} (Kopya)`;
    copyProps.x = Math.min(this.core.data.stage.width - (src.width || 100), src.x + 25);
    copyProps.y = Math.min(this.core.data.stage.height - (src.height || 60), src.y + 25);
    copyProps.zIndex = this.getMaxZIndex() + 1;

    const newObj = this.createObject(src.type, src.role, copyProps);
    return newObj;
  }

  // DOM Çizim Metotları
  renderAll() {
    this.objectsContainer.innerHTML = '';
    const sorted = [...this.core.data.objects].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
    sorted.forEach(obj => this.renderObjectDOM(obj));
  }

  renderObjectDOM(obj) {
    let el = this.objectsContainer.querySelector(`[data-id="${obj.id}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'stage-object';
      el.setAttribute('data-id', obj.id);
      this.objectsContainer.appendChild(el);
    }

    this.updateObjectDOM(obj, el);
  }

  updateObjectDOM(obj, el = null) {
    if (!el) {
      el = this.objectsContainer.querySelector(`[data-id="${obj.id}"]`);
    }
    if (!el) return;

    el.setAttribute('data-role', obj.role || 'decorative');
    el.setAttribute('data-type', obj.type || 'text');
    el.classList.toggle('is-locked', !!obj.locked);
    el.classList.toggle('is-hidden', obj.visible === false);

    // Konum, boyut ve dönüşüm (CSS transform)
    el.style.width = `${obj.width}px`;
    el.style.height = `${obj.height}px`;
    el.style.transform = `translate(${obj.x}px, ${obj.y}px) rotate(${obj.rotation || 0}deg)`;
    el.style.transformOrigin = 'center center';
    el.style.zIndex = obj.zIndex || 1;
    el.style.opacity = obj.opacity !== undefined ? obj.opacity : 1;

    // Görsel stiller
    el.style.backgroundColor = obj.backgroundColor || 'transparent';
    el.style.borderColor = obj.borderColor || 'transparent';
    el.style.borderWidth = `${obj.borderWidth !== undefined ? obj.borderWidth : 0}px`;
    el.style.borderStyle = obj.borderStyle || 'solid';
    el.style.borderRadius = `${obj.borderRadius !== undefined ? obj.borderRadius : 0}px`;
    el.style.boxShadow = obj.boxShadow || 'none';

    // İçerik Oluşturma
    el.innerHTML = '';

    // Kilit İkonu (Tıklanabilir buton)
    if (obj.locked) {
      const lockIcon = document.createElement('button');
      lockIcon.type = 'button';
      lockIcon.className = 'lock-indicator lock-badge-btn';
      lockIcon.innerHTML = '🔒';
      lockIcon.title = 'Nesne kilitli. Kilidi açmak için tıklayın.';
      lockIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.updateObject(obj.id, { locked: false });
        if (window.app && window.app.selectionManager) {
          window.app.selectionManager.select(obj.id);
        }
      };
      el.appendChild(lockIcon);
    }

    // Gövde İçeriği
    const content = document.createElement('div');
    content.className = 'object-inner-content';
    content.style.fontFamily = obj.fontFamily || 'sans-serif';
    content.style.fontSize = `${obj.fontSize || 16}px`;
    content.style.fontWeight = obj.fontWeight || 'normal';
    content.style.fontStyle = obj.fontStyle || 'normal';
    content.style.textDecoration = obj.textDecoration || 'none';
    content.style.color = obj.textColor || '#1e293b';
    content.style.padding = `${obj.padding !== undefined ? obj.padding : 8}px`;

    // Dikey hizalama (Top / Middle / Bottom)
    if (obj.verticalAlign === 'top') {
      content.style.justifyContent = 'flex-start';
    } else if (obj.verticalAlign === 'bottom') {
      content.style.justifyContent = 'flex-end';
    } else {
      content.style.justifyContent = 'center';
    }

    // Yatay hizalama (Left / Center / Right)
    const textAlign = obj.textAlign || 'center';
    content.style.textAlign = textAlign;
    if (textAlign === 'left') {
      content.style.alignItems = 'flex-start';
    } else if (textAlign === 'right') {
      content.style.alignItems = 'flex-end';
    } else {
      content.style.alignItems = 'center';
    }

    if (obj.type === 'line') {
      el.style.backgroundColor = 'transparent';
      el.style.borderColor = 'transparent';
      el.style.borderWidth = '0px';
      el.style.boxShadow = 'none';
      content.style.padding = '0px';
      content.innerHTML = this.renderLineSVG(obj);
    } else if (obj.type === 'image' && obj.src) {
      const img = document.createElement('img');
      img.src = obj.src;
      img.alt = obj.alt || obj.name || 'Görsel';
      img.draggable = false;
      content.appendChild(img);
      if (obj.text) {
        const caption = document.createElement('div');
        caption.className = 'image-caption';
        caption.style.width = '100%';
        caption.style.textAlign = textAlign;
        caption.textContent = obj.text;
        content.appendChild(caption);
      }
    } else if (obj.role === 'category') {
      const catHeader = document.createElement('div');
      catHeader.className = 'category-header';
      catHeader.style.width = '100%';
      catHeader.style.textAlign = textAlign;
      catHeader.textContent = obj.text || obj.name;
      content.appendChild(catHeader);

      const catBody = document.createElement('div');
      catBody.className = 'category-drop-hint';
      catBody.textContent = 'Öğeleri buraya bırakın';
      content.appendChild(catBody);
    } else if (obj.role === 'sequence_slot') {
      const slotNum = document.createElement('div');
      slotNum.className = 'sequence-slot-number';
      slotNum.textContent = (obj.slotIndex !== undefined ? obj.slotIndex + 1 : 1);
      content.appendChild(slotNum);

      const slotLbl = document.createElement('div');
      slotLbl.className = 'sequence-slot-label';
      slotLbl.style.width = '100%';
      slotLbl.style.textAlign = textAlign;
      slotLbl.textContent = obj.text || '';
      content.appendChild(slotLbl);
    } else {
      // Standart metin veya şekil içi metin
      const textNode = document.createElement('span');
      textNode.className = 'object-text-span';
      textNode.style.width = '100%';
      textNode.style.display = 'block';
      textNode.style.textAlign = textAlign;
      textNode.textContent = obj.text || '';
      content.appendChild(textNode);
    }

    el.appendChild(content);
  }

  renderLineSVG(obj) {
    const w = Math.max(10, obj.width || 200);
    const h = Math.max(10, obj.height || 24);
    const cy = h / 2;
    const strokeColor = (obj.borderColor && obj.borderColor !== 'transparent') ? obj.borderColor : '#1e293b';
    const strokeWidth = (obj.borderWidth !== undefined && obj.borderWidth > 0) ? obj.borderWidth : 3;
    const strokeStyle = obj.borderStyle || 'solid';

    let dashArray = 'none';
    if (strokeStyle === 'dashed') dashArray = '8 6';
    else if (strokeStyle === 'dotted') dashArray = '2 6';

    const hasStartArrow = !!obj.arrowStart;
    const hasEndArrow = !!obj.arrowEnd;
    const arrowSize = Math.min(Math.max(8, strokeWidth * 3), w / 2.5);

    const x1 = hasStartArrow ? arrowSize - 1 : 0;
    const x2 = hasEndArrow ? w - (arrowSize - 1) : w;

    let svgHtml = `<svg class="object-line-bar" width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow: visible; display: block; pointer-events: none;">`;

    // Ana Çizgi
    svgHtml += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round" />`;

    // Başlangıç Oku
    if (hasStartArrow) {
      svgHtml += `<polygon points="${arrowSize},${cy - arrowSize * 0.6} 0,${cy} ${arrowSize},${cy + arrowSize * 0.6}" fill="${strokeColor}" />`;
    }

    // Bitiş Oku
    if (hasEndArrow) {
      svgHtml += `<polygon points="${w - arrowSize},${cy - arrowSize * 0.6} ${w},${cy} ${w - arrowSize},${cy + arrowSize * 0.6}" fill="${strokeColor}" />`;
    }

    svgHtml += `</svg>`;
    return svgHtml;
  }

  updateModeClass() {
    const mode = this.core.getMode();
    this.stage.classList.remove('mode-design', 'mode-answer-key', 'mode-preview');
    this.stage.classList.add(`mode-${mode}`);
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.ObjectManager = ObjectManager;

/**
 * SelectionManager - Tekli ve çoklu nesne seçimi, seçim çerçevesi,
 * 8 yönlü boyutlandırma tutamaçları ve döndürme tutamacını yönetir.
 */
class SelectionManager {
  constructor(core, stageManager, objectManager, stageEl, options = {}) {
    this.core = core;
    this.stageManager = stageManager;
    this.objectManager = objectManager;
    this.stage = stageEl;
    this.signal = options.signal;

    this.selectedIds = new Set();
    this.clipboard = [];

    this.selectionOverlay = stageEl.querySelector('#selection-overlay');
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.core.on('projectLoaded', () => this.clearSelection());
    this.core.on('objectDeleted', (e) => this.deselect(e.object.id));
    this.core.on('objectUpdated', () => this.updateSelectionBox());
    this.core.on('modeChanged', () => {
      if (this.core.getMode() !== 'design') {
        this.clearSelection();
      }
    });
  }

  setupEventListeners() {
    // Klavye kısayolları
    window.addEventListener('keydown', (e) => {
      // Eğer kullanıcı bir input, textarea veya contenteditable içindeyse dinleme
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
          document.activeElement?.isContentEditable) {
        return;
      }

      if (this.core.getMode() !== 'design') return;

      // Silme: Delete veya Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedIds.size > 0) {
          e.preventDefault();
          this.deleteSelected();
        }
      }

      // Kopyala: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.copy();
      }

      // Yapıştır: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        this.paste();
      }

      // Grupla: Ctrl+G / Cmd+G
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        this.groupSelected();
      }

      // Grubu Çöz: Ctrl+Shift+G / Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        this.ungroupSelected();
      }

      // Çoğalt: Ctrl+D / Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.duplicateSelected();
      }

      // Tümünü Seç: Ctrl+A / Cmd+A
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.selectAll();
      }

      // Seçimi Bırak: Escape
      if (e.key === 'Escape') {
        this.clearSelection();
      }

      // Enter: Seçili nesneyi yerinde düzenlemeye başla
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (this.selectedIds.size === 1) {
          const primary = this.getPrimarySelected();
          if (primary && !primary.locked) {
            e.preventDefault();
            this.core.emit('requestInlineTextEdit', { objectId: primary.id });
          }
        }
      }

      // Ok Tuşlarıyla Kaydırma (Nudge)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (this.selectedIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;

          this.nudgeSelected(dx, dy);
        }
      }
    }, this.signal ? { signal: this.signal } : undefined);
  }

  select(id, multi = false) {
    if (this.core.getMode() !== 'design') return;
    const obj = this.objectManager.getObject(id);
    if (!obj) return;

    if (!multi) {
      this.selectedIds.clear();
    }

    // Eğer nesne bir gruba aitse, grubun tüm üyelerini seç
    if (obj.groupId) {
      const groupMembers = this.objectManager.getObjects().filter(o => o.groupId === obj.groupId);
      groupMembers.forEach(m => this.selectedIds.add(m.id));
    } else {
      this.selectedIds.add(id);
    }

    this.updateSelectionBox();
    this.core.emit('selectionChanged', {
      selectedIds: Array.from(this.selectedIds),
      primaryObject: obj
    });
  }

  toggleSelect(id) {
    const obj = this.objectManager.getObject(id);
    if (!obj) return;

    if (obj.groupId) {
      const groupMembers = this.objectManager.getObjects().filter(o => o.groupId === obj.groupId);
      const isAnySelected = groupMembers.some(m => this.selectedIds.has(m.id));
      if (isAnySelected) {
        groupMembers.forEach(m => this.selectedIds.delete(m.id));
      } else {
        groupMembers.forEach(m => this.selectedIds.add(m.id));
      }
    } else {
      if (this.selectedIds.has(id)) {
        this.deselect(id);
      } else {
        this.select(id, true);
      }
    }
    this.updateSelectionBox();
    this.core.emit('selectionChanged', {
      selectedIds: Array.from(this.selectedIds),
      primaryObject: this.getPrimarySelected()
    });
  }

  deselect(id) {
    this.selectedIds.delete(id);
    this.updateSelectionBox();
    this.core.emit('selectionChanged', {
      selectedIds: Array.from(this.selectedIds),
      primaryObject: this.getPrimarySelected()
    });
  }

  clearSelection() {
    if (this.selectedIds.size === 0) return;
    this.selectedIds.clear();
    this.updateSelectionBox();
    this.core.emit('selectionChanged', { selectedIds: [], primaryObject: null });
  }

  selectAll() {
    this.selectedIds.clear();
    this.objectManager.getObjects().forEach(obj => {
      if (!obj.locked && obj.visible !== false) {
        this.selectedIds.add(obj.id);
      }
    });
    this.updateSelectionBox();
    this.core.emit('selectionChanged', {
      selectedIds: Array.from(this.selectedIds),
      primaryObject: this.getPrimarySelected()
    });
  }

  getSelectedObjects() {
    return Array.from(this.selectedIds)
      .map(id => this.objectManager.getObject(id))
      .filter(Boolean);
  }

  getPrimarySelected() {
    if (this.selectedIds.size === 0) return null;
    const firstId = this.selectedIds.values().next().value;
    return this.objectManager.getObject(firstId) || null;
  }

  groupSelected() {
    const selected = this.getSelectedObjects();
    if (selected.length < 2) return null;

    const newGroupId = 'grp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    selected.forEach(o => {
      this.objectManager.updateObject(o.id, { groupId: newGroupId }, false);
    });
    this.core.pushHistoryState('Nesneleri Grupla');
    this.updateSelectionBox();
    this.core.emit('selectionChanged', {
      selectedIds: Array.from(this.selectedIds),
      primaryObject: this.getPrimarySelected()
    });
    return newGroupId;
  }

  ungroupSelected() {
    const selected = this.getSelectedObjects();
    const groupIds = new Set(selected.map(o => o.groupId).filter(Boolean));
    if (groupIds.size === 0) return false;

    const allObjects = this.objectManager.getObjects();
    allObjects.forEach(o => {
      if (groupIds.has(o.groupId)) {
        this.objectManager.updateObject(o.id, { groupId: null }, false);
      }
    });
    this.core.pushHistoryState('Grubu Çöz');
    this.updateSelectionBox();
    this.core.emit('selectionChanged', {
      selectedIds: Array.from(this.selectedIds),
      primaryObject: this.getPrimarySelected()
    });
    return true;
  }

  deleteSelected() {
    const ids = Array.from(this.selectedIds);
    this.clearSelection();
    ids.forEach(id => this.objectManager.deleteObject(id));
  }

  duplicateSelected() {
    const ids = Array.from(this.selectedIds);
    this.clearSelection();
    const groupMap = new Map();
    const newIds = [];
    ids.forEach(id => {
      const src = this.objectManager.getObject(id);
      let targetGroupId = undefined;
      if (src && src.groupId) {
        if (!groupMap.has(src.groupId)) {
          groupMap.set(src.groupId, 'grp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
        }
        targetGroupId = groupMap.get(src.groupId);
      }
      const dup = this.objectManager.duplicateObject(id);
      if (dup) {
        if (targetGroupId !== undefined) {
          this.objectManager.updateObject(dup.id, { groupId: targetGroupId }, false);
        }
        newIds.push(dup.id);
      }
    });
    newIds.forEach(id => this.select(id, true));
  }

  copy() {
    this.clipboard = this.getSelectedObjects().map(o => JSON.parse(JSON.stringify(o)));
  }

  paste() {
    if (!this.clipboard || this.clipboard.length === 0) return;
    this.clearSelection();
    const groupMap = new Map();
    const newIds = [];
    this.clipboard.forEach(item => {
      const copyProps = Object.assign({}, item);
      delete copyProps.id;
      copyProps.name = `${item.name} (Kopya)`;
      copyProps.x = Math.min(this.core.data.stage.width - item.width, item.x + 25);
      copyProps.y = Math.min(this.core.data.stage.height - item.height, item.y + 25);
      if (item.groupId) {
        if (!groupMap.has(item.groupId)) {
          groupMap.set(item.groupId, 'grp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
        }
        copyProps.groupId = groupMap.get(item.groupId);
      }
      const newObj = this.objectManager.createObject(item.type, item.role, copyProps);
      if (newObj) newIds.push(newObj.id);
    });
    newIds.forEach(id => this.select(id, true));
  }

  nudgeSelected(dx, dy) {
    this.getSelectedObjects().forEach(obj => {
      if (obj.locked) return;
      this.objectManager.updateObject(obj.id, {
        x: Math.max(0, Math.min(this.core.data.stage.width - obj.width, obj.x + dx)),
        y: Math.max(0, Math.min(this.core.data.stage.height - obj.height, obj.y + dy))
      }, true);
    });
    this.updateSelectionBox();
  }

  // Seçim Kutusu DOM Güncellemesi
  updateSelectionBox() {
    if (!this.selectionOverlay) return;

    // Önceki vurguları temizle
    this.stage.querySelectorAll('.stage-object.is-selected').forEach(el => {
      el.classList.remove('is-selected');
    });

    const selectedObjs = this.getSelectedObjects();

    if (selectedObjs.length === 0 || this.core.getMode() !== 'design') {
      this.selectionOverlay.style.display = 'none';
      return;
    }

    selectedObjs.forEach(obj => {
      const domEl = this.stage.querySelector(`[data-id="${obj.id}"]`);
      if (domEl) domEl.classList.add('is-selected');
    });

    this.selectionOverlay.style.display = 'block';

    if (selectedObjs.length === 1) {
      // Tek nesne seçimi: Nesnenin kendi konumu ve dönüş açısı kullanılır
      const obj = selectedObjs[0];
      this.renderSingleSelectionBox(obj);
    } else {
      // Çoklu nesne seçimi: Tüm nesneleri kapsayan AABB kutusu
      this.renderMultiSelectionBox(selectedObjs);
    }
  }

  renderSingleSelectionBox(obj) {
    this.selectionOverlay.style.width = `${obj.width}px`;
    this.selectionOverlay.style.height = `${obj.height}px`;
    this.selectionOverlay.style.transform = `translate(${obj.x}px, ${obj.y}px) rotate(${obj.rotation || 0}deg)`;
    this.selectionOverlay.style.transformOrigin = 'center center';

    if (obj.locked) {
      this.selectionOverlay.className = 'selection-box single-select is-locked-selection';
      const isNearTop = (obj.y || 0) < 45;
      const pillPosStyle = isNearTop ? 'bottom: -38px; top: auto;' : 'top: -38px;';
      this.selectionOverlay.innerHTML = `
        <div class="selection-border locked-border"></div>
        <div class="selection-lock-floating-pill" style="${pillPosStyle}">
          <button type="button" class="lock-pill-unlock-btn" title="Kilidi Aç">🔓 Kilidi Aç</button>
        </div>
      `;
      const unlockBtn = this.selectionOverlay.querySelector('.lock-pill-unlock-btn');
      if (unlockBtn) {
        unlockBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.objectManager.updateObject(obj.id, { locked: false });
          this.updateSelectionBox();
          this.core.emit('selectionChanged', {
            selectedIds: Array.from(this.selectedIds),
            primaryObject: this.objectManager.getObject(obj.id)
          });
          if (window.app && window.app.miniToolbar) {
            window.app.miniToolbar.show();
          }
        };
      }
      return;
    }

    // Çizgi nesnesi için sadece iki uçta ölçeklendirme tutamaçları
    if (obj.type === 'line') {
      this.selectionOverlay.className = 'selection-box single-select is-line-selection';
      this.selectionOverlay.innerHTML = `
        <div class="resize-handle line-endpoint-handle handle-start" data-handle="w" title="Başlangıç ucunu uzat / kısalt"></div>
        <div class="resize-handle line-endpoint-handle handle-end" data-handle="e" title="Bitiş ucunu uzat / kısalt"></div>
      `;
      return;
    }

    this.selectionOverlay.className = 'selection-box single-select';
    // 8 tutamaç + döndürme tutamacı
    this.selectionOverlay.innerHTML = `
      <div class="selection-border"></div>
      <div class="resize-handle handle-nw" data-handle="nw"></div>
      <div class="resize-handle handle-n"  data-handle="n"></div>
      <div class="resize-handle handle-ne" data-handle="ne"></div>
      <div class="resize-handle handle-e"  data-handle="e"></div>
      <div class="resize-handle handle-se" data-handle="se"></div>
      <div class="resize-handle handle-s"  data-handle="s"></div>
      <div class="resize-handle handle-sw" data-handle="sw"></div>
      <div class="resize-handle handle-w"  data-handle="w"></div>
      <div class="rotate-stem"></div>
      <div class="rotate-handle" data-handle="rotate" title="Döndürmek için sürükleyin"></div>
    `;
  }

  renderMultiSelectionBox(objects) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    objects.forEach(o => {
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.width);
      maxY = Math.max(maxY, o.y + o.height);
    });

    const w = maxX - minX;
    const h = maxY - minY;

    this.selectionOverlay.style.width = `${w}px`;
    this.selectionOverlay.style.height = `${h}px`;
    this.selectionOverlay.style.transform = `translate(${minX}px, ${minY}px) rotate(0deg)`;
    this.selectionOverlay.style.transformOrigin = 'center center';
    this.selectionOverlay.className = 'selection-box multi-select';

    const isGroup = objects.length > 1 && objects.every(o => o.groupId && o.groupId === objects[0].groupId);

    // Çoklu seçimde sadece taşıma ve sınır çerçevesi görünür
    this.selectionOverlay.innerHTML = `
      <div class="selection-border ${isGroup ? 'group-border' : ''}"></div>
      <div class="multi-count-badge ${isGroup ? 'is-group-badge' : ''}">${isGroup ? `👥 Grup (${objects.length} nesne)` : `${objects.length} nesne seçildi`}</div>
    `;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.SelectionManager = SelectionManager;

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

/**
 * LayerManager - Sahnedeki nesnelerin katman sırasını (z-index) ve
 * öne/arkaya getirme işlemlerini yönetir.
 */
class LayerManager {
  constructor(core, objectManager) {
    this.core = core;
    this.objectManager = objectManager;
  }

  getSortedObjects() {
    return [...this.core.data.objects].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
  }

  normalizeLayers() {
    const sorted = this.getSortedObjects();
    sorted.forEach((obj, idx) => {
      obj.zIndex = idx + 1;
      this.objectManager.updateObjectDOM(obj);
    });
  }

  bringToFront(id) {
    const obj = this.objectManager.getObject(id);
    if (!obj) return;

    this.normalizeLayers();
    const sorted = this.getSortedObjects();
    const maxZ = sorted[sorted.length - 1]?.zIndex || 1;
    obj.zIndex = maxZ + 1;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: obj });
    this.core.emit('dataChanged', { source: 'layer' });
  }

  sendToBack(id) {
    const obj = this.objectManager.getObject(id);
    if (!obj) return;

    this.normalizeLayers();
    obj.zIndex = 0;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: obj });
    this.core.emit('dataChanged', { source: 'layer' });
  }

  bringForward(id) {
    this.normalizeLayers();
    const sorted = this.getSortedObjects();
    const idx = sorted.findIndex(o => o.id === id);
    if (idx === -1 || idx === sorted.length - 1) return;

    // Bir üsttekiyle yer değiştir
    const nextObj = sorted[idx + 1];
    const tempZ = sorted[idx].zIndex;
    sorted[idx].zIndex = nextObj.zIndex;
    nextObj.zIndex = tempZ;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: sorted[idx] });
    this.core.emit('dataChanged', { source: 'layer' });
  }

  sendBackward(id) {
    this.normalizeLayers();
    const sorted = this.getSortedObjects();
    const idx = sorted.findIndex(o => o.id === id);
    if (idx <= 0) return;

    // Bir alttakiyle yer değiştir
    const prevObj = sorted[idx - 1];
    const tempZ = sorted[idx].zIndex;
    sorted[idx].zIndex = prevObj.zIndex;
    prevObj.zIndex = tempZ;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: sorted[idx] });
    this.core.emit('dataChanged', { source: 'layer' });
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.LayerManager = LayerManager;

/**
 * AnswerKeyManager - Görsel cevap anahtarı sistemi.
 * Sürüklenebilir nesneler ile hedef alanlar arasındaki ilişkileri
 * görsel SVG bağlantı çizgileriyle kurar, düzenler ve veri modeline işler.
 */
class AnswerKeyManager {
  constructor(core, stageManager, objectManager, stageEl) {
    this.core = core;
    this.stageManager = stageManager;
    this.objectManager = objectManager;
    this.stage = stageEl;

    this.svgConnections = stageEl.querySelector('#svg-connections');
    this.activeSourceId = null; // Bağlantı için seçilen sürüklenebilir nesne
    this.guideBar = null;

    this.init();
  }

  init() {
    this.core.on('modeChanged', ({ newMode }) => {
      this.activeSourceId = null;
      this.stage.classList.remove('ak-selecting-target');
      if (newMode === 'answer-key') {
        this.renderConnections();
        this.updateGuideBar();
        setTimeout(() => this.stageManager.updateScale(), 0);
      } else {
        this.clearSvg();
        this.updateGuideBar();
        setTimeout(() => this.stageManager.updateScale(), 0);
      }
    });

    this.core.on('projectLoaded', () => {
      this.cleanupDanglingKeys();
      if (this.core.getMode() === 'answer-key') this.renderConnections();
      this.updateGuideBar();
    });

    this.core.on('objectDeleted', () => {
      this.cleanupDanglingKeys();
      if (this.core.getMode() === 'answer-key') this.renderConnections();
      this.updateGuideBar();
    });

    this.core.on('objectUpdated', () => {
      if (this.core.getMode() === 'answer-key') this.renderConnections();
      this.updateGuideBar();
    });

    this.core.on('objectAdded', () => {
      this.updateGuideBar();
    });

    this.core.on('answerKeyChanged', () => {
      this.updateGuideBar();
    });

    this.setupClickInteraction();
    this.updateGuideBar();
  }

  getGuideBar() {
    if (this.guideBar && this.guideBar.isConnected) return this.guideBar;
    const root = (this.stage && this.stage.getRootNode && this.stage.getRootNode() !== document)
      ? this.stage.getRootNode()
      : document;
    this.guideBar = (root.getElementById ? root.getElementById('answer-key-guide-bar') : null)
      || (root.querySelector ? root.querySelector('#answer-key-guide-bar') : null)
      || document.getElementById('answer-key-guide-bar');
    return this.guideBar;
  }

  getGuideState() {
    const objects = this.core.data.objects || [];
    const answerKey = this.core.data.answerKey || {};
    const draggables = objects.filter(o => o.role === 'draggable');
    const targets = objects.filter(o => ['target', 'category', 'sequence_slot'].includes(o.role));
    const targetIds = new Set(targets.map(t => t.id));

    const totalDraggables = draggables.length;
    let matchedCount = 0;
    draggables.forEach(d => {
      const tId = answerKey[d.id];
      if (tId && (targetIds.has(tId) || this.core.data.project?.activityType === 'sequencing')) {
        matchedCount++;
      }
    });

    // 1. Sahne açıldığında, tüm eşleştirmeler yapılmışsa:
    //    Tüm eşleşmeler tamamlandı / Cevap anahtarını kontrol edebilirsin
    // 2. Eşleştirmeler hiç yapılmamışsa:
    //    Cevap anahtarı oluştur / Seçerek eşleştirmeye başla
    // 3. Eşleştirme eksikse:
    //    Eşleştirmeye devam et / Sıradaki nesneyi seçerek devam et.
    if (totalDraggables > 0 && matchedCount >= totalDraggables) {
      return {
        status: 'all-completed',
        title: 'Tüm eşleşmeler tamamlandı',
        instruction: 'Cevap anahtarını kontrol edebilirsin',
        matchedCount,
        totalDraggables
      };
    } else if (matchedCount === 0) {
      return {
        status: 'none-completed',
        title: 'Cevap anahtarı oluştur',
        instruction: this.activeSourceId ? 'Hedef nesneyi seçerek eşleştirmeyi tamamla' : 'Seçerek eşleştirmeye başla',
        matchedCount,
        totalDraggables
      };
    } else {
      return {
        status: 'incomplete',
        title: 'Eşleştirmeye devam et',
        instruction: this.activeSourceId ? 'Hedef nesneyi seçerek eşleştirmeyi tamamla' : 'Sıradaki nesneyi seçerek devam et.',
        matchedCount,
        totalDraggables
      };
    }
  }

  updateGuideBar() {
    const bar = this.getGuideBar();
    if (!bar) return;

    const isAnswerKey = this.core.getMode() === 'answer-key';
    bar.style.display = isAnswerKey ? 'flex' : 'none';

    if (!isAnswerKey) return;

    const state = this.getGuideState();

    const titleEl = bar.querySelector('#ak-guide-title');
    const instructionEl = bar.querySelector('#ak-guide-instruction');
    const counterEl = bar.querySelector('#ak-guide-counter');
    const iconBadge = bar.querySelector('.ak-guide-icon-badge');

    if (titleEl) titleEl.textContent = state.title;
    if (instructionEl) instructionEl.textContent = state.instruction;

    if (counterEl) {
      counterEl.textContent = `${state.matchedCount} / ${state.totalDraggables} Eşleşti`;
      counterEl.classList.toggle('is-complete', state.status === 'all-completed');
    }

    if (iconBadge) {
      iconBadge.classList.toggle('is-complete', state.status === 'all-completed');
    }

    bar.setAttribute('data-guide-state', state.status);
  }

  setupClickInteraction() {
    // Cevap anahtarı modunda nesnelere tıklama ile eşleştirme
    this.stage.addEventListener('click', (e) => {
      if (this.core.getMode() !== 'answer-key') return;

      const objEl = e.target.closest('.stage-object');
      if (!objEl) {
        // Boşluğa tıklanırsa seçili kaynağı bırak
        if (this.activeSourceId) {
          this.activeSourceId = null;
          this.updateVisualHighlights();
          this.updateGuideBar();
        }
        return;
      }

      const id = objEl.getAttribute('data-id');
      const obj = this.objectManager.getObject(id);
      if (!obj) return;

      e.stopPropagation();

      // 1. Durum: Sürüklenebilir bir nesneye tıklandıysa
      if (obj.role === 'draggable') {
        if (this.activeSourceId === id) {
          // Zaten seçiliyse seçimi kaldır
          this.activeSourceId = null;
        } else {
          // Yeni kaynak seçildi
          this.activeSourceId = id;
        }
        this.updateVisualHighlights();
        this.updateGuideBar();
        return;
      }

      // 2. Durum: Kaynak seçiliyken sadece sahne rolü "Hedef" olan nesneler tıklanabilir olmalı
      if (this.activeSourceId) {
        const isTarget = ['target', 'category', 'sequence_slot'].includes(obj.role);

        if (isTarget) {
          this.setAnswer(this.activeSourceId, obj.id);
          this.activeSourceId = null;
          this.updateVisualHighlights();
          this.renderConnections();
          this.updateGuideBar();
        }
      }
    });
  }

  setAnswer(draggableId, targetId) {
    if (!this.core.data.answerKey) {
      this.core.data.answerKey = {};
    }

    this.core.data.answerKey[draggableId] = targetId;
    this.core.emit('answerKeyChanged', {
      draggableId,
      targetId,
      answerKey: this.core.data.answerKey
    });
    this.core.emit('dataChanged', { source: 'answerKey' });
    this.core.autoSave();
    this.updateGuideBar();
  }

  removeAnswer(draggableId) {
    if (this.core.data.answerKey && this.core.data.answerKey[draggableId]) {
      delete this.core.data.answerKey[draggableId];
      this.core.emit('answerKeyChanged', {
        draggableId,
        targetId: null,
        answerKey: this.core.data.answerKey
      });
      this.core.emit('dataChanged', { source: 'answerKey' });
      this.core.autoSave();
      this.renderConnections();
      this.updateGuideBar();
    }
  }

  getAnswer(draggableId) {
    return this.core.data.answerKey ? this.core.data.answerKey[draggableId] : null;
  }

  cleanupDanglingKeys() {
    if (!this.core.data.answerKey) return;
    const currentIds = new Set(this.core.data.objects.map(o => o.id));

    let changed = false;
    for (const [dragId, targetId] of Object.entries(this.core.data.answerKey)) {
      if (!currentIds.has(dragId)) {
        delete this.core.data.answerKey[dragId];
        changed = true;
      }
      // Sıralama etkinliğinde targetId bazen indeks olabilir, nesne id'si ise kontrol et
      if (this.core.data.project.activityType !== 'sequencing') {
        if (!currentIds.has(targetId)) {
          delete this.core.data.answerKey[dragId];
          changed = true;
        }
      }
    }
    if (changed) {
      this.core.emit('answerKeyChanged', { answerKey: this.core.data.answerKey });
      this.core.autoSave();
    }
  }

  // Görsel vurguları güncelle (Sadece seçilen kaynak nesne vurgulanır, diğer nesneler değişmez)
  updateVisualHighlights() {
    this.stage.querySelectorAll('.stage-object').forEach(el => {
      el.classList.remove('ak-source-active', 'ak-target-candidate');
    });

    if (this.activeSourceId) {
      this.stage.classList.add('ak-selecting-target');
      const activeEl = this.stage.querySelector(`[data-id="${this.activeSourceId}"]`);
      if (activeEl) {
        activeEl.classList.add('ak-source-active');
      }
    } else {
      this.stage.classList.remove('ak-selecting-target');
    }
  }

  // SVG Bağlantı Çizgilerini Çiz
  renderConnections() {
    if (!this.svgConnections) return;
    this.clearSvg();

    const answerKey = this.core.data.answerKey || {};
    const objectsMap = new Map();
    this.core.data.objects.forEach(o => objectsMap.set(o.id, o));

    for (const [dragId, targetId] of Object.entries(answerKey)) {
      const sourceObj = objectsMap.get(dragId);
      const targetObj = objectsMap.get(targetId);

      if (!sourceObj || !targetObj) continue;

      this.drawConnectionLine(sourceObj, targetObj, dragId);
    }
  }

  // İki nesne arasındaki en optimum karşılıklı kenar merkezlerini ve yönü hesaplar
  getFacingAnchorPoints(source, target) {
    const sLeft = source.x;
    const sRight = source.x + source.width;
    const sTop = source.y;
    const sBottom = source.y + source.height;
    const sCx = source.x + source.width / 2;
    const sCy = source.y + source.height / 2;

    const tLeft = target.x;
    const tRight = target.x + target.width;
    const tTop = target.y;
    const tBottom = target.y + target.height;
    const tCx = target.x + target.width / 2;
    const tCy = target.y + target.height / 2;

    const dx = tCx - sCx;
    const dy = tCy - sCy;

    // 1. Yatay karşılıklı kenar adayı (Sağ -> Sol veya Sol -> Sağ)
    let hPair;
    if (dx >= 0) {
      // Hedef sağda: Kaynak sağ kenarından hedefin sol kenarına
      hPair = {
        p1: { x: sRight, y: sCy },
        p2: { x: tLeft, y: tCy },
        dir: 'horizontal-right',
        dist: Math.hypot(tLeft - sRight, tCy - sCy)
      };
    } else {
      // Hedef solda: Kaynak sol kenarından hedefin sağ kenarına
      hPair = {
        p1: { x: sLeft, y: sCy },
        p2: { x: tRight, y: tCy },
        dir: 'horizontal-left',
        dist: Math.hypot(sLeft - tRight, tCy - sCy)
      };
    }

    // 2. Dikey karşılıklı kenar adayı (Alt -> Üst veya Üst -> Alt)
    let vPair;
    if (dy >= 0) {
      // Hedef altta: Kaynak alt kenarından hedefin üst kenarına
      vPair = {
        p1: { x: sCx, y: sBottom },
        p2: { x: tCx, y: tTop },
        dir: 'vertical-down',
        dist: Math.hypot(tCx - sCx, tTop - sBottom)
      };
    } else {
      // Hedef üstte: Kaynak üst kenarından hedefin alt kenarına
      vPair = {
        p1: { x: sCx, y: sTop },
        p2: { x: tCx, y: tBottom },
        dir: 'vertical-up',
        dist: Math.hypot(tCx - sCx, sTop - tBottom)
      };
    }

    // Açık yön tayini:
    // Sütunlar şeklinde yan yana dizilimlerde (kaynak sağ kenarı <= hedef sol kenarı) yatay bağlantı esastır
    const isClearlyHorizontal = (sRight <= tLeft || tRight <= sLeft) && Math.abs(dx) >= Math.abs(dy);
    const isClearlyVertical = (sBottom <= tTop || tBottom <= sTop) && Math.abs(dy) >= Math.abs(dx);

    let chosen;
    if (isClearlyHorizontal && !isClearlyVertical) {
      chosen = hPair;
    } else if (isClearlyVertical && !isClearlyHorizontal) {
      chosen = vPair;
    } else {
      // Kenarlar arası gerçek Öklid mesafesi en kısa olan optimum karşılıklı kenar çiftini seç
      chosen = (hPair.dist <= vPair.dist) ? hPair : vPair;
    }

    return { p1: chosen.p1, p2: chosen.p2, dir: chosen.dir };
  }

  drawConnectionLine(source, target, dragId) {
    // Nesnelerin ortasından değil karşılıklı kenarlarından bağla
    const { p1, p2, dir } = this.getFacingAnchorPoints(source, target);

    const deltaX = Math.abs(p2.x - p1.x);
    const deltaY = Math.abs(p2.y - p1.y);

    let cx1, cy1, cx2, cy2;

    if (dir === 'horizontal-right') {
      const curvature = Math.max(30, Math.min(100, Math.max(deltaX * 0.5, 40)));
      cx1 = p1.x + curvature;
      cy1 = p1.y;
      cx2 = p2.x - curvature;
      cy2 = p2.y;
    } else if (dir === 'horizontal-left') {
      const curvature = Math.max(30, Math.min(100, Math.max(deltaX * 0.5, 40)));
      cx1 = p1.x - curvature;
      cy1 = p1.y;
      cx2 = p2.x + curvature;
      cy2 = p2.y;
    } else if (dir === 'vertical-down') {
      const curvature = Math.max(30, Math.min(100, Math.max(deltaY * 0.5, 40)));
      cx1 = p1.x;
      cy1 = p1.y + curvature;
      cx2 = p2.x;
      cy2 = p2.y - curvature;
    } else { // 'vertical-up'
      const curvature = Math.max(30, Math.min(100, Math.max(deltaY * 0.5, 40)));
      cx1 = p1.x;
      cy1 = p1.y - curvature;
      cx2 = p2.x;
      cy2 = p2.y + curvature;
    }

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ak-connection-group');

    // Arka plan kalın yol (tıklamayı kolaylaştırmak için)
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`);
    hitPath.setAttribute('class', 'ak-connection-hitbox');

    // Görsel renkli çizgi
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`);
    path.setAttribute('class', 'ak-connection-path');

    // Başlangıç ve bitiş noktası daireleri
    const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startCircle.setAttribute('cx', p1.x);
    startCircle.setAttribute('cy', p1.y);
    startCircle.setAttribute('r', '5');
    startCircle.setAttribute('class', 'ak-node-circle start');

    const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endCircle.setAttribute('cx', p2.x);
    endCircle.setAttribute('cy', p2.y);
    endCircle.setAttribute('r', '6');
    endCircle.setAttribute('class', 'ak-node-circle end');

    // Orta rozet / Silme butonu (foreignObject ile HTML butonu - tam merkezlenmiş)
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', midX - 13);
    fo.setAttribute('y', midY - 13);
    fo.setAttribute('width', '26');
    fo.setAttribute('height', '26');

    const btn = document.createElement('button');
    btn.className = 'ak-unlink-btn';
    btn.innerHTML = '✕';
    btn.title = 'Eşleştirmeyi Kaldır';
    btn.onclick = (e) => {
      e.stopPropagation();
      this.removeAnswer(dragId);
    };
    fo.appendChild(btn);

    g.appendChild(hitPath);
    g.appendChild(path);
    g.appendChild(startCircle);
    g.appendChild(endCircle);
    g.appendChild(fo);

    this.svgConnections.appendChild(g);
  }

  clearSvg() {
    if (this.svgConnections) {
      this.svgConnections.innerHTML = '';
    }
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.AnswerKeyManager = AnswerKeyManager;

/**
 * TransformEngine - Pointer Events API kullanarak tasarım modunda nesnelerin
 * taşınmasını, 8 tutamaçla boyutlandırılmasını, döndürülmesini ve
 * sahne üzeri çoklu seçim (marquee selection) işlemlerini yönetir.
 */
class TransformEngine {
  constructor(core, stageManager, objectManager, selectionManager, historyManager, stageEl, options = {}) {
    this.core = core;
    this.stageManager = stageManager;
    this.objectManager = objectManager;
    this.selectionManager = selectionManager;
    this.historyManager = historyManager;
    this.stage = stageEl;
    this.signal = options.signal;

    this.activeAction = null; // 'move' | 'resize' | 'rotate' | 'marquee'
    this.activeHandle = null; // 'nw', 'n', 'se', vb.

    this.startStagePos = { x: 0, y: 0 };
    this.startClientPos = null;
    this.hasMovedOrDragged = false;
    this.isPointerDown = false;
    this.startObjectsData = []; // Başlangıçtaki nesne verileri
    this.activePointerId = null;

    // Marquee seçim kutusu elementi
    this.marqueeEl = null;

    this.init();
  }

  init() {
    const options = this.signal ? { signal: this.signal } : undefined;
    this.stage.addEventListener('pointerdown', (e) => this.onPointerDown(e), options);
    window.addEventListener('pointermove', (e) => this.onPointerMove(e), options);
    window.addEventListener('pointerup', (e) => this.onPointerUp(e), options);
    window.addEventListener('pointercancel', (e) => this.onPointerCancel(e), options);
  }

  onPointerDown(e) {
    // Sadece tasarım modunda ve sol fare/dokunma ile çalışır
    if (this.core.getMode() !== 'design') return;
    if (e.button !== 0) return; // Sadece sol tık

    // Eğer kullanıcı bir metin düzenleme alanına tıkladıysa, tarayıcının yerel metin imleci/seçimini engelleme
    if (e.target.isContentEditable || e.target.closest('[contenteditable="true"]')) {
      return;
    }

    // Eğer başka bir yerde metin düzenleniyorsa ve dışarı tıklandıysa, düzenlemeyi sonlandır
    if (window.app && window.app.uiManager && window.app.uiManager.isEditingText) {
      if (!e.target.closest('#contextual-mini-toolbar')) {
        window.app.uiManager.finishInlineEditing();
      }
    }

    const clientPos = { x: e.clientX, y: e.clientY };
    const stagePos = this.stageManager.clientToStage(clientPos.x, clientPos.y);

    this.startStagePos = stagePos;
    this.startClientPos = clientPos;
    this.activePointerId = e.pointerId;
    this.hasMovedOrDragged = false;
    this.isPointerDown = true;

    // Sahneye basıldığı anda mini toolbar hemen gizlenir (basıldığı an değil bırakıldığı an görünür)
    this.core.emit('stagePointerDown', { clientX: e.clientX, clientY: e.clientY });

    // 1. Döndürme Tutamacı Kontrolü
    const rotateHandle = e.target.closest('.rotate-handle');
    if (rotateHandle) {
      e.stopPropagation();
      e.preventDefault();
      this.startRotate(stagePos);
      return;
    }

    // 2. Boyutlandırma Tutamacı Kontrolü
    const resizeHandle = e.target.closest('.resize-handle');
    if (resizeHandle) {
      e.stopPropagation();
      e.preventDefault();
      const handleType = resizeHandle.getAttribute('data-handle');
      this.startResize(handleType, stagePos);
      return;
    }

    // 3. Seçim Kutusu Üzerine Tıklama (Taşıma Başlatma)
    const unlockBtn = e.target.closest('.lock-pill-unlock-btn');
    if (unlockBtn) {
      e.stopPropagation();
      e.preventDefault();
      const primary = this.selectionManager.getPrimarySelected();
      if (primary) {
        this.objectManager.updateObject(primary.id, { locked: false });
        this.selectionManager.updateSelectionBox();
        this.core.emit('selectionChanged', {
          selectedIds: Array.from(this.selectionManager.selectedIds),
          primaryObject: this.objectManager.getObject(primary.id)
        });
        if (window.app && window.app.miniToolbar) {
          window.app.miniToolbar.show();
        }
      }
      return;
    }

    const selectionBorder = e.target.closest('.selection-border, .selection-box');
    if (selectionBorder) {
      e.stopPropagation();
      e.preventDefault();
      const primary = this.selectionManager.getPrimarySelected();
      if (primary && primary.locked) {
        return; // Kilitli nesne taşınamaz
      }
      this.startMove(stagePos);
      return;
    }

    // 4. Sahne Nesnesine Tıklama
    const objEl = e.target.closest('.stage-object');
    if (objEl) {
      e.stopPropagation();
      e.preventDefault();

      const objId = objEl.getAttribute('data-id');
      const obj = this.objectManager.getObject(objId);

      // Doğrudan kilit ikonuna tıklandıysa kilidi aç
      if (e.target.closest('.lock-indicator, .lock-badge-btn')) {
        this.objectManager.updateObject(objId, { locked: false });
        this.selectionManager.select(objId, false);
        return;
      }

      if (obj) {
        if (e.shiftKey) {
          this.selectionManager.toggleSelect(objId);
        } else {
          if (!this.selectionManager.selectedIds.has(objId)) {
            this.selectionManager.select(objId, false);
          }
        }

        // Sadece kilitli değilse taşımayı başlat
        if (!obj.locked) {
          this.startMove(stagePos);
        }
      }
      return;
    }

    // 5. Boş Sahneye Tıklama: Marquee Seçim veya Seçimi Temizleme
    if (!e.shiftKey) {
      this.selectionManager.clearSelection();
    }
    this.startMarquee(stagePos, e.shiftKey);
  }

  startMove(stagePos) {
    const selected = this.selectionManager.getSelectedObjects().filter(o => !o.locked);
    if (selected.length === 0) {
      this.activeAction = null;
      return;
    }

    this.activeAction = 'move';
    this.startObjectsData = selected.map(o => ({
      id: o.id,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height
    }));
  }

  startResize(handle, stagePos) {
    this.activeAction = 'resize';
    this.activeHandle = handle;
    const selected = this.selectionManager.getSelectedObjects();
    this.startObjectsData = selected.map(o => {
      const item = {
        id: o.id,
        type: o.type,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        rotation: o.rotation || 0
      };
      if (o.type === 'line') {
        const rad = (item.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        const hw = item.width / 2;
        item.p0 = { x: cx - hw * cos, y: cy - hw * sin };
        item.p1 = { x: cx + hw * cos, y: cy + hw * sin };
      }
      return item;
    });
  }

  startRotate(stagePos) {
    this.activeAction = 'rotate';
    const primary = this.selectionManager.getPrimarySelected();
    if (!primary) return;

    this.startObjectsData = [{
      id: primary.id,
      x: primary.x,
      y: primary.y,
      width: primary.width,
      height: primary.height,
      rotation: primary.rotation || 0,
      centerX: primary.x + primary.width / 2,
      centerY: primary.y + primary.height / 2
    }];
  }

  startMarquee(stagePos, shiftKey = false) {
    this.activeAction = 'marquee';
    this.isMarqueeShift = shiftKey;
    this.initialMarqueeSelectedIds = new Set(this.selectionManager.selectedIds);

    if (!this.marqueeEl) {
      this.marqueeEl = document.createElement('div');
      this.marqueeEl.className = 'stage-marquee-selection';
      this.stage.appendChild(this.marqueeEl);
    }
    this.marqueeEl.style.display = 'block';
    this.marqueeEl.style.left = `${stagePos.x}px`;
    this.marqueeEl.style.top = `${stagePos.y}px`;
    this.marqueeEl.style.width = '0px';
    this.marqueeEl.style.height = '0px';
  }

  onPointerMove(e) {
    if (!this.activeAction || this.activePointerId !== e.pointerId) return;

    if (this.startClientPos) {
      const clientDist = Math.hypot(e.clientX - this.startClientPos.x, e.clientY - this.startClientPos.y);
      if (clientDist > 4) {
        this.hasMovedOrDragged = true;
      }
    }

    const currentStagePos = this.stageManager.clientToStage(e.clientX, e.clientY);
    const dx = currentStagePos.x - this.startStagePos.x;
    const dy = currentStagePos.y - this.startStagePos.y;

    if (this.activeAction === 'move') {
      this.handleMoveAction(dx, dy);
    } else if (this.activeAction === 'resize') {
      this.handleResizeAction(dx, dy, e.shiftKey);
    } else if (this.activeAction === 'rotate') {
      this.handleRotateAction(currentStagePos, e.shiftKey);
    } else if (this.activeAction === 'marquee') {
      this.handleMarqueeAction(currentStagePos);
    }
  }

  handleMoveAction(dx, dy) {
    const stageW = this.core.data.stage.width;
    const stageH = this.core.data.stage.height;

    // Kılavuz hizalama çizgileri hesaplama
    let snappedDx = dx;
    let snappedDy = dy;
    const hGuides = [];
    const vGuides = [];

    // Birincil nesneye göre hizalama hesapla
    if (this.startObjectsData.length > 0) {
      const primaryStart = this.startObjectsData[0];
      let targetX = primaryStart.x + dx;
      let targetY = primaryStart.y + dy;

      if (this.stageManager.snapToGrid) {
        targetX = this.stageManager.snap(targetX);
        targetY = this.stageManager.snap(targetY);
        snappedDx = targetX - primaryStart.x;
        snappedDy = targetY - primaryStart.y;
      } else {
        // Akıllı merkez ve kenar kılavuzları
        const objMidX = targetX + primaryStart.width / 2;
        const objMidY = targetY + primaryStart.height / 2;
        const stageMidX = stageW / 2;
        const stageMidY = stageH / 2;

        const snapThreshold = 6;
        if (Math.abs(objMidX - stageMidX) < snapThreshold) {
          snappedDx = stageMidX - primaryStart.width / 2 - primaryStart.x;
          vGuides.push(stageMidX);
        }
        if (Math.abs(objMidY - stageMidY) < snapThreshold) {
          snappedDy = stageMidY - primaryStart.height / 2 - primaryStart.y;
          hGuides.push(stageMidY);
        }
      }
    }

    // Sahne sınırları kısıtlaması: Seçili nesneler sahne dışına ASLA taşamaz
    let minAllowedDx = -Infinity;
    let maxAllowedDx = Infinity;
    let minAllowedDy = -Infinity;
    let maxAllowedDy = Infinity;

    this.startObjectsData.forEach(item => {
      minAllowedDx = Math.max(minAllowedDx, -item.x);
      maxAllowedDx = Math.min(maxAllowedDx, stageW - item.width - item.x);
      minAllowedDy = Math.max(minAllowedDy, -item.y);
      maxAllowedDy = Math.min(maxAllowedDy, stageH - item.height - item.y);
    });

    if (minAllowedDx <= maxAllowedDx) {
      snappedDx = Math.max(minAllowedDx, Math.min(maxAllowedDx, snappedDx));
    }
    if (minAllowedDy <= maxAllowedDy) {
      snappedDy = Math.max(minAllowedDy, Math.min(maxAllowedDy, snappedDy));
    }

    this.stageManager.showGuidelines(hGuides, vGuides);

    this.startObjectsData.forEach(item => {
      const newX = Math.round(Math.max(0, Math.min(stageW - item.width, item.x + snappedDx)));
      const newY = Math.round(Math.max(0, Math.min(stageH - item.height, item.y + snappedDy)));

      this.objectManager.updateObject(item.id, { x: newX, y: newY }, false);
    });

    this.selectionManager.updateSelectionBox();
  }

  handleResizeAction(dx, dy, keepAspectRatio = false) {
    if (this.startObjectsData.length === 0) return;
    const start = this.startObjectsData[0];
    const handle = this.activeHandle;
    const stageW = this.core.data.stage.width;
    const stageH = this.core.data.stage.height;

    let newX = start.x;
    let newY = start.y;
    let newW = start.width;
    let newH = start.height;

    const isLine = start.type === 'line';
    const minW = isLine ? 20 : 30;
    const minH = isLine ? 6 : 30;

    if (isLine && start.p0 && start.p1) {
      const p0 = start.p0;
      const p1 = start.p1;

      if (handle.includes('e')) {
        let p1x = Math.max(0, Math.min(stageW, p1.x + dx));
        let p1y = Math.max(0, Math.min(stageH, p1.y + dy));
        let vx = p1x - p0.x;
        let vy = p1y - p0.y;
        let len = Math.hypot(vx, vy);
        if (len < minW) {
          len = minW;
          const curAngle = Math.atan2(vy, vx);
          p1x = p0.x + len * Math.cos(curAngle);
          p1y = p0.y + len * Math.sin(curAngle);
          vx = p1x - p0.x;
          vy = p1y - p0.y;
        }
        let deg = (Math.atan2(vy, vx) * 180) / Math.PI;
        if (keepAspectRatio) {
          deg = Math.round(deg / 15) * 15;
        } else {
          [-180, -90, 0, 90, 180].forEach(snapDeg => {
            if (Math.abs(deg - snapDeg) < 3.5) deg = snapDeg;
          });
        }
        const snapRad = (deg * Math.PI) / 180;
        const finalP1 = {
          x: p0.x + len * Math.cos(snapRad),
          y: p0.y + len * Math.sin(snapRad)
        };
        const cx = (p0.x + finalP1.x) / 2;
        const cy = (p0.y + finalP1.y) / 2;
        const newW = Math.round(len);
        const newH = start.height;
        const newX = Math.round(cx - newW / 2);
        const newY = Math.round(cy - newH / 2);
        const newRot = Math.round((deg % 360 + 360) % 360);

        this.objectManager.updateObject(start.id, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          rotation: newRot
        }, false);
        this.selectionManager.updateSelectionBox();
        return;
      } else if (handle.includes('w')) {
        let p0x = Math.max(0, Math.min(stageW, p0.x + dx));
        let p0y = Math.max(0, Math.min(stageH, p0.y + dy));
        let vx = p1.x - p0x;
        let vy = p1.y - p0y;
        let len = Math.hypot(vx, vy);
        if (len < minW) {
          len = minW;
          const curAngle = Math.atan2(vy, vx);
          p0x = p1.x - len * Math.cos(curAngle);
          p0y = p1.y - len * Math.sin(curAngle);
          vx = p1.x - p0x;
          vy = p1.y - p0y;
        }
        let deg = (Math.atan2(vy, vx) * 180) / Math.PI;
        if (keepAspectRatio) {
          deg = Math.round(deg / 15) * 15;
        } else {
          [-180, -90, 0, 90, 180].forEach(snapDeg => {
            if (Math.abs(deg - snapDeg) < 3.5) deg = snapDeg;
          });
        }
        const snapRad = (deg * Math.PI) / 180;
        const finalP0 = {
          x: p1.x - len * Math.cos(snapRad),
          y: p1.y - len * Math.sin(snapRad)
        };
        const cx = (finalP0.x + p1.x) / 2;
        const cy = (finalP0.y + p1.y) / 2;
        const newW = Math.round(len);
        const newH = start.height;
        const newX = Math.round(cx - newW / 2);
        const newY = Math.round(cy - newH / 2);
        const newRot = Math.round((deg % 360 + 360) % 360);

        this.objectManager.updateObject(start.id, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          rotation: newRot
        }, false);
        this.selectionManager.updateSelectionBox();
        return;
      }
    }

    // Tutamaç yönüne göre boyut hesaplama (sahne sınırları dahilinde)
    if (handle.includes('e')) {
      newW = Math.max(minW, Math.min(stageW - start.x, start.width + dx));
    }
    if (handle.includes('s')) {
      newH = Math.max(minH, Math.min(stageH - start.y, start.height + dy));
    }
    if (handle.includes('w')) {
      const maxDeltaLeft = start.x; // en fazla sahne soluna (0) kadar uzayabilir
      const safeDx = Math.max(-maxDeltaLeft, dx);
      const candidateW = start.width - safeDx;
      if (candidateW >= minW) {
        newW = candidateW;
        newX = start.x + safeDx;
      }
    }
    if (handle.includes('n')) {
      const maxDeltaTop = start.y; // en fazla sahne üstüne (0) kadar uzayabilir
      const safeDy = Math.max(-maxDeltaTop, dy);
      const candidateH = start.height - safeDy;
      if (candidateH >= minH) {
        newH = candidateH;
        newY = start.y + safeDy;
      }
    }

    // En-boy oranı koruma (Shift basılıysa veya görsel ise)
    if (keepAspectRatio && !isLine) {
      const ratio = start.width / start.height;
      if (['nw', 'ne', 'se', 'sw'].includes(handle)) {
        newH = Math.max(minH, Math.min(stageH - newY, newW / ratio));
      }
    }

    if (this.stageManager.snapToGrid) {
      newW = this.stageManager.snap(newW);
      newH = this.stageManager.snap(newH);
    }

    // Sahne dışına taşmayı kesin olarak engelle
    newX = Math.max(0, Math.min(stageW - minW, newX));
    newY = Math.max(0, Math.min(stageH - minH, newY));
    newW = Math.max(minW, Math.min(stageW - newX, newW));
    newH = Math.max(minH, Math.min(stageH - newY, newH));

    this.objectManager.updateObject(start.id, {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH)
    }, false);

    this.selectionManager.updateSelectionBox();
  }

  handleRotateAction(currentPos, snap15 = false) {
    if (this.startObjectsData.length === 0) return;
    const start = this.startObjectsData[0];

    const dx = currentPos.x - start.centerX;
    const dy = currentPos.y - start.centerY;

    let deg = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
    deg = (deg % 360 + 360) % 360;

    if (snap15) {
      deg = Math.round(deg / 15) * 15;
    }

    this.objectManager.updateObject(start.id, {
      rotation: Math.round(deg)
    }, false);

    this.selectionManager.updateSelectionBox();
  }

  handleMarqueeAction(currentPos) {
    if (!this.marqueeEl) return;

    const minX = Math.min(this.startStagePos.x, currentPos.x);
    const minY = Math.min(this.startStagePos.y, currentPos.y);
    const maxX = Math.max(this.startStagePos.x, currentPos.x);
    const maxY = Math.max(this.startStagePos.y, currentPos.y);

    const w = maxX - minX;
    const h = maxY - minY;

    this.marqueeEl.style.left = `${minX}px`;
    this.marqueeEl.style.top = `${minY}px`;
    this.marqueeEl.style.width = `${w}px`;
    this.marqueeEl.style.height = `${h}px`;

    // 1. Seçim alanı ile anlık olarak kesişen nesneleri tespit et
    const objects = this.objectManager.getObjects();
    const currentIntersectingIds = new Set();
    const groupIdsToInclude = new Set();

    objects.forEach(obj => {
      if (obj.locked || obj.visible === false) return;
      const intersects = (
        obj.x < maxX &&
        obj.x + obj.width > minX &&
        obj.y < maxY &&
        obj.y + obj.height > minY
      );
      if (intersects) {
        currentIntersectingIds.add(obj.id);
        if (obj.groupId) {
          groupIdsToInclude.add(obj.groupId);
        }
      }
    });

    // Gruba ait nesnelerden biri seçim alanındaysa grubun tüm üyelerini dahil et
    if (groupIdsToInclude.size > 0) {
      objects.forEach(obj => {
        if (obj.groupId && groupIdsToInclude.has(obj.groupId)) {
          currentIntersectingIds.add(obj.id);
        }
      });
    }

    // 2. Seçili nesneler kümesini dinamik olarak güncelle:
    // Seçim alanı değiştikçe kapsam dışına çıkan nesneler otomatik olarak seçimden çıkarılır
    this.selectionManager.selectedIds.clear();

    if (this.isMarqueeShift && this.initialMarqueeSelectedIds) {
      this.initialMarqueeSelectedIds.forEach(id => this.selectionManager.selectedIds.add(id));
    }

    currentIntersectingIds.forEach(id => this.selectionManager.selectedIds.add(id));

    // 3. Tuval üzerindeki seçim kutusu ve nesne vurgularını anlık canlı olarak yenile
    this.selectionManager.updateSelectionBox();
  }

  onPointerUp(e) {
    if (this.activePointerId !== e.pointerId) return;

    this.stageManager.clearGuidelines();

    if (this.activeAction === 'marquee' && this.marqueeEl) {
      this.marqueeEl.style.display = 'none';
      this.core.emit('selectionChanged', {
        selectedIds: Array.from(this.selectionManager.selectedIds),
        primaryObject: this.selectionManager.getPrimarySelected()
      });
    }

    if (['move', 'resize', 'rotate'].includes(this.activeAction)) {
      if (this.hasMovedOrDragged) {
        // Değişiklik geçmişe kaydedilir
        this.historyManager.pushState();
      }
    }

    const prevAction = this.activeAction;
    const wasDragged = this.hasMovedOrDragged;
    const isMarquee = prevAction === 'marquee';
    this.activeAction = null;
    this.activeHandle = null;
    this.activePointerId = null;
    this.startObjectsData = [];
    this.isPointerDown = false;
    this.isMarqueeShift = false;
    this.initialMarqueeSelectedIds = null;

    // Bırakıldığı anda mini toolbar durumunu bildir:
    // Tutulduğu anla bırakıldığı an sürükleme yapılmışsa mini toolbar görünmesin, yapılmamışsa görünsün
    this.core.emit('stagePointerUp', {
      hasDragged: wasDragged,
      isMarquee: isMarquee,
      action: prevAction,
      clientX: e.clientX,
      clientY: e.clientY
    });
  }

  onPointerCancel(e) {
    this.onPointerUp(e);
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.TransformEngine = TransformEngine;

/**
 * ActivityEngine - Etkinlik Oynatıcı Motoru.
 * Hem editör içi Önizleme (Preview) modunda hem de bağımsız dışa aktarılan
 * HTML dosyasında çalışan gerçek zamanlı öğrenci deneyimi motorudur.
 *
 * Dört etkinlik türünü eksiksiz destekler:
 * 1. Görsel Üzerinde Etiketleme
 * 2. Sürükle-Bırak Eşleştirme
 * 3. Kategorilere Ayırma
 * 4. Sürükleyerek Sıralama
 */
class ActivityEngine {
  constructor(containerEl, projectData, options = {}) {
    this.container = containerEl;
    this.projectData = JSON.parse(JSON.stringify(projectData)); // Orijinal veriyi korumak için derin kopya
    this.options = Object.assign({
      isEmbedded: false,
      stagePadding: null,
      onComplete: null,
      onExit: null,
      onStep: null,
      onDrop: null,
      onReset: null
    }, options);

    this.eventListeners = {};
    this.audio = new window.DND.AudioSynthesizer();
    this.audio.setEnabled(this.projectData.settings?.soundEnabled !== false);

    // Oyun durumları
    this.placedMap = {}; // { [draggableId]: targetId }
    this.originPositions = {}; // { [draggableId]: { x, y } }
    this.score = 0;
    this.attempts = 0;
    this.correctCount = 0;
    this.isCompleted = false;

    // Etkinlik Modu: 'learning' (Öğrenme - Anlık) veya 'assessment' (Değerlendirme - Toplu Kontrol)
    this.playMode = this.options.playMode || this.projectData.settings?.playMode || 'learning';
    this.isRetryMode = false;
    this.lockedTargetIds = new Set();

    // Sürükleme değişkenleri
    this.activeDragId = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragElemStart = { x: 0, y: 0 };
    this.activePointerId = null;
    this.currentScale = 1.0;

    // Klavye erişilebilirliği için seçili nesne
    this.keyboardSelectedId = null;

    // Geri bildirim durumu ve zamanlayıcısı
    this.feedbackTimeout = null;
    this.currentFeedback = null;

    // Yaşam döngüsü dinleyici referansları (Bellek sızıntılarını ve duplicate listener'ları önler)
    this.onResizeBound = () => this.updateScale();
    this.onPointerMoveBound = (e) => this.handlePointerMove(e);
    this.onPointerUpBound = (e) => this.handlePointerUp(e);
    this.onPointerCancelBound = (e) => this.handlePointerCancel(e);
    this.onKeyDownBound = (e) => this.handleKeyDown(e);

    this.init();
  }

  init() {
    this.renderGameLayout();
    this.setupResizeHandler();
    this.setupPointerEvents();
    this.setupKeyboardEvents();
    this.prepareItems();
  }

  // Yaşam döngüsü temizliği: SPA, React, Vue unmount durumlarında tüm dinleyicileri ve sesi temizler
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
    if (this.onResizeBound) {
      window.removeEventListener('resize', this.onResizeBound);
    }
    if (this.onPointerMoveBound) {
      window.removeEventListener('pointermove', this.onPointerMoveBound);
    }
    if (this.onPointerUpBound) {
      window.removeEventListener('pointerup', this.onPointerUpBound);
    }
    if (this.onPointerCancelBound) {
      window.removeEventListener('pointercancel', this.onPointerCancelBound);
    }
    if (this.container && this.onKeyDownBound) {
      this.container.removeEventListener('keydown', this.onKeyDownBound);
    }
    if (this.audio && typeof this.audio.close === 'function') {
      this.audio.close();
    }
    this.emit('destroy');
    this.eventListeners = {};
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isDestroyed = true;
  }

  // Olay Dinleme ve Yayınlama (Event Emitter API)
  on(event, callback) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.eventListeners || !this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    const handlerName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
    if (this.options && typeof this.options[handlerName] === 'function') {
      try {
        this.options[handlerName](data);
      } catch (err) {
        console.error(`[ActivityEngine] Options callback error in ${event}:`, err);
      }
    }
    if (this.eventListeners && this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[ActivityEngine] Event listener error in ${event}:`, err);
        }
      });
    }
  }

  // Anlık etkinlik durumunu döner
  getState() {
    const accuracy = this.totalDraggables > 0
      ? Math.round((this.correctCount / this.totalDraggables) * 100)
      : 0;
    return {
      isCompleted: this.isCompleted,
      score: accuracy,
      attempts: this.attempts,
      correctCount: this.correctCount,
      totalDraggables: this.totalDraggables,
      placedMap: Object.assign({}, this.placedMap)
    };
  }

  setState(value) {
    if (!value || typeof value !== 'object' || !value.placedMap || typeof value.placedMap !== 'object') {
      throw new TypeError('Geçersiz DND oynatıcı durumu.');
    }
    const objects = new Map((this.projectData.objects || []).map(object => [object.id, object]));
    const nextPlaced = {};
    for (const [dragId, targetId] of Object.entries(value.placedMap)) {
      const drag = objects.get(dragId);
      const target = objects.get(targetId);
      if (drag?.role !== 'draggable' || !['target', 'category', 'sequence_slot'].includes(target?.role)) {
        throw new TypeError('Oynatıcı durumu bilinmeyen bir nesne içeriyor.');
      }
      nextPlaced[dragId] = targetId;
    }
    this.prepareItems();
    this.placedMap = nextPlaced;
    this.attempts = Number.isSafeInteger(value.attempts) && value.attempts >= 0 ? value.attempts : 0;
    this.correctCount = 0;
    for (const [dragId, targetId] of Object.entries(nextPlaced)) {
      const target = objects.get(targetId);
      this.snapToTarget(dragId, target);
      const isCorrect = this.projectData.answerKey?.[dragId] === targetId;
      const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);
      if (isCorrect) {
        this.correctCount++;
        dragEl?.classList.add('is-correct');
        if (this.projectData.settings?.correctAnswerBehavior === 'lock') {
          dragEl?.classList.add('is-locked');
          dragEl?.setAttribute('tabindex', '-1');
        }
      }
    }
    this.isCompleted = this.totalDraggables > 0 && this.correctCount === this.totalDraggables && value.isCompleted === true;
    this.updateStats();
    return this.getState();
  }

  renderGameLayout() {
    this.container.innerHTML = `
      <div class="player-wrapper">
        ${this.options.isEmbedded ? `
          <header class="player-header player-header-minimal">
            <button class="player-btn exit-btn" id="btn-exit-preview" title="Önizlemeden Çık ve Editöre Dön">
              ✕ Editöre Dön
            </button>
          </header>
        ` : ''}

        <main class="player-viewport" id="player-viewport">
          <div class="player-stage-container" id="player-stage-container">
            <div class="player-stage-board" id="player-stage-board">
              <div class="player-stage-scaler" id="player-stage-scaler">
                <div class="player-stage" id="player-stage">
                  <div class="player-targets-layer" id="player-targets"></div>
                  <div class="player-draggables-layer" id="player-draggables"></div>
                </div>
              </div>

              <!-- Kontrol Alanı (Açık Zemin, Hiyerarşik Butonlar) -->
              <div class="player-controls" id="player-controls">
                <div class="player-mode-switch" role="group" aria-label="Etkinlik Modu">
                  <button type="button" class="mode-btn ${this.playMode === 'learning' ? 'active' : ''}" id="btn-mode-learning" data-mode="learning" title="Öğrenme Modu (Anlık Geri Bildirim)">
                    Öğrenme
                  </button>
                  <button type="button" class="mode-btn ${this.playMode === 'assessment' ? 'active' : ''}" id="btn-mode-assessment" data-mode="assessment" title="Değerlendirme Modu (Toplu Kontrol)">
                    Değerlendirme
                  </button>
                </div>

                <div class="player-actions">
                  <button class="player-btn reset-btn secondary-btn" id="btn-reset-game" title="Yeniden Başlat">
                    <span class="btn-icon">↺</span> Sıfırla
                  </button>
                  <button class="player-btn primary-btn check-answers-btn" id="btn-check-answers" title="Cevapları Kontrol Et" style="${this.playMode === 'learning' ? 'display: none;' : 'display: inline-flex;'}">
                    ✓ Kontrol Et
                  </button>
                </div>
              </div>
            </div>

            <!-- Alt Yardımcı İpucu Metni (Ayrı koyu şerit değil, sade yardımcı metin) -->
            <footer class="player-footer" id="player-footer">
              <div class="player-hint" id="player-hint">
                💡 Öğeleri sürükleyerek doğru hedeflerle eşleştirin.
              </div>
            </footer>
          </div>
        </main>

        <!-- Başarı / Kutlama Modalı -->
        <div class="player-modal-backdrop" id="completion-modal" style="display: none;">
          <div class="player-modal-card">
            <div class="modal-confetti" id="modal-confetti"></div>
            <div class="modal-star-banner">🎉 ⭐ 🏆 ⭐ 🎉</div>
            <h2 class="modal-title">Harika İş!</h2>
            <p class="modal-desc" id="modal-completion-msg">
              ${window.DND.ValidationEngine.sanitizeText(this.projectData.settings?.completionMessage || 'Etkinliği başarıyla tamamladınız!')}
            </p>
            <div class="modal-score-summary">
              <div class="summary-box">
                <span class="summary-num" id="modal-final-score">100%</span>
                <span class="summary-lbl">Başarı Oranı</span>
              </div>
              <div class="summary-box">
                <span class="summary-num" id="modal-final-attempts">0</span>
                <span class="summary-lbl">Toplam Deneme</span>
              </div>
            </div>
            <button class="player-btn modal-btn" id="btn-play-again">
              🔄 Tekrar Oyna
            </button>
          </div>
        </div>
      </div>
    `;

    // Buton dinleyicileri
    const modeLearningBtn = this.container.querySelector('#btn-mode-learning');
    if (modeLearningBtn) {
      modeLearningBtn.onclick = () => this.setPlayMode('learning');
    }

    const modeAssessmentBtn = this.container.querySelector('#btn-mode-assessment');
    if (modeAssessmentBtn) {
      modeAssessmentBtn.onclick = () => this.setPlayMode('assessment');
    }

    const resetBtn = this.container.querySelector('#btn-reset-game');
    if (resetBtn) resetBtn.onclick = () => this.resetGame();

    const exitBtn = this.container.querySelector('#btn-exit-preview');
    if (exitBtn) {
      exitBtn.onclick = () => {
        if (typeof this.options.onExit === 'function') this.options.onExit();
      };
    }

    const checkBtn = this.container.querySelector('#btn-check-answers');
    if (checkBtn) {
      checkBtn.onclick = () => {
        if (this.isRetryMode) {
          this.retryWrongAnswers();
        } else {
          this.checkAllAnswers();
        }
      };
    }

    const playAgainBtn = this.container.querySelector('#btn-play-again');
    if (playAgainBtn) playAgainBtn.onclick = () => this.resetGame();
  }

  getActivityTypeLabel() {
    const type = this.projectData.project.activityType;
    if (type === 'image-labeling') return 'Görsel Etiketleme';
    if (type === 'matching') return 'Eşleştirme';
    if (type === 'categorization') return 'Kategorilere Ayırma';
    if (type === 'sequencing') return 'Sıralama';
    return 'Etkinlik';
  }

  getPlayMode() {
    return this.playMode;
  }

  setPlayMode(mode) {
    if (mode !== 'learning' && mode !== 'assessment') return;
    if (this.playMode === mode) return;
    this.playMode = mode;
    this.resetGame();
    this.updateModeUI();
    this.emit('playModeChange', { mode: this.playMode });
  }

  addStatusBadge(dragEl, type) {
    if (!dragEl) return;
    this.removeStatusBadge(dragEl);
    const badge = document.createElement('span');
    badge.className = `player-status-badge badge-${type}`;
    badge.textContent = type === 'correct' ? '✓' : '✕';
    dragEl.appendChild(badge);
  }

  removeStatusBadge(dragEl) {
    if (!dragEl) return;
    const badge = dragEl.querySelector('.player-status-badge');
    if (badge) badge.remove();
  }

  updateModeUI() {
    const learnBtn = this.container.querySelector('#btn-mode-learning');
    const assessBtn = this.container.querySelector('#btn-mode-assessment');
    const checkBtn = this.container.querySelector('#btn-check-answers');

    if (learnBtn) learnBtn.classList.toggle('active', this.playMode === 'learning');
    if (assessBtn) assessBtn.classList.toggle('active', this.playMode === 'assessment');

    if (checkBtn) {
      if (this.playMode === 'learning') {
        checkBtn.style.display = 'none';
      } else {
        checkBtn.style.display = 'inline-flex';
        this.setCheckButtonState('check');
      }
    }
  }

  setCheckButtonState(state) {
    const checkBtn = this.container.querySelector('#btn-check-answers');
    if (!checkBtn) return;

    if (state === 'retry') {
      this.isRetryMode = true;
      checkBtn.textContent = '🔄 Tekrar Dene';
      checkBtn.title = 'Yanlış seçenekleri geri gönderip tekrar deneyin';
      checkBtn.className = 'player-btn retry-btn';
    } else {
      this.isRetryMode = false;
      checkBtn.textContent = '✓ Kontrol Et';
      checkBtn.title = 'Cevapları Kontrol Et';
      checkBtn.className = 'player-btn primary-btn check-answers-btn';
    }
  }

  setupResizeHandler() {
    this.stageEl = this.container.querySelector('#player-stage');
    this.stageScalerEl = this.container.querySelector('#player-stage-scaler');
    this.stageBoardEl = this.container.querySelector('#player-stage-board');
    this.viewportEl = this.container.querySelector('#player-viewport');
    this.stageContainerEl = this.container.querySelector('#player-stage-container') || this.viewportEl;

    this.onResizeBound = () => this.updateScale();
    window.addEventListener('resize', this.onResizeBound);

    if (typeof window !== 'undefined' && window.ResizeObserver && this.stageContainerEl) {
      this.resizeObserver = new window.ResizeObserver(() => {
        this.updateScale();
      });
      this.resizeObserver.observe(this.stageContainerEl);
    }

    this.updateScale();
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.updateScale());
    }
    setTimeout(() => this.updateScale(), 30);
  }

  updateScale() {
    if (!this.stageEl || !this.viewportEl) return;

    const stageW = (this.projectData.stage && this.projectData.stage.width) || 1200;
    const stageH = (this.projectData.stage && this.projectData.stage.height) || 675;

    this.stageEl.style.width = `${stageW}px`;
    this.stageEl.style.height = `${stageH}px`;

    // Arka plan stilleri
    this.stageEl.style.backgroundColor = (this.projectData.stage && this.projectData.stage.backgroundColor) || '#ffffff';
    if (this.projectData.stage && this.projectData.stage.backgroundImage) {
      this.stageEl.style.backgroundImage = `url("${this.projectData.stage.backgroundImage}")`;
      this.stageEl.style.backgroundSize = 'contain';
      this.stageEl.style.backgroundPosition = 'center';
      this.stageEl.style.backgroundRepeat = 'no-repeat';
    }

    const targetContainer = this.stageContainerEl || this.viewportEl;
    const vpRect = targetContainer.getBoundingClientRect();
    if (vpRect.width === 0 || vpRect.height === 0) {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.updateScale());
      }
      return;
    }

    const requestedPadding = this.options.stagePadding;
    const numericPadding = Number(requestedPadding);
    const pad = requestedPadding !== null
      && requestedPadding !== undefined
      && Number.isFinite(numericPadding)
      && numericPadding >= 0
      ? numericPadding
      : (vpRect.width < 600 ? 16 : 32);
    // player-controls (~48px) + player-footer (~36px) = ~84px dikey alan payı
    const extraH = 88;
    const availW = Math.max(vpRect.width - pad, 60);
    const availH = Math.max(vpRect.height - pad - extraH, 60);

    this.currentScale = Math.min(availW / stageW, availH / stageH);
    const scaledW = Math.round(stageW * this.currentScale);
    const scaledH = Math.round(stageH * this.currentScale);

    if (this.stageScalerEl) {
      this.stageScalerEl.style.width = `${scaledW}px`;
      this.stageScalerEl.style.height = `${scaledH}px`;
    }

    if (this.stageBoardEl) {
      this.stageBoardEl.style.width = `${scaledW}px`;
    }

    this.stageEl.style.transform = `scale(${this.currentScale})`;
    this.stageEl.style.transformOrigin = 'top left';
  }

  clientToStage(clientX, clientY) {
    const rect = this.stageEl.getBoundingClientRect();
    const stageW = this.projectData.stage.width || 1200;
    const scale = rect.width / stageW;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  prepareItems() {
    const targetsLayer = this.container.querySelector('#player-targets');
    const draggablesLayer = this.container.querySelector('#player-draggables');
    targetsLayer.innerHTML = '';
    draggablesLayer.innerHTML = '';

    const objects = this.projectData.objects || [];
    const draggables = objects.filter(o => o.role === 'draggable');
    const nonDraggables = objects.filter(o => o.role !== 'draggable');

    this.totalDraggables = draggables.length;
    const statTotal = this.container.querySelector('#stat-total');
    if (statTotal) statTotal.textContent = this.totalDraggables;
    const statCorrect = this.container.querySelector('#stat-correct');
    if (statCorrect) statCorrect.textContent = '0';
    const statAttempts = this.container.querySelector('#stat-attempts');
    if (statAttempts) statAttempts.textContent = '0';

    // Sabit, hedef ve dekoratif nesneleri çiz
    nonDraggables.forEach(obj => {
      const el = this.createDOMObject(obj, false);
      targetsLayer.appendChild(el);
    });

    // Eğer ayarlarda karıştırma aktifse sürüklenebilir nesnelerin konumlarını karıştır
    let renderDraggables = [...draggables];
    if (this.projectData.settings?.shuffleDraggables) {
      const positions = draggables.map(d => ({ x: d.x, y: d.y }));
      // Fisher-Yates karıştırma
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      renderDraggables.forEach((d, idx) => {
        d.currentX = positions[idx].x;
        d.currentY = positions[idx].y;
      });
    } else {
      renderDraggables.forEach(d => {
        d.currentX = d.x;
        d.currentY = d.y;
      });
    }

    // Başlangıç konumlarını karıştırma sonrası ekrandaki gerçek yerleriyle kaydet
    renderDraggables.forEach(d => {
      this.originPositions[d.id] = { x: d.currentX, y: d.currentY };
    });

    // Sürüklenebilir nesneleri çiz
    renderDraggables.forEach(obj => {
      const el = this.createDOMObject(obj, true);
      draggablesLayer.appendChild(el);
    });

    // Değerlendirme modu UI ayarı
    this.updateModeUI();
  }

  createDOMObject(obj, isDraggable = false) {
    const el = document.createElement('div');
    el.className = `player-object ${isDraggable ? 'is-draggable' : 'is-target'}`;
    el.setAttribute('data-id', obj.id);
    el.setAttribute('data-role', obj.role);
    el.setAttribute('tabindex', isDraggable ? '0' : '-1');

    const posX = isDraggable && obj.currentX !== undefined ? obj.currentX : obj.x;
    const posY = isDraggable && obj.currentY !== undefined ? obj.currentY : obj.y;

    el.style.width = `${obj.width}px`;
    el.style.height = `${obj.height}px`;
    el.style.transform = `translate(${posX}px, ${posY}px) rotate(${obj.rotation || 0}deg)`;
    el.style.zIndex = isDraggable ? (obj.zIndex || 10) + 10 : (obj.zIndex || 1);

    // Stiller
    el.style.backgroundColor = obj.backgroundColor || 'transparent';
    el.style.borderColor = obj.borderColor || 'transparent';
    el.style.borderWidth = `${obj.borderWidth || 0}px`;
    el.style.borderStyle = obj.borderStyle || 'solid';
    el.style.borderRadius = `${obj.borderRadius || 0}px`;
    el.style.boxShadow = obj.boxShadow || 'none';

    // İçerik
    const content = document.createElement('div');
    content.className = 'player-object-content';
    content.style.fontFamily = obj.fontFamily || 'sans-serif';
    content.style.fontSize = `${obj.fontSize || 16}px`;
    content.style.fontWeight = obj.fontWeight || 'normal';
    content.style.color = obj.textColor || '#1e293b';
    content.style.padding = `${obj.padding !== undefined ? obj.padding : 8}px`;

    // Dikey hizalama (Top / Middle / Bottom)
    if (obj.verticalAlign === 'top') {
      content.style.justifyContent = 'flex-start';
    } else if (obj.verticalAlign === 'bottom') {
      content.style.justifyContent = 'flex-end';
    } else {
      content.style.justifyContent = 'center';
    }

    // Yatay hizalama (Left / Center / Right)
    const textAlign = obj.textAlign || 'center';
    content.style.textAlign = textAlign;
    if (textAlign === 'left') {
      content.style.alignItems = 'flex-start';
    } else if (textAlign === 'right') {
      content.style.alignItems = 'flex-end';
    } else {
      content.style.alignItems = 'center';
    }

    if (obj.type === 'line') {
      el.style.backgroundColor = 'transparent';
      el.style.borderColor = 'transparent';
      el.style.borderWidth = '0px';
      el.style.boxShadow = 'none';
      content.style.padding = '0px';
      content.innerHTML = this.renderLineSVG(obj);
    } else if (obj.type === 'image' && obj.src) {
      const img = document.createElement('img');
      img.src = obj.src;
      img.draggable = false;
      content.appendChild(img);
      if (obj.text) {
        const cap = document.createElement('div');
        cap.className = 'image-caption';
        cap.style.width = '100%';
        cap.style.textAlign = textAlign;
        cap.textContent = obj.text;
        content.appendChild(cap);
      }
    } else if (obj.role === 'category') {
      const header = document.createElement('div');
      header.className = 'cat-title';
      header.style.width = '100%';
      header.style.textAlign = textAlign;
      header.textContent = obj.text || obj.name;
      content.appendChild(header);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'category-slots-container';
      itemsContainer.setAttribute('data-category-id', obj.id);
      content.appendChild(itemsContainer);
    } else if (obj.role === 'sequence_slot') {
      const slotNum = document.createElement('div');
      slotNum.className = 'slot-badge';
      slotNum.textContent = (obj.slotIndex !== undefined ? obj.slotIndex + 1 : 1);
      content.appendChild(slotNum);
      if (obj.text) {
        const slotText = document.createElement('div');
        slotText.className = 'slot-text';
        slotText.style.width = '100%';
        slotText.style.textAlign = textAlign;
        slotText.textContent = obj.text;
        content.appendChild(slotText);
      }
    } else {
      if (obj.text) {
        const textSpan = document.createElement('span');
        textSpan.className = 'player-text-span';
        textSpan.style.width = '100%';
        textSpan.style.display = 'block';
        textSpan.style.textAlign = textAlign;
        textSpan.textContent = obj.text;
        content.appendChild(textSpan);
      }
    }

    el.appendChild(content);

    // Durum ikonu göstergesi (doğru / yanlış işareti)
    const statusBadge = document.createElement('div');
    statusBadge.className = 'status-badge';
    el.appendChild(statusBadge);

    return el;
  }

  // Pointer Events API ile Sürükle Bırak
  setupPointerEvents() {
    const draggablesLayer = this.container.querySelector('#player-draggables');

    draggablesLayer.addEventListener('pointerdown', (e) => {
      const itemEl = e.target.closest('.player-object.is-draggable');
      if (!itemEl || itemEl.classList.contains('is-locked')) return;

      e.preventDefault();
      e.stopPropagation();

      const id = itemEl.getAttribute('data-id');
      this.activeDragId = id;
      this.activePointerId = e.pointerId;

      const stagePos = this.clientToStage(e.clientX, e.clientY);
      this.dragStartPos = stagePos;

      // Nesnenin mevcut transform koordinatlarını al
      const styleTransform = itemEl.style.transform;
      const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(styleTransform);
      const currX = match ? parseFloat(match[1]) : 0;
      const currY = match ? parseFloat(match[2]) : 0;

      this.dragElemStart = { x: currX, y: currY };

      itemEl.classList.add('is-dragging');
      itemEl.style.zIndex = '9999';

      try {
        itemEl.setPointerCapture(e.pointerId);
      } catch (err) {}

      this.audio.playPickup();
    });

    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('pointercancel', this.onPointerCancelBound);
  }

  handlePointerMove(e) {
    if (!this.activeDragId || this.activePointerId !== e.pointerId) return;

    const itemEl = this.container.querySelector(`[data-id="${this.activeDragId}"]`);
    if (!itemEl) return;

    const currentStagePos = this.clientToStage(e.clientX, e.clientY);
    const dx = currentStagePos.x - this.dragStartPos.x;
    const dy = currentStagePos.y - this.dragStartPos.y;

    const objData = this.getObj(this.activeDragId);
    const stageW = (this.projectData.stage && this.projectData.stage.width) || 1200;
    const stageH = (this.projectData.stage && this.projectData.stage.height) || 675;
    const objW = (objData && objData.width) || 60;
    const objH = (objData && objData.height) || 40;

    const nextX = Math.round(Math.max(0, Math.min(stageW - objW, this.dragElemStart.x + dx)));
    const nextY = Math.round(Math.max(0, Math.min(stageH - objH, this.dragElemStart.y + dy)));

    itemEl.style.transform = `translate(${nextX}px, ${nextY}px) scale(1.05)`;

    // Hedef algılama ve vurgulama (Hover highlight)
    const dropTarget = this.findDropTarget(nextX, nextY, (objData && objData.width) || 60, (objData && objData.height) || 40);
    this.highlightHoverTarget(dropTarget ? dropTarget.id : null);
  }

  handlePointerUp(e) {
    if (!this.activeDragId || this.activePointerId !== e.pointerId) return;
    this.finalizeDrop();
  }

  handlePointerCancel(e) {
    if (!this.activeDragId || this.activePointerId !== e.pointerId) return;
    this.finalizeDrop();
  }

  // Klavye Erişilebilirliği (Space/Enter ile seç, hedefte bırak)
  setupKeyboardEvents() {
    this.container.addEventListener('keydown', this.onKeyDownBound);
  }

  handleKeyDown(e) {
    const activeEl = document.activeElement;
    if (!activeEl) return;

      if (e.key === ' ' || e.key === 'Enter') {
        if (activeEl.classList.contains('is-draggable') && !activeEl.classList.contains('is-locked')) {
          e.preventDefault();
          const id = activeEl.getAttribute('data-id');
          if (this.keyboardSelectedId === id) {
            // Seçimi bırak
            this.keyboardSelectedId = null;
            activeEl.classList.remove('keyboard-active');
          } else {
            // Nesneyi eline al
            if (this.keyboardSelectedId) {
              const prev = this.container.querySelector(`[data-id="${this.keyboardSelectedId}"]`);
              if (prev) prev.classList.remove('keyboard-active');
            }
            this.keyboardSelectedId = id;
            activeEl.classList.add('keyboard-active');
            this.audio.playPickup();
            this.showHint('Öğeyi seçtiniz. Şimdi Tab tuşu ile hedef alana gidip Boşluk tuşuna basarak bırakın.');
          }
        } else if (activeEl.classList.contains('is-target') && this.keyboardSelectedId) {
          e.preventDefault();
          const targetId = activeEl.getAttribute('data-id');
          this.executeDrop(this.keyboardSelectedId, targetId);
          const itemEl = this.container.querySelector(`[data-id="${this.keyboardSelectedId}"]`);
          if (itemEl) itemEl.classList.remove('keyboard-active');
          this.keyboardSelectedId = null;
        }
      }
    }

  finalizeDrop() {
    const itemEl = this.container.querySelector(`[data-id="${this.activeDragId}"]`);
    if (!itemEl) return;

    itemEl.classList.remove('is-dragging');
    itemEl.style.zIndex = '100';

    try {
      if (this.activePointerId !== null && itemEl.hasPointerCapture && itemEl.hasPointerCapture(this.activePointerId)) {
        itemEl.releasePointerCapture(this.activePointerId);
      }
    } catch (err) {}

    const styleTransform = itemEl.style.transform;
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(styleTransform);
    const currX = match ? parseFloat(match[1]) : 0;
    const currY = match ? parseFloat(match[2]) : 0;

    const objData = this.getObj(this.activeDragId);
    const dropTarget = this.findDropTarget(currX, currY, (objData && objData.width) || 60, (objData && objData.height) || 40);

    this.highlightHoverTarget(null);

    const dragId = this.activeDragId;
    this.activeDragId = null;
    this.activePointerId = null;

    if (dropTarget) {
      this.executeDrop(dragId, dropTarget.id);
    } else {
      // Hedef dışına bırakıldıysa başlangıç konumuna dön
      this.returnToOrigin(dragId);
      this.audio.playDrop();
    }
  }

  // Bırakılan hedefin tespiti (AABB ve Merkez noktası çakışması)
  findDropTarget(itemX, itemY, itemW, itemH) {
    const itemMidX = itemX + itemW / 2;
    const itemMidY = itemY + itemH / 2;

    const targets = (this.projectData.objects || []).filter(o =>
      ['target', 'category', 'sequence_slot'].includes(o.role) && !this.lockedTargetIds.has(o.id)
    );

    // Öncelik: Merkez noktasını içinde barındıran hedef
    for (const t of targets) {
      if (itemMidX >= t.x && itemMidX <= t.x + t.width &&
          itemMidY >= t.y && itemMidY <= t.y + t.height) {
        return t;
      }
    }

    // İkinci öncelik: En az %40 kesişim olan hedef
    for (const t of targets) {
      const interLeft = Math.max(itemX, t.x);
      const interTop = Math.max(itemY, t.y);
      const interRight = Math.min(itemX + itemW, t.x + t.width);
      const interBottom = Math.min(itemY + itemH, t.y + t.height);

      if (interRight > interLeft && interBottom > interTop) {
        const interArea = (interRight - interLeft) * (interBottom - interTop);
        const itemArea = itemW * itemH;
        if (interArea / itemArea > 0.35) {
          return t;
        }
      }
    }

    return null;
  }

  highlightHoverTarget(targetId) {
    this.container.querySelectorAll('.player-object.is-target').forEach(el => {
      const id = el.getAttribute('data-id');
      if (targetId && id === targetId && !this.lockedTargetIds.has(id)) {
        el.classList.add('hover-active');
      } else {
        el.classList.remove('hover-active');
      }
    });
  }

  getObj(id) {
    return (this.projectData.objects || []).find(o => o.id === id);
  }

  // Bir nesnenin bir hedefe bırakılma işlemi
  executeDrop(dragId, targetId) {
    const targetObj = this.getObj(targetId);
    const dragObj = this.getObj(dragId);
    if (!targetObj || !dragObj) return;

    // Doğru eşleşmiş kilitli hedeflere nesne bırakılamaz
    if (this.lockedTargetIds.has(targetId)) return;

    if (this.playMode === 'learning') {
      this.attempts++;
      this.updateStats();
      this.evaluateSingleDrop(dragId, targetId);
    } else {
      // Değerlendirme Modu: Kullanıcı tüm nesneleri sürükleyecek, sürüklediği yere yerleşecek.
      // Eğer hedef kategori değilse ve üzerinde henüz doğrulanmamış başka bir öğe varsa, eski öğeyi başlangıç yerine gönder
      if (targetObj.role !== 'category') {
        const prevDragId = Object.keys(this.placedMap).find(id => this.placedMap[id] === targetId && id !== dragId);
        if (prevDragId) {
          this.returnToOrigin(prevDragId);
        }
      }

      this.attempts++;
      this.updateStats();
      this.snapToTarget(dragId, targetObj);
      this.placedMap[dragId] = targetId;
      this.audio.playDrop();
      this.emit('drop', { dragId, targetId, isPending: true });
      this.emit('step', this.getState());
    }
  }

  evaluateSingleDrop(dragId, targetId) {
    const correctTargetId = this.projectData.answerKey ? this.projectData.answerKey[dragId] : null;
    const isCorrect = correctTargetId === targetId;

    const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);
    const targetObj = this.getObj(targetId);
    const targetEl = this.container.querySelector(`[data-id="${targetId}"]`);

    if (isCorrect) {
      // DOĞRU CEVAP
      this.audio.playCorrect();
      this.placedMap[dragId] = targetId;
      this.correctCount++;
      this.updateStats();
      this.setFeedback('Harika! Doğru eşleştirme.', 'success', 2500);

      this.snapToTarget(dragId, targetObj);

      if (dragEl) {
        dragEl.classList.remove('is-incorrect');
        dragEl.classList.add('is-correct');

        if (this.projectData.settings?.correctAnswerBehavior === 'lock') {
          dragEl.classList.add('is-locked');
          dragEl.setAttribute('tabindex', '-1');
        }
        this.addStatusBadge(dragEl, 'correct');
      }

      if (targetObj && targetObj.role !== 'category') {
        this.lockedTargetIds.add(targetId);
        if (targetEl) targetEl.classList.add('is-target-locked');
      }

      this.emit('drop', { dragId, targetId, isCorrect: true });
      this.emit('step', this.getState());
      this.checkCompletion();
    } else {
      // YANLIŞ CEVAP
      this.audio.playWrong();
      this.setFeedback('Tekrar deneyin! Yanlış eşleştirme.', 'error', 2500);

      if (dragEl) {
        dragEl.classList.add('is-incorrect');
        this.addStatusBadge(dragEl, 'incorrect');
        setTimeout(() => {
          if (dragEl) {
            dragEl.classList.remove('is-incorrect');
            this.removeStatusBadge(dragEl);
          }
        }, 600);
      }

      const wrongBehavior = (this.projectData.settings && this.projectData.settings.wrongAnswerBehavior) || 'return';
      if (wrongBehavior === 'return') {
        this.returnToOrigin(dragId);
      } else {
        this.snapToTarget(dragId, targetObj);
        this.placedMap[dragId] = targetId;
      }

      this.emit('drop', { dragId, targetId, isCorrect: false });
      this.emit('step', this.getState());
    }
  }

  // Hedefe Hizalama / Yerleştirme
  snapToTarget(dragId, targetObj) {
    const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);
    const dragObj = this.getObj(dragId);
    if (!dragEl || !dragObj) return;

    let targetX = targetObj.x;
    let targetY = targetObj.y;

    if (targetObj.role === 'category') {
      // Kategori içine yerleştirme: kategori içindeki mevcut öğe sayısına göre gridleme
      const existingItems = Object.keys(this.placedMap).filter(id => this.placedMap[id] === targetObj.id && id !== dragId);
      const slotIndex = existingItems.length;

      const col = slotIndex % 2;
      const row = Math.floor(slotIndex / 2);

      targetX = targetObj.x + 20 + col * (dragObj.width + 10);
      targetY = targetObj.y + 60 + row * (dragObj.height + 10);
    } else if (targetObj.role === 'sequence_slot' || targetObj.role === 'target') {
      // Merkeze hizalama
      targetX = targetObj.x + (targetObj.width - dragObj.width) / 2;
      targetY = targetObj.y + (targetObj.height - dragObj.height) / 2;
    }

    dragEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    dragEl.style.transform = `translate(${Math.round(targetX)}px, ${Math.round(targetY)}px) rotate(0deg)`;

    setTimeout(() => {
      if (dragEl) dragEl.style.transition = '';
    }, 260);
  }

  returnToOrigin(dragId) {
    const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);
    const origin = this.originPositions[dragId];
    if (!dragEl || !origin) return;

    delete this.placedMap[dragId];
    this.removeStatusBadge(dragEl);
    if (dragEl) dragEl.classList.remove('is-incorrect');

    if (dragEl.classList.contains('is-correct')) {
      dragEl.classList.remove('is-correct');
      dragEl.classList.remove('is-locked');
      dragEl.setAttribute('tabindex', '0');
      this.correctCount = Math.max(0, this.correctCount - 1);
      this.updateStats();
    }

    const origObj = this.getObj(dragId);
    const rot = (origObj && origObj.rotation) ? origObj.rotation : 0;

    dragEl.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
    dragEl.style.transform = `translate(${origin.x}px, ${origin.y}px) rotate(${rot}deg) scale(1)`;

    setTimeout(() => {
      if (dragEl) {
        dragEl.style.transition = '';
        dragEl.style.zIndex = origObj && origObj.zIndex ? `${origObj.zIndex + 10}` : '20';
      }
    }, 360);
  }

  // Toplu Değerlendirme (Değerlendirme Modunda Kontrol Et butonu ile)
  checkAllAnswers() {
    const answerKey = this.projectData.answerKey || {};
    let correct = 0;
    this.attempts++;

    const placedCount = Object.keys(this.placedMap).length;
    if (placedCount === 0) {
      this.setFeedback('Henüz bir nesne yerleştirmediniz. Sürükleyip bırakın.', 'warning', 3000);
      return;
    }

    let hasWrong = false;
    for (const [dragId, targetId] of Object.entries(this.placedMap)) {
      const isRight = answerKey[dragId] === targetId;
      const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);
      const targetObj = this.getObj(targetId);
      const targetEl = this.container.querySelector(`[data-id="${targetId}"]`);

      if (isRight) {
        correct++;
        if (dragEl) {
          dragEl.classList.remove('is-incorrect');
          dragEl.classList.add('is-correct');
          dragEl.classList.add('is-locked');
          dragEl.setAttribute('tabindex', '-1');
          this.addStatusBadge(dragEl, 'correct');
        }
        if (targetObj && targetObj.role !== 'category') {
          this.lockedTargetIds.add(targetId);
          if (targetEl) targetEl.classList.add('is-target-locked');
        }
      } else {
        hasWrong = true;
        if (dragEl) {
          dragEl.classList.remove('is-correct');
          dragEl.classList.add('is-incorrect');
          this.addStatusBadge(dragEl, 'incorrect');
        }
      }
    }

    this.correctCount = correct;
    this.updateStats();

    if (correct === this.totalDraggables) {
      this.isCompleted = true;
      this.setFeedback('Tebrikler! Tüm eşleştirmeler doğru.', 'success');
      this.audio.playComplete();
      this.showCompletionModal();
    } else {
      this.audio.playWrong();
      this.setFeedback(`${correct} / ${this.totalDraggables} doğru. Yanlışları Tekrar Dene butonuyla düzeltebilirsiniz.`, 'warning', 4000);
      this.showHint('Bazı eşleştirmeler hatalı. "Tekrar Dene" butonuna basarak yanlışları eski yerine gönderebilirsiniz.');
      if (hasWrong) {
        this.setCheckButtonState('retry');
      }
    }
  }

  // Değerlendirme Modunda Yanlışları Eski Yerine Gönderip Tekrar Dene Döngüsü
  retryWrongAnswers() {
    const answerKey = this.projectData.answerKey || {};
    const wrongIds = [];

    for (const [dragId, targetId] of Object.entries(this.placedMap)) {
      if (answerKey[dragId] !== targetId) {
        wrongIds.push(dragId);
      }
    }

    wrongIds.forEach(dragId => {
      const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);
      if (dragEl) {
        dragEl.classList.remove('is-incorrect');
        this.removeStatusBadge(dragEl);
      }
      this.returnToOrigin(dragId);
    });

    this.setCheckButtonState('check');
    this.showHint('Kalan nesneleri boş hedeflere sürükleyip tekrar kontrol edin.');
  }

  checkCompletion() {
    if (this.correctCount >= this.totalDraggables && this.totalDraggables > 0) {
      if (!this.isCompleted) {
        this.isCompleted = true;
        this.setFeedback('Tebrikler! Etkinliği başarıyla tamamladınız.', 'success');
        this.audio.playComplete();
        setTimeout(() => this.showCompletionModal(), 400);
      }
    }
  }

  showCompletionModal() {
    const modal = this.container.querySelector('#completion-modal');
    if (!modal) return;

    const accuracy = Math.round((this.totalDraggables / Math.max(this.attempts, this.totalDraggables)) * 100);
    this.container.querySelector('#modal-final-score').textContent = `%${accuracy}`;
    this.container.querySelector('#modal-final-attempts').textContent = this.attempts;

    modal.style.display = 'flex';

    const payload = {
      score: accuracy,
      attempts: this.attempts,
      correctCount: this.correctCount
    };

    this.emit('complete', payload);
  }

  updateStats() {
    const statCorrect = this.container.querySelector('#stat-correct');
    const statAttempts = this.container.querySelector('#stat-attempts');
    if (statCorrect) statCorrect.textContent = this.correctCount;
    if (statAttempts) statAttempts.textContent = this.attempts;
  }

  showHint(msg) {
    const hintEl = this.container.querySelector('#player-hint');
    if (hintEl) {
      hintEl.textContent = `💡 ${msg}`;
    }
  }

  /**
   * Kontrol alanındaki geri bildirim mesajını günceller
   * @param {string} message - Gösterilecek mesaj metni
   * @param {'info'|'success'|'error'|'warning'} [type='info'] - Mesaj türü
   * @param {number} [duration=0] - Milisaniye cinsinden otomatik sıfırlanma süresi (0 ise kalıcı)
   */
  setFeedback(message, type = 'info', duration = 0) {
    const fbEl = this.container.querySelector('#player-feedback');
    const textEl = this.container.querySelector('#feedback-text');
    const iconEl = this.container.querySelector('#feedback-icon');
    if (!fbEl || !textEl) return;

    this.currentFeedback = { message, type };

    const icons = {
      info: '💬',
      success: '✓',
      error: '✕',
      warning: '⚠️'
    };

    fbEl.className = `player-feedback feedback-${type}`;
    textEl.textContent = message;
    if (iconEl) {
      iconEl.textContent = icons[type] || '💬';
    }

    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }

    if (duration > 0) {
      this.feedbackTimeout = setTimeout(() => {
        this.resetFeedback();
      }, duration);
    }
  }

  getFeedback() {
    return this.currentFeedback || { message: '', type: 'info' };
  }

  resetFeedback() {
    this.setFeedback('Öğeleri doğru hedeflere sürükleyin', 'info');
  }

  renderLineSVG(obj) {
    const w = Math.max(10, obj.width || 200);
    const h = Math.max(10, obj.height || 24);
    const cy = h / 2;
    const strokeColor = (obj.borderColor && obj.borderColor !== 'transparent') ? obj.borderColor : '#1e293b';
    const strokeWidth = (obj.borderWidth !== undefined && obj.borderWidth > 0) ? obj.borderWidth : 3;
    const strokeStyle = obj.borderStyle || 'solid';

    let dashArray = 'none';
    if (strokeStyle === 'dashed') dashArray = '8 6';
    else if (strokeStyle === 'dotted') dashArray = '2 6';

    const hasStartArrow = !!obj.arrowStart;
    const hasEndArrow = !!obj.arrowEnd;
    const arrowSize = Math.min(Math.max(8, strokeWidth * 3), w / 2.5);

    const x1 = hasStartArrow ? arrowSize - 1 : 0;
    const x2 = hasEndArrow ? w - (arrowSize - 1) : w;

    let svgHtml = `<svg class="object-line-bar" width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow: visible; display: block; pointer-events: none;">`;

    // Ana Çizgi
    svgHtml += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round" />`;

    // Başlangıç Oku
    if (hasStartArrow) {
      svgHtml += `<polygon points="${arrowSize},${cy - arrowSize * 0.6} 0,${cy} ${arrowSize},${cy + arrowSize * 0.6}" fill="${strokeColor}" />`;
    }

    // Bitiş Oku
    if (hasEndArrow) {
      svgHtml += `<polygon points="${w - arrowSize},${cy - arrowSize * 0.6} ${w},${cy} ${w - arrowSize},${cy + arrowSize * 0.6}" fill="${strokeColor}" />`;
    }

    svgHtml += `</svg>`;
    return svgHtml;
  }

  resetGame() {
    this.placedMap = {};
    this.score = 0;
    this.attempts = 0;
    this.correctCount = 0;
    this.isCompleted = false;
    this.lockedTargetIds.clear();

    this.container.querySelectorAll('.player-status-badge').forEach(el => el.remove());
    this.container.querySelectorAll('.is-target-locked').forEach(el => el.classList.remove('is-target-locked'));

    this.setCheckButtonState('check');
    this.updateStats();
    this.resetFeedback();

    const modal = this.container.querySelector('#completion-modal');
    if (modal) modal.style.display = 'none';

    this.prepareItems();
    this.emit('reset', this.getState());
  }
}

// Universal namespace export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ActivityEngine };
}
if (typeof window !== 'undefined') {
  window.DND = window.DND || {};
  window.DND.ActivityEngine = ActivityEngine;
}

/**
 * ExportManager - Etkinliği tek bir bağımsız, çevrimdışı çalışabilen
 * ve sıfır harici bağımlılığı olan HTML dosyası olarak dışa aktarır.
 */
class ExportManager {
  constructor(core) {
    this.core = core;
  }

  /**
   * Projeyi tek bir HTML dosyası olarak derler ve indirir
   */
  exportStandaloneHTML() {
    const projectData = this.core.getProjectData();

    // Doğrulama kontrolü
    const playability = window.DND.ValidationEngine.validatePlayability(projectData);
    if (!playability.ready) {
      const confirmContinue = confirm(
        'Dikkat: Etkinlikte bazı eksiklikler tespit edildi:\n\n• ' +
        playability.issues.join('\n• ') +
        '\n\nYine de dışa aktarmak istiyor musunuz?'
      );
      if (!confirmContinue) return false;
    }

    const htmlContent = this.generateStandaloneHTMLString(projectData);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const safeTitle = (projectData.project.name || 'etkinlik')
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_etkinlik.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  }

  generateStandaloneHTMLString(projectData) {
    const title = window.DND.ValidationEngine.sanitizeText(projectData.project.name || 'Sürükle Bırak Etkinliği');
    const projectJsonEscaped = JSON.stringify(projectData).replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <style>
    /* RESET & TEMEL STILLER */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }

    /* OYNATICI ÇERÇEVESİ */
    .player-wrapper {
      width: 100vw;
      height: 100vh;
      max-width: 100%;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .player-header {
      height: 60px;
      min-height: 52px;
      flex-shrink: 0;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 100;
    }

    .player-header.player-header-minimal {
      position: absolute;
      top: 14px;
      right: 18px;
      height: auto;
      min-height: unset;
      padding: 0;
      background: transparent;
      border-bottom: none;
      backdrop-filter: none;
      z-index: 500;
      pointer-events: auto;
    }

    .player-header.player-header-minimal .exit-btn {
      background: rgba(239, 68, 68, 0.18);
      border: 1px solid rgba(239, 68, 68, 0.45);
      color: #fca5a5;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      border-radius: 9999px;
      padding: 7px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .player-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }

    .player-badge {
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 3px 8px;
      border-radius: 9999px;
    }

    .player-stats {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .stat-pill .stat-value {
      color: #38bdf8;
    }

    .player-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .player-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      transform: translateY(-1px);
    }

    .player-btn:active {
      transform: translateY(0);
    }

    .primary-btn,
    .check-answers-btn {
      background: #0f172a;
      border: 1px solid #0f172a;
      color: #ffffff;
      border-radius: 9999px;
      padding: 8px 20px;
      font-size: 0.875rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.15s ease;
    }

    .primary-btn:hover,
    .check-answers-btn:hover {
      background: #1e293b;
      border-color: #1e293b;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }

    .player-btn.secondary-btn,
    .player-btn.reset-btn {
      background: transparent;
      border: none;
      color: #475569;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      box-shadow: none;
    }

    .player-btn.secondary-btn:hover,
    .player-btn.reset-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
      transform: none;
    }

    .player-btn.reset-btn .btn-icon {
      font-size: 1.05rem;
      line-height: 1;
    }

    .player-btn.retry-btn {
      background: #d97706;
      border: 1px solid #d97706;
      color: #ffffff;
      border-radius: 9999px;
      padding: 8px 20px;
      font-size: 0.875rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);
      transition: all 0.15s ease;
    }

    .player-btn.retry-btn:hover {
      background: #b45309;
      border-color: #b45309;
      transform: translateY(-1px);
    }

    /* OYUN ALANI VE SAHNE */
    .player-viewport,
    .player-stage-viewport {
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      touch-action: none;
    }

    .player-stage-container {
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      width: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }

    .player-stage-board {
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05);
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .player-stage-scaler {
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      border-radius: 16px 16px 0 0;
    }

    .player-stage {
      position: absolute;
      top: 0;
      left: 0;
      overflow: hidden;
      touch-action: none;
      transform-origin: top left;
      user-select: none;
      -webkit-user-select: none;
      flex-shrink: 0;
    }

    .player-targets-layer,
    .player-draggables-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .player-object {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      pointer-events: auto;
      user-select: none;
    }

    .player-object.is-draggable {
      cursor: grab;
      touch-action: none;
      transition: box-shadow 0.2s ease, filter 0.2s ease;
    }

    .player-object.is-draggable:hover {
      filter: brightness(1.05);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important;
    }

    .player-object.is-dragging {
      cursor: grabbing !important;
      opacity: 0.92;
      filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.35));
    }

    .player-object.is-locked {
      cursor: default !important;
      opacity: 0.95;
      pointer-events: none;
    }

    .player-object.is-correct {
      border-color: #10b981 !important;
      background-color: #ecfdf5 !important;
      color: #065f46 !important;
    }

    .player-object.is-incorrect {
      border-color: #ef4444 !important;
      background-color: #fef2f2 !important;
    }

    .player-object.is-incorrect .player-object-content {
      animation: shake 0.4s ease-in-out;
    }

    .player-object.hover-active {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.35) !important;
    }

    .player-object.keyboard-active {
      outline: 4px solid #f59e0b;
      outline-offset: 4px;
      animation: pulse 1s infinite alternate;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }

    @keyframes pulse {
      from { box-shadow: 0 0 0 2px #f59e0b; }
      to { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.4); }
    }

    /* DOĞRU / YANLIŞ İKON ROZETLERİ (✓ / ✕) */
    .player-status-badge {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      z-index: 100;
      animation: badgePop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    }

    .player-status-badge.badge-correct {
      background: #10b981;
      color: #ffffff;
      border: 2px solid #ffffff;
    }

    .player-status-badge.badge-incorrect {
      background: #ef4444;
      color: #ffffff;
      border: 2px solid #ffffff;
    }

    @keyframes badgePop {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .player-object.is-target.is-target-locked {
      pointer-events: none !important;
      opacity: 0.9;
      border-color: #10b981 !important;
    }

    .player-object-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      word-break: break-word;
      white-space: pre-wrap;
    }

    /* Çizgi Nesnesi Oynatıcı Stilleri */
    .player-object[data-type="line"] {
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    .player-line-bar {
      width: 100%;
      height: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .player-object-content span,
    .player-object-content .player-text-span {
      width: 100%;
      display: block;
      text-align: inherit;
      box-sizing: border-box;
    }

    .player-object-content img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
    }

    .image-caption {
      margin-top: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .cat-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 8px;
    }

    .slot-badge {
      font-size: 1.4rem;
      font-weight: 800;
      color: #6d28d9;
    }

    .slot-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
    }

    /* KONTROL ALANI (Açık Zemin, Hiyerarşik Butonlar) */
    .player-controls {
      flex-shrink: 0;
      min-height: 54px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      box-sizing: border-box;
      width: 100%;
    }

    .player-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }

    /* MOD DEĞİŞTİRİCİ (Segmented Switch) */
    .player-mode-switch {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }

    .player-mode-switch .mode-btn {
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      user-select: none;
    }

    .player-mode-switch .mode-btn:hover {
      color: #0f172a;
    }

    .player-mode-switch .mode-btn.active {
      background: #ffffff;
      color: #0f172a;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    /* YARDIMCI İPUCU METNİ (Koyu panel değil, sade yardımcı metin) */
    .player-footer {
      height: auto;
      min-height: 28px;
      flex-shrink: 0;
      padding: 8px 16px 2px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 0.82rem;
      box-sizing: border-box;
      width: 100%;
    }

    .player-hint {
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
      white-space: nowrap;
    }

    /* MODAL VE KUTLAMA */
    .player-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .player-modal-card {
      background: #ffffff;
      border-radius: 20px;
      padding: 36px 40px;
      text-align: center;
      max-width: 440px;
      width: 90%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
      animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: hidden;
    }

    @keyframes popIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-star-banner {
      font-size: 2.2rem;
      margin-bottom: 12px;
    }

    .modal-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .modal-desc {
      font-size: 1rem;
      color: #64748b;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .modal-score-summary {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 24px;
    }

    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .summary-num {
      font-size: 1.6rem;
      font-weight: 800;
      color: #4f46e5;
    }

    .summary-lbl {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .modal-btn {
      width: 100%;
      padding: 14px 24px;
      font-size: 1.05rem;
      font-weight: 700;
      border-radius: 12px;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-btn:hover {
      background: #4338ca;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);
    }
  </style>
</head>
<body>
  <div id="activity-app"></div>

  <!-- Gömülü Proje Verisi -->
  <script id="activity-data" type="application/json">
${projectJsonEscaped}
  <\/script>

  <script>
    ${this.getBundledRuntimeScript()}
  <\/script>
</body>
</html>`;
  }

  getBundledRuntimeScript() {
    // Sadece oynatıcı için gereken sınıflar: AudioSynthesizer, ValidationEngine (sanitizeText) ve ActivityEngine
    return `
// Namespace
window.DND = window.DND || {};

// 1. AudioSynthesizer
${AudioSynthesizer.toString()}
window.DND.AudioSynthesizer = AudioSynthesizer;

// 2. ValidationEngine (Sanitize)
window.DND.ValidationEngine = {
  sanitizeText: function(str) {
    if (str === null || str === undefined) return '';
    const temp = document.createElement('div');
    temp.textContent = String(str);
    return temp.innerHTML;
  }
};

// 3. ActivityEngine
${ActivityEngine.toString()}
window.DND.ActivityEngine = ActivityEngine;

// 4. Otomatik Başlatma
window.addEventListener('DOMContentLoaded', function() {
  try {
    const rawData = document.getElementById('activity-data').textContent;
    const project = JSON.parse(rawData);
    const container = document.getElementById('activity-app');
    window.gameInstance = new window.DND.ActivityEngine(container, project);
  } catch (err) {
    console.error('Etkinlik başlatma hatası:', err);
    document.body.innerHTML = '<div style="color:white;padding:40px;font-family:sans-serif;">Etkinlik yüklenirken bir hata oluştu: ' + err.message + '</div>';
  }
});
`;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.ExportManager = ExportManager;

/**
 * MiniToolbar - Seçili nesnenin hemen yanında beliren bağlamsal mini araç çubuğu.
 * Canva / Figma deneyiminde olduğu gibi; Sahne Rolü, Nesne Görünümü, Metin Biçimlendirme,
 * Kopyalama, Silme, Katman/Kilit ve Çoklu Hizalama işlemlerini nesne üzerinde yönetir.
 */
class MiniToolbar {
  constructor(core, objectManager, selectionManager, layerManager, stageManager, root = document, options = {}) {
    this.core = core;
    this.objectManager = objectManager;
    this.selectionManager = selectionManager;
    this.layerManager = layerManager;
    this.stageManager = stageManager;
    this.root = root;
    this.signal = options.signal;

    this.toolbarEl = null;
    this.activePopup = null; // 'role' | 'style' | 'text' | 'layers' | 'align' | null
    this.currentTargetProp = 'fill'; // 'fill' veya 'border' renk seçimi için
    this.showTextColorPalette = false; // Metin popup'ında tanımlı renkler paletinin açık olup olmadığı
    this.showStyleColorPalette = false; // Nesne görünümünde tanımlı renkler paletinin açık olup olmadığı
    this.isNewlyOpened = false;
    this.currentPlacementAbove = false;

    this.init();
  }

  init() {
    this.createDOM();
    this.bindEvents();

    // 1. Sahneye basıldığı anda mini toolbar hemen gizlenir (basıldığı an değil, bırakıldığı an görünür)
    this.core.on('stagePointerDown', () => {
      this.hide();
    });

    // 2. Bırakıldığı anda: Sürükleme yapılmamışsa ve seçili nesne varsa görünür olsun
    this.core.on('stagePointerUp', (data) => {
      const mode = this.core.getMode();
      if (mode !== 'design') {
        this.hide();
        return;
      }

      // Tutulduğu anla bırakıldığı an nesne sürükleme/taşıma yapılmışsa mini toolbar görünmesin
      // Ancak seçim alanı (selection area / marquee) bırakıldığında seçili nesneler için görünsün
      const isMarqueeSelection = data && (data.isMarquee || data.action === 'marquee');
      if (data && data.hasDragged && !isMarqueeSelection) {
        this.hide();
        return;
      }

      // Sürükleme yapılmamışsa (üzerine basılıp bırakıldığı anda) göster
      const selectedObjs = this.selectionManager.getSelectedObjects();
      if (selectedObjs.length > 0) {
        if (selectedObjs.length === 1 && selectedObjs[0].locked) {
          this.hide();
          return;
        }
        if (!window.app || !window.app.uiManager || !window.app.uiManager.isEditingText) {
          this.show();
        }
      } else {
        this.hide();
      }
    });

    // 3. Seçim değiştiğinde:
    this.core.on('selectionChanged', () => {
      const selectedObjs = this.selectionManager.getSelectedObjects();
      if (selectedObjs.length === 0 || (selectedObjs.length === 1 && selectedObjs[0].locked)) {
        this.hide();
        return;
      }
      // Toolbar zaten açıksa içeriğini ve konumunu güncelle
      if (this.isVisible()) {
        this.render();
        this.reposition();
      }
    });

    this.core.on('objectUpdated', (data) => {
      if (!this.isVisible()) return;
      // Sadece nesnenin konumu veya boyutu değiştiğinde mini araç çubuğunu yeniden konumlandır
      if (data && data.partialProps) {
        const p = data.partialProps;
        if (p.x !== undefined || p.y !== undefined || p.width !== undefined || p.height !== undefined) {
          this.reposition();
        }
      } else {
        this.reposition();
      }
    });

    this.core.on('stageScaleChanged', () => {
      if (this.isVisible()) {
        this.reposition();
      }
    });

    this.core.on('modeChanged', () => {
      if (this.core.getMode() !== 'design') {
        this.hide();
      }
    });

    // Tuvalde boşluğa tıklandığında popupları kapat
    window.addEventListener('pointerdown', (e) => {
      if (this.toolbarEl && !this.toolbarEl.contains(e.target) && !e.target.closest('.resize-handle, .rotate-handle')) {
        this.closePopup();
      }
    }, this.signal ? { signal: this.signal } : undefined);

    window.addEventListener('scroll', () => {
      if (this.isVisible()) this.reposition();
    }, this.signal ? { capture: true, signal: this.signal } : true);
    window.addEventListener('resize', () => {
      if (this.isVisible()) this.reposition();
    }, this.signal ? { signal: this.signal } : undefined);
  }

  createDOM() {
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.id = 'contextual-mini-toolbar';
    this.toolbarEl.className = 'mini-toolbar-container';
    this.toolbarEl.style.display = 'none';

    (this.root.body || this.root).appendChild(this.toolbarEl);
  }

  bindEvents() {
    // Toolbar içine basıldığında sahne olaylarının tetiklenmesini engelle
    this.toolbarEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });

    // Toolbar içindeki tıklamalar
    this.toolbarEl.addEventListener('click', (e) => {
      e.stopPropagation();

      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      this.handleAction(action, btn);
    });
  }

  handleAction(action, btn) {
    const selectedObjs = this.selectionManager.getSelectedObjects();
    const primary = this.selectionManager.getPrimarySelected();
    if (selectedObjs.length === 0) return;

    if (action === 'toggle-line-popup') {
      this.linePopupClosedByUser = (this.activePopup === 'line');
      this.togglePopup('line');
    } else if (action === 'toggle-role-popup') {
      this.togglePopup('role');
    } else if (action === 'toggle-style-popup') {
      this.togglePopup('style');
    } else if (action === 'toggle-text-popup') {
      this.togglePopup('text');
    } else if (action === 'toggle-layer-popup') {
      this.togglePopup('layers');
    } else if (action === 'toggle-align-popup') {
      this.togglePopup('align');
    } else if (action === 'toggle-style-palette') {
      this.showStyleColorPalette = !this.showStyleColorPalette;
      const paletteSec = this.toolbarEl.querySelector('.mt-style-popup .mt-style-palette-section');
      const previewBtn = this.toolbarEl.querySelector('.mt-style-popup [data-action="toggle-style-palette"]');
      if (paletteSec) {
        paletteSec.style.display = this.showStyleColorPalette ? 'flex' : 'none';
        if (this.showStyleColorPalette) {
          paletteSec.classList.add('is-opening');
        }
        if (previewBtn) previewBtn.classList.toggle('active', this.showStyleColorPalette);
        this.reposition();
      } else {
        this.render();
      }
    } else if (action === 'toggle-text-palette') {
      this.showTextColorPalette = !this.showTextColorPalette;
      const paletteSec = this.toolbarEl.querySelector('.mt-text-popup .mt-color-palette')?.parentElement;
      const previewBtn = this.toolbarEl.querySelector('.mt-color-preview-btn');
      if (paletteSec) {
        paletteSec.style.display = this.showTextColorPalette ? 'flex' : 'none';
        if (this.showTextColorPalette) {
          paletteSec.classList.add('is-opening');
        }
        if (previewBtn) previewBtn.classList.toggle('active', this.showTextColorPalette);
        this.reposition();
      } else {
        this.render();
      }
    } else if (action === 'start-inline-edit') {
      if (primary) {
        this.core.emit('requestInlineTextEdit', { objectId: primary.id });
      }
    } else if (action === 'toggle-group') {
      const selected = this.selectionManager.getSelectedObjects();
      const hasGroup = selected.some(o => o.groupId);
      if (hasGroup) {
        this.selectionManager.ungroupSelected();
      } else {
        this.selectionManager.groupSelected();
      }
      this.closePopup();
      this.render();
    } else if (action === 'duplicate') {
      this.selectionManager.duplicateSelected();
      this.closePopup();
    } else if (action === 'delete') {
      this.selectionManager.deleteSelected();
      this.closePopup();
    }
  }

  togglePopup(popupName) {
    if (this.activePopup === popupName) {
      this.activePopup = null;
      this.showTextColorPalette = false;
      this.showStyleColorPalette = false;
      this.isNewlyOpened = false;
    } else {
      this.activePopup = popupName;
      this.isNewlyOpened = true;
      if (popupName !== 'text') {
        this.showTextColorPalette = false;
      }
      if (popupName !== 'style') {
        this.showStyleColorPalette = false;
      }
    }
    this.render();
    if (this.isNewlyOpened) {
      setTimeout(() => {
        const card = this.toolbarEl.querySelector('.mt-popup-card');
        if (card) card.classList.remove('is-opening');
        this.isNewlyOpened = false;
      }, 250);
    }
  }

  closePopup() {
    if (this.activePopup) {
      this.activePopup = null;
      this.showTextColorPalette = false;
      this.showStyleColorPalette = false;
      this.isNewlyOpened = false;
      this.render();
    }
  }

  isVisible() {
    return this.toolbarEl && this.toolbarEl.style.display !== 'none';
  }

  show() {
    if (!this.toolbarEl) return;
    const mode = this.core.getMode();
    const selectedObjs = this.selectionManager.getSelectedObjects();

    if (mode !== 'design' || selectedObjs.length === 0 || (selectedObjs.length === 1 && selectedObjs[0].locked)) {
      this.hide();
      return;
    }

    this.toolbarEl.style.display = 'flex';
    this.render();
    this.reposition();
  }

  hide() {
    if (!this.toolbarEl) return;
    this.toolbarEl.style.display = 'none';
    this.activePopup = null;
    this.showTextColorPalette = false;
    this.showStyleColorPalette = false;
    this.isNewlyOpened = false;
    this.linePopupClosedByUser = false;
  }

  updatePositionAndVisibility() {
    if (this.isVisible()) {
      const mode = this.core.getMode();
      const selectedObjs = this.selectionManager.getSelectedObjects();

      if (mode !== 'design' || selectedObjs.length === 0 || (selectedObjs.length === 1 && selectedObjs[0].locked)) {
        this.hide();
      } else {
        this.render();
        this.reposition();
      }
    }
  }

  reposition() {
    if (!this.isVisible()) return;
    const selectedObjs = this.selectionManager.getSelectedObjects();
    if (selectedObjs.length === 0 || (selectedObjs.length === 1 && selectedObjs[0].locked)) {
      this.hide();
      return;
    }

    // Seçili nesnelerin sahne koordinatlarında AABB sınırları
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedObjs.forEach(o => {
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.width);
      maxY = Math.max(maxY, o.y + o.height);
    });

    const midStageX = (minX + maxX) / 2;
    const clientTopObj = this.stageManager.stageToClient(midStageX, minY);
    const clientBottomObj = this.stageManager.stageToClient(midStageX, maxY);
    const clientCenterObj = this.stageManager.stageToClient(midStageX, (minY + maxY) / 2);

    // Üst kısımdaki sabit başlık ve ikincil araç çubuğu (58px + 48px = 106px)
    const headerOffset = 112;
    const screenBottom = window.innerHeight - 15;
    const screenLeft = 16;
    const screenRight = window.innerWidth - 16;

    // Nesnenin altındaki ve üstündeki kullanılabilir ekran dikey boşluğu
    const spaceBelow = screenBottom - (clientBottomObj.clientY + 12);
    const spaceAbove = (clientTopObj.clientY - 12) - headerOffset;

    // Toolbar ve menü için gereken dikey boşluk (açıkken gerçek yükseklik, kapalıyken potansiyel popup için ~240px)
    const tbRect = this.toolbarEl.getBoundingClientRect();
    const currentHeight = tbRect.height || (this.activePopup ? 260 : 44);
    const neededHeight = this.activePopup ? currentHeight : 240;

    let isAbove = false;
    // Eğer alt tarafta yeterli yer varsa altta aç, yetersizse ve üstte yer varsa veya üst taraf daha genişse üstte aç
    if (spaceBelow >= neededHeight) {
      isAbove = false;
    } else if (spaceAbove >= neededHeight) {
      isAbove = true;
    } else {
      isAbove = spaceAbove > spaceBelow;
    }

    this.toolbarEl.classList.toggle('placement-above', isAbove);
    this.toolbarEl.classList.toggle('placement-below', !isAbove);

    // Sınıf geçişinden sonra güncel boyutları oku
    const updatedRect = this.toolbarEl.getBoundingClientRect();
    const finalTbHeight = updatedRect.height || currentHeight;
    const finalTbWidth = updatedRect.width || 280;

    let top = 0;
    if (isAbove) {
      // Nesnenin üst kenarının 10px yukarısına yerleştir
      top = clientTopObj.clientY - 10 - finalTbHeight;
      top = Math.max(headerOffset, top);
      if (top + finalTbHeight > screenBottom) {
        top = Math.max(headerOffset, screenBottom - finalTbHeight);
      }
    } else {
      // Nesnenin alt kenarının 10px aşağısına yerleştir
      top = clientBottomObj.clientY + 10;
      if (top + finalTbHeight > screenBottom) {
        top = Math.max(headerOffset, screenBottom - finalTbHeight);
      }
    }

    // Yatay konum (Nesnenin ortası, ekran sınırlarına taşmayacak şekilde)
    let left = clientCenterObj.clientX - finalTbWidth / 2;
    left = Math.max(screenLeft, Math.min(screenRight - finalTbWidth, left));

    this.toolbarEl.style.left = `${Math.round(left)}px`;
    this.toolbarEl.style.top = `${Math.round(top)}px`;

    // Açık popup varsa taşma ve kaydırma çubuğu oluşmasını önle
    const popupEl = this.toolbarEl.querySelector('.mt-popup-card');
    if (popupEl) {
      popupEl.style.maxHeight = 'none';
      popupEl.style.overflow = 'visible';
    }
  }

  render() {
    const selectedObjs = this.selectionManager.getSelectedObjects();
    const primary = this.selectionManager.getPrimarySelected();
    if (selectedObjs.length === 0 || !primary || (selectedObjs.length === 1 && primary.locked)) {
      this.toolbarEl.style.display = 'none';
      return;
    }
    const isMulti = selectedObjs.length > 1;
    const hasGroup = selectedObjs.some(o => o.groupId);
    const canHaveText = selectedObjs.some(o => o.type !== 'line');
    const allLines = selectedObjs.length > 0 && selectedObjs.every(o => o.type === 'line');

    if (!allLines && this.activePopup === 'line') {
      this.activePopup = null;
    }

    if (allLines) {
      if (this.activePopup === null && !this.linePopupClosedByUser) {
        this.activePopup = 'line';
      }
      let html = `
        <div class="mini-toolbar-pill line-mini-toolbar-pill">
          <button type="button" class="mt-btn ${this.activePopup === 'line' ? 'active' : ''}" data-action="toggle-line-popup" title="Çizgi Ayarları">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18l6-6 4 4 6-8"/></svg>
          </button>

          <div class="mt-divider"></div>

          <!-- Çoğalt Butonu -->
          <button type="button" class="mt-btn" data-action="duplicate" title="Çoğalt (Ctrl+D)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>

          <!-- Sil Butonu -->
          <button type="button" class="mt-btn mt-btn-danger" data-action="delete" title="Sil (Delete)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>

        <!-- Popuplar -->
        ${this.renderActivePopup(primary, isMulti, hasGroup)}
      `;

      this.toolbarEl.innerHTML = html;
      this.bindPopupInteractions(primary);
      this.reposition();
      return;
    }

    if (this.activePopup === 'text' && !canHaveText) {
      this.activePopup = null;
    }

    let html = `
      <div class="mini-toolbar-pill ${isMulti ? 'is-multi' : ''}">
        ${isMulti ? `
          <button type="button" class="mt-btn ${this.activePopup === 'align' ? 'active' : ''}" data-action="toggle-align-popup" title="Hizalama">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M12 7v10M7 12h10"/></svg>
          </button>
        ` : ''}

        ${(isMulti || hasGroup) ? `
          <button type="button" class="mt-btn ${hasGroup ? 'active' : ''}" data-action="toggle-group" title="${hasGroup ? 'Grubu Çöz (Ctrl+Shift+G)' : 'Grupla (Ctrl+G)'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/></svg>
          </button>
        ` : ''}

        <!-- Sahne Rolü Butonu -->
        <button type="button" class="mt-btn ${this.activePopup === 'role' ? 'active' : ''}" data-action="toggle-role-popup" title="Sahne Rolü">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M9 6h6M6 9v6M18 9v6M9 18h6"/></svg>
        </button>

        <!-- Görünüm / Şekil Butonu -->
        <button type="button" class="mt-btn ${this.activePopup === 'style' ? 'active' : ''}" data-action="toggle-style-popup" title="Nesne Görünümü">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l4 7H8l4-7z"/><rect x="3" y="14" width="7" height="7"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>
        </button>

        <!-- Metin Butonu (Çizgide metin olmayacağı için gizlenir) -->
        ${canHaveText ? `
          <button type="button" class="mt-btn ${this.activePopup === 'text' ? 'active' : ''}" data-action="toggle-text-popup" title="Metin Biçimlendirme">
            <span class="mt-text-icon">Aa</span>
          </button>
        ` : ''}

        <div class="mt-divider"></div>

        <!-- Çoğalt Butonu -->
        <button type="button" class="mt-btn" data-action="duplicate" title="Çoğalt (Ctrl+D)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>

        <!-- Sil Butonu -->
        <button type="button" class="mt-btn mt-btn-danger" data-action="delete" title="Sil (Delete)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>

        <!-- Katmanlar & Kilit Butonu -->
        <button type="button" class="mt-btn ${this.activePopup === 'layers' ? 'active' : ''}" data-action="toggle-layer-popup" title="Katman Sırası ve Kilit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </button>
      </div>

      <!-- Popuplar -->
      ${this.renderActivePopup(primary, isMulti, hasGroup)}
    `;

    this.toolbarEl.innerHTML = html;
    this.bindPopupInteractions(primary);
    this.reposition();
  }

  renderActivePopup(primary, isMulti, hasGroup = false) {
    if (!this.activePopup || !primary) return '';
    const openClass = this.isNewlyOpened ? 'is-opening' : '';

    if (this.activePopup === 'line') {
      const bStyle = primary.borderStyle || 'solid';
      const rot = Math.round(primary.rotation || 0) % 360;
      const normalizedRot = (rot + 360) % 360;
      const isHoriz = normalizedRot === 0 || normalizedRot === 180;
      const isVert = normalizedRot === 90 || normalizedRot === 270;

      return `
        <div class="mt-popup-card mt-line-popup ${openClass}" id="mt-line-popup">
          <!-- Çizgi Tipi -->
          <div class="mt-line-popup-section">
            <div class="mt-line-popup-title">Çizgi tipi</div>
            <div class="mt-line-pill-group">
              <button type="button" class="mt-line-type-btn ${bStyle === 'solid' ? 'active' : ''}" data-line-style="solid" title="Düz Çizgi">
                <svg width="32" height="16" viewBox="0 0 32 16"><line x1="2" y1="8" x2="30" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
              </button>
              <button type="button" class="mt-line-type-btn ${bStyle === 'dashed' ? 'active' : ''}" data-line-style="dashed" title="Kesikli Çizgi">
                <svg width="32" height="16" viewBox="0 0 32 16"><line x1="2" y1="8" x2="30" y2="8" stroke="currentColor" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round"/></svg>
              </button>
              <button type="button" class="mt-line-type-btn ${bStyle === 'dotted' ? 'active' : ''}" data-line-style="dotted" title="Noktalı Çizgi">
                <svg width="32" height="16" viewBox="0 0 32 16"><line x1="2" y1="8" x2="30" y2="8" stroke="currentColor" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <!-- Hizalama -->
          <div class="mt-line-popup-section">
            <div class="mt-line-popup-title">Hizalama</div>
            <div class="mt-line-pill-group">
              <button type="button" class="mt-line-align-btn ${isHoriz ? 'active' : ''}" data-line-align="horizontal" title="Yatay yap">
                <svg width="18" height="14" viewBox="0 0 18 14"><line x1="1" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
                <span>Yatay yap</span>
              </button>
              <div class="mt-line-group-divider"></div>
              <button type="button" class="mt-line-align-btn ${isVert ? 'active' : ''}" data-line-align="vertical" title="Dikey yap">
                <svg width="14" height="18" viewBox="0 0 14 18"><line x1="7" y1="1" x2="7" y2="17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
                <span>Dikey yap</span>
              </button>
            </div>
          </div>

          <!-- Ok uçları -->
          <div class="mt-line-popup-section">
            <div class="mt-line-popup-title">Ok uçları</div>
            <div class="mt-line-pill-group">
              <button type="button" class="mt-line-arrow-btn ${primary.arrowStart ? 'active' : ''}" data-line-arrow="start" title="Başlangıç oku">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                <span>Başlangıç</span>
              </button>
              <button type="button" class="mt-line-arrow-btn ${primary.arrowEnd ? 'active' : ''}" data-line-arrow="end" title="Bitiş oku">
                <span>Bitiş</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activePopup === 'role') {
      const r = primary.role || 'decorative';
      return `
        <div class="mt-popup-card mt-role-popup ${openClass}" id="mt-role-popup">
          <div class="mt-popup-title">Sahne rolü</div>
          <div class="mt-pill-group">
            <button type="button" class="mt-role-btn ${r === 'draggable' ? 'active' : ''}" data-role-val="draggable">Taşınan</button>
            <button type="button" class="mt-role-btn ${['target', 'category', 'sequence_slot'].includes(r) ? 'active' : ''}" data-role-val="target">Hedef</button>
            <button type="button" class="mt-role-btn ${r === 'decorative' ? 'active' : ''}" data-role-val="decorative">Nötr</button>
          </div>
        </div>
      `;
    }

    if (this.activePopup === 'style') {
      const isLine = primary.type === 'line';
      const bStyle = primary.borderStyle || 'solid';
      const bWidth = primary.borderWidth !== undefined ? primary.borderWidth : 2;
      const bRadius = primary.borderRadius !== undefined ? primary.borderRadius : 8;

      const colors = [
        'transparent', '#ffffff', '#cbd5e1', '#64748b', '#1e293b', '#ef4444', '#f97316',
        '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#2563eb', '#8b5cf6', '#ec4899'
      ];

      if (isLine) {
        const activeColor = primary.borderColor || '#1e293b';
        return `
          <div class="mt-popup-card mt-style-popup ${openClass}" id="mt-style-popup">
            <div class="mt-popup-title">Çizgi görünümü</div>

            <!-- Satır 1: Çizgi Stili ve Renk Seçici Butonu -->
            <div class="mt-row mt-border-style-row" style="justify-content: space-between;">
              <div class="mt-pill-group">
                <button type="button" class="mt-icon-btn ${bStyle === 'solid' ? 'active' : ''}" data-border-style="solid" title="Düz Çizgi">━</button>
                <button type="button" class="mt-icon-btn ${bStyle === 'dashed' ? 'active' : ''}" data-border-style="dashed" title="Kesikli">┅</button>
                <button type="button" class="mt-icon-btn ${bStyle === 'dotted' ? 'active' : ''}" data-border-style="dotted" title="Noktalı">⋯</button>
              </div>

              <button type="button" class="mt-color-preview-btn ${this.showStyleColorPalette ? 'active' : ''}" data-action="toggle-style-palette" title="Çizgi Rengi (Renk paletini aç/kapat)">
                <span class="mt-color-circle" style="background-color: ${activeColor};"></span>
              </button>
            </div>

            <!-- Satır 2: Çizgi Kalınlığı (-/+) Stepper -->
            <div class="mt-row mt-stepper-row">
              <div class="mt-stepper-group" style="width: 100%; justify-content: space-between;" title="Çizgi Kalınlığı">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="mt-stepper-label-icon">≡</span>
                  <span style="font-size: 0.78rem; font-weight: 500; color: #64748b;">Kalınlık</span>
                </div>
                <div style="display: flex; align-items: center; gap: 3px;">
                  <button type="button" class="mt-step-btn" data-step-prop="borderWidth" data-step-dir="-1" title="Kalınlığı Azalt">−</button>
                  <span class="mt-step-val" id="mt-val-borderWidth">${bWidth}</span>
                  <span class="mt-step-unit">px</span>
                  <button type="button" class="mt-step-btn" data-step-prop="borderWidth" data-step-dir="1" title="Kalınlığı Artır">+</button>
                </div>
              </div>
            </div>

            <!-- Satır 3: Açılır Renk Paleti (Sadece renk ikonu tıklanınca görünür) -->
            <div class="mt-style-palette-section" style="display: ${this.showStyleColorPalette ? 'flex' : 'none'};">
              <div class="mt-palette-header">Çizgi Rengi</div>
              <div class="mt-color-palette">
                ${colors.filter(c => c !== 'transparent').map(c => `
                  <button type="button" class="mt-color-swatch ${(activeColor || '').toLowerCase() === c.toLowerCase() ? 'is-active-swatch' : ''}" data-color-val="${c}" style="background-color: ${c};" title="${c}">
                    ${((activeColor || '').toLowerCase() === c.toLowerCase()) ? '<span class="swatch-check" style="color: ' + (['#ffffff', '#cbd5e1'].includes(c) ? '#000' : '#fff') + '">✓</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }

      const activeColor = this.currentTargetProp === 'border' ? (primary.borderColor || 'transparent') : (primary.backgroundColor || '#ffffff');

      return `
        <div class="mt-popup-card mt-style-popup ${openClass}" id="mt-style-popup">
          <div class="mt-popup-title">Nesne görünümü</div>

          <!-- Satır 1: Kenarlık Stili ve Dolgu/Kenarlık Renk Seçici İkonları -->
          <div class="mt-row mt-border-style-row">
            <div class="mt-pill-group">
              <button type="button" class="mt-icon-btn ${bStyle === 'none' ? 'active' : ''}" data-border-style="none" title="Kenarlık Yok">⊘</button>
              <button type="button" class="mt-icon-btn ${bStyle === 'solid' ? 'active' : ''}" data-border-style="solid" title="Düz Çizgi">━</button>
              <button type="button" class="mt-icon-btn ${bStyle === 'dashed' ? 'active' : ''}" data-border-style="dashed" title="Kesikli">┅</button>
              <button type="button" class="mt-icon-btn ${bStyle === 'dotted' ? 'active' : ''}" data-border-style="dotted" title="Noktalı">⋯</button>
            </div>

            <div class="mt-color-target-toggle">
              <button type="button" class="mt-target-chip ${this.currentTargetProp === 'border' ? 'active' : ''}" data-color-target="border" title="Kenarlık Rengi (Renk paletini aç/kapat)">
                <span class="chip-preview-border" style="border-color: ${primary.borderColor || '#3b82f6'};"></span>
              </button>
              <button type="button" class="mt-target-chip ${this.currentTargetProp === 'fill' ? 'active' : ''}" data-color-target="fill" title="Dolgu Rengi (Renk paletini aç/kapat)">
                <span class="chip-preview-fill" style="background-color: ${primary.backgroundColor || '#ffffff'};"></span>
              </button>
            </div>
          </div>

          <!-- Satır 2: Çizgi Kalınlığı (-/+) ve Köşe Yuvarlaklığı (-/+) Stepper'ları -->
          <div class="mt-row mt-stepper-row" style="justify-content: space-between;">
            <div class="mt-stepper-group" title="Kenarlık / Çizgi Kalınlığı">
              <span class="mt-stepper-label-icon">≡</span>
              <button type="button" class="mt-step-btn" data-step-prop="borderWidth" data-step-dir="-1" title="Kalınlığı Azalt">−</button>
              <span class="mt-step-val" id="mt-val-borderWidth">${bWidth}</span>
              <span class="mt-step-unit">px</span>
              <button type="button" class="mt-step-btn" data-step-prop="borderWidth" data-step-dir="1" title="Kalınlığı Artır">+</button>
            </div>

            <div class="mt-stepper-group" title="Köşe Yuvarlaklığı">
              <span class="mt-stepper-label-icon">⌒</span>
              <button type="button" class="mt-step-btn" data-step-prop="borderRadius" data-step-dir="-1" title="Köşe Yuvarlaklığını Azalt">−</button>
              <span class="mt-step-val" id="mt-val-borderRadius">${bRadius}</span>
              <span class="mt-step-unit">px</span>
              <button type="button" class="mt-step-btn" data-step-prop="borderRadius" data-step-dir="1" title="Köşe Yuvarlaklığını Artır">+</button>
            </div>
          </div>

          <!-- Satır 3: Açılır Renk Paleti (Metindeki gibi sadece renk ikonu tıklandığında görünür) -->
          <div class="mt-style-palette-section" style="display: ${this.showStyleColorPalette ? 'flex' : 'none'};">
            <div class="mt-palette-header" id="mt-style-palette-title">${this.currentTargetProp === 'border' ? 'Kenarlık Rengi' : 'Dolgu Rengi'}</div>
            <div class="mt-color-palette">
              ${colors.map(c => `
                <button type="button" class="mt-color-swatch ${c === 'transparent' ? 'is-transparent' : ''} ${(activeColor || '').toLowerCase() === c.toLowerCase() ? 'is-active-swatch' : ''}" data-color-val="${c}" style="background-color: ${c === 'transparent' ? '#ffffff' : c};" title="${c}">
                  ${c === 'transparent' ? '<span class="slash-line">⊘</span>' : (((activeColor || '').toLowerCase() === c.toLowerCase()) ? '<span class="swatch-check" style="color: ' + (['#ffffff', '#cbd5e1'].includes(c) ? '#000' : '#fff') + '">✓</span>' : '')}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.activePopup === 'text') {
      const isBold = primary.fontWeight === 'bold' || primary.fontWeight === '700' || primary.fontWeight === '800';
      const isItalic = primary.fontStyle === 'italic';
      const isUnderline = primary.textDecoration === 'underline';
      const fSize = primary.fontSize || 16;
      const tColor = primary.textColor || '#1e293b';
      const hAlign = primary.textAlign || 'center';
      const vAlign = primary.verticalAlign || 'middle';

      return `
        <div class="mt-popup-card mt-text-popup ${openClass}" id="mt-text-popup">
          <div class="mt-popup-header-row">
            <div class="mt-popup-title">Metin</div>
            <button type="button" class="mt-inline-edit-btn" data-action="start-inline-edit" title="Metni Yerinde Düzenle (veya çift tıklayın)">✏️ Düzenle</button>
          </div>

          <!-- Font Stili, Boyut ve Renk -->
          <div class="mt-row mt-text-format-row">
            <div class="mt-pill-group">
              <button type="button" class="mt-format-btn ${isBold ? 'active' : ''}" data-text-action="bold"><strong>B</strong></button>
              <button type="button" class="mt-format-btn ${isItalic ? 'active' : ''}" data-text-action="italic"><em>I</em></button>
              <button type="button" class="mt-format-btn ${isUnderline ? 'active' : ''}" data-text-action="underline"><u>U</u></button>
            </div>

            <div class="mt-size-stepper">
              <span class="mt-size-val">${fSize}</span>
              <div class="mt-stepper-arrows">
                <button type="button" data-text-action="size-up">▲</button>
                <button type="button" data-text-action="size-down">▼</button>
              </div>
              <span class="mt-size-unit">pt</span>
            </div>

            <button type="button" class="mt-color-preview-btn ${this.showTextColorPalette ? 'active' : ''}" data-action="toggle-text-palette" title="Metin Rengi (Tanımlı Renkler)">
              <span class="mt-color-circle" style="background-color: ${tColor};"></span>
            </button>
          </div>

          <!-- Yatay ve Dikey Hizalama -->
          <div class="mt-row mt-align-row">
            <div class="mt-pill-group">
              <button type="button" class="mt-icon-btn ${hAlign === 'left' ? 'active' : ''}" data-align-h="left" title="Sola Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
              </button>
              <button type="button" class="mt-icon-btn ${hAlign === 'center' ? 'active' : ''}" data-align-h="center" title="Ortala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              </button>
              <button type="button" class="mt-icon-btn ${hAlign === 'right' ? 'active' : ''}" data-align-h="right" title="Sağa Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>

            <div class="mt-pill-group">
              <button type="button" class="mt-icon-btn ${vAlign === 'top' ? 'active' : ''}" data-align-v="top" title="Üste Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="4" x2="21" y2="4"/><path d="M12 20V8"/><polyline points="8 12 12 8 16 12"/></svg>
              </button>
              <button type="button" class="mt-icon-btn ${vAlign === 'middle' ? 'active' : ''}" data-align-v="middle" title="Dikey Ortala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"/><path d="M8 7l4 5 4-5"/><path d="M8 17l4-5 4 5"/></svg>
              </button>
              <button type="button" class="mt-icon-btn ${vAlign === 'bottom' ? 'active' : ''}" data-align-v="bottom" title="Alta Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="20" x2="21" y2="20"/><path d="M12 4v12"/><polyline points="8 12 12 16 16 12"/></svg>
              </button>
            </div>
          </div>

          <!-- Tanımlı Renkler Izgarası (En Altta, Özel Renk Seç Yok) -->
          <div class="mt-text-palette-section" style="display: ${this.showTextColorPalette ? 'flex' : 'none'};">
            <div class="mt-palette-header">Tanımlı Renkler</div>
            <div class="mt-color-palette">
              ${[
                '#1e293b', '#ffffff', '#cbd5e1', '#64748b', '#ef4444', '#f97316', '#eab308',
                '#22c55e', '#14b8a6', '#0ea5e9', '#2563eb', '#6366f1', '#8b5cf6', '#ec4899'
              ].map(c => `
                <button type="button" class="mt-color-swatch ${c.toLowerCase() === (tColor || '').toLowerCase() ? 'is-active-swatch' : ''}" data-text-color-val="${c}" style="background-color: ${c};" title="${c}">
                  ${c.toLowerCase() === (tColor || '').toLowerCase() ? '<span class="swatch-check">✓</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.activePopup === 'layers') {
      const isLocked = primary.locked;
      return `
        <div class="mt-popup-card mt-layer-popup ${openClass}" id="mt-layer-popup">
          <div class="mt-layer-menu">
            <button type="button" class="mt-layer-item mt-layer-btn" data-layer-action="forward" title="Öne Getir">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              <span>Öne</span>
            </button>
            <button type="button" class="mt-layer-item mt-layer-btn" data-layer-action="front" title="En Öne Getir">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/></svg>
              <span>En öne</span>
            </button>
            <button type="button" class="mt-layer-item mt-layer-btn" data-layer-action="backward" title="Arkaya Gönder">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              <span>Arkaya</span>
            </button>
            <button type="button" class="mt-layer-item mt-layer-btn" data-layer-action="back" title="En Arkaya Gönder">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 13 5 5 5-5"/><path d="m7 6 5 5 5-5"/></svg>
              <span>En arkaya</span>
            </button>
            <div class="mt-layer-divider"></div>
            <button type="button" class="mt-layer-item mt-layer-btn mt-layer-lock-item ${isLocked ? 'is-locked active-lock' : ''}" data-layer-action="toggle-lock" title="${isLocked ? 'Kilidi Aç' : 'Nesneyi Kilitle'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${isLocked
                  ? '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
                  : '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'}
              </svg>
              <span class="mt-lock-label">${isLocked ? 'Kilidi Aç' : 'Kilit'}</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.activePopup === 'align') {
      const selectedObjs = this.selectionManager.getSelectedObjects().filter(o => !o.locked);
      const canEqualize = selectedObjs.length >= 2;
      const canDistribute = selectedObjs.length >= 3;

      return `
        <div class="mt-popup-card mt-align-popup ${openClass}" id="mt-align-popup">
          <div class="mt-popup-title">Hizalama</div>
          <div class="mt-row">
            <div class="mt-pill-group">
              <button type="button" class="mt-icon-btn" data-multi-align="left" title="Sola Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="3" x2="4" y2="21"/><rect x="8" y="7" width="12" height="10" rx="1"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-multi-align="center" title="Yatay Ortala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="3" x2="12" y2="21"/><rect x="6" y="7" width="12" height="10" rx="1"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-multi-align="right" title="Sağa Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="20" y1="3" x2="20" y2="21"/><rect x="4" y="7" width="12" height="10" rx="1"/></svg>
              </button>
            </div>
            <div class="mt-pill-group">
              <button type="button" class="mt-icon-btn" data-multi-align="top" title="Üste Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="4" x2="21" y2="4"/><rect x="7" y="8" width="10" height="12" rx="1"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-multi-align="middle" title="Dikey Ortala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"/><rect x="7" y="6" width="10" height="12" rx="1"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-multi-align="bottom" title="Alta Hizala">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="20" x2="21" y2="20"/><rect x="7" y="4" width="10" height="12" rx="1"/></svg>
              </button>
            </div>
          </div>
          <div class="mt-row" style="margin-top: 6px; justify-content: space-between;">
            <div class="mt-pill-group">
              <button type="button" class="mt-icon-btn" data-distribute="horizontal" ${canDistribute ? '' : 'disabled'} title="${canDistribute ? 'Yatay Eşit Dağıt' : 'Yatay Eşit Dağıt (En az 3 nesne seçilmeli)'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="3" x2="4" y2="21"/><line x1="20" y1="3" x2="20" y2="21"/><rect x="8.5" y="7" width="7" height="10" rx="1"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-distribute="vertical" ${canDistribute ? '' : 'disabled'} title="${canDistribute ? 'Dikey Eşit Dağıt' : 'Dikey Eşit Dağıt (En az 3 nesne seçilmeli)'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="4" x2="21" y2="4"/><line x1="3" y1="20" x2="21" y2="20"/><rect x="7" y="8.5" width="10" height="7" rx="1"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-equalize-width="min" ${canEqualize ? '' : 'disabled'} title="${canEqualize ? 'En Kısa Genişliğe Eşitle' : 'En Kısa Genişliğe Eşitle (En az 2 nesne seçilmeli)'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="8" y="5" width="8" height="14" rx="1.5"/><path d="M2 12h4m-2-2.5l2.5 2.5-2.5 2.5M22 12h-4m2-2.5l-2.5 2.5 2.5 2.5"/></svg>
              </button>
              <button type="button" class="mt-icon-btn" data-equalize-width="max" ${canEqualize ? '' : 'disabled'} title="${canEqualize ? 'En Uzun Genişliğe Eşitle' : 'En Uzun Genişliğe Eşitle (En az 2 nesne seçilmeli)'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="5" width="14" height="14" rx="1.5"/><path d="M9 12H4m2.5-2.5L4 12l2.5 2.5M15 12h5m-2.5-2.5l2.5 2.5-2.5 2.5"/></svg>
              </button>
            </div>
            <button type="button" class="mt-group-action-btn ${hasGroup ? 'active-group' : ''}" data-action="toggle-group" title="${hasGroup ? 'Grubu Çöz (Ctrl+Shift+G)' : 'Grupla (Ctrl+G)'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              <span>${hasGroup ? 'Grubu Çöz' : 'Grupla'}</span>
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  bindPopupInteractions(primary) {
    if (!primary) return;
    const getTargets = () => this.selectionManager.getSelectedObjects();
    const getTextTargets = () => getTargets().filter(o => o.type === 'text' || o.text !== undefined || o.role === 'category' || o.role === 'sequence_slot');

    // Çizgi Tipi Seçimi
    this.toolbarEl.querySelectorAll('[data-line-style]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const style = btn.getAttribute('data-line-style');
        this.toolbarEl.querySelectorAll('[data-line-style]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        getTargets().forEach(o => this.objectManager.updateObject(o.id, { borderStyle: style }));
      };
    });

    // Çizgi Hizalama (Yatay Yap / Dikey Yap)
    this.toolbarEl.querySelectorAll('[data-line-align]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const align = btn.getAttribute('data-line-align');
        const rot = align === 'horizontal' ? 0 : 90;
        this.toolbarEl.querySelectorAll('[data-line-align]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        getTargets().forEach(o => this.objectManager.updateObject(o.id, { rotation: rot }));
        this.selectionManager.updateSelectionBox();
      };
    });

    // Çizgi Ok Uçları (Başlangıç / Bitiş)
    this.toolbarEl.querySelectorAll('[data-line-arrow]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const arrowType = btn.getAttribute('data-line-arrow');
        const prop = arrowType === 'start' ? 'arrowStart' : 'arrowEnd';
        const currentObj = this.objectManager.getObject(primary.id) || primary;
        const newVal = !currentObj[prop];
        btn.classList.toggle('active', newVal);
        getTargets().forEach(o => this.objectManager.updateObject(o.id, { [prop]: newVal }));
      };
    });

    // Rol Seçimi
    this.toolbarEl.querySelectorAll('[data-role-val]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const role = btn.getAttribute('data-role-val');
        this.toolbarEl.querySelectorAll('[data-role-val]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        getTargets().forEach(o => this.objectManager.updateObject(o.id, { role }));
      };
    });

    // Kenarlık Stili
    this.toolbarEl.querySelectorAll('[data-border-style]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const style = btn.getAttribute('data-border-style');
        this.toolbarEl.querySelectorAll('[data-border-style]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        getTargets().forEach(o => this.objectManager.updateObject(o.id, { borderStyle: style }));
      };
    });

    // Hedef Renk Seçici (Dolgu mu Kenarlık mı?) ve Palet Aç/Kapat
    this.toolbarEl.querySelectorAll('[data-color-target]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const targetProp = btn.getAttribute('data-color-target');
        const paletteSec = this.toolbarEl.querySelector('.mt-style-popup .mt-style-palette-section');

        if (this.currentTargetProp === targetProp && this.showStyleColorPalette) {
          // Aynı hedefe tıklandı -> paleti kapat
          this.showStyleColorPalette = false;
          btn.classList.remove('active');
        } else {
          // Farklı hedefe tıklandı veya kapalıydı -> hedefi güncelle ve paleti aç
          this.currentTargetProp = targetProp;
          this.showStyleColorPalette = true;
          this.toolbarEl.querySelectorAll('[data-color-target]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }

        if (paletteSec) {
          paletteSec.style.display = this.showStyleColorPalette ? 'flex' : 'none';
          if (this.showStyleColorPalette) {
            paletteSec.classList.add('is-opening');
            const titleEl = this.root.getElementById('mt-style-palette-title');
            if (titleEl) {
              titleEl.textContent = this.currentTargetProp === 'border' ? 'Kenarlık Rengi' : 'Dolgu Rengi';
            }
            // Aktif swatch'ı güncelle
            const activeColor = this.currentTargetProp === 'border' ? (primary.borderColor || 'transparent') : (primary.backgroundColor || '#ffffff');
            paletteSec.querySelectorAll('[data-color-val]').forEach(sb => {
              const sc = sb.getAttribute('data-color-val');
              const isMatch = (sc || '').toLowerCase() === (activeColor || '').toLowerCase();
              sb.classList.toggle('is-active-swatch', isMatch);
              const check = sb.querySelector('.swatch-check');
              if (check) check.remove();
              if (isMatch && sc !== 'transparent') {
                const isWhite = ['#ffffff', '#cbd5e1'].includes(sc);
                sb.insertAdjacentHTML('beforeend', `<span class="swatch-check" style="color: ${isWhite ? '#000' : '#fff'}">✓</span>`);
              }
            });
          }
          this.reposition();
        }
      };
    });

    // Kalınlık ve Köşe Yuvarlaklığı (+/-) Stepper Etkileşimi
    this.toolbarEl.querySelectorAll('[data-step-prop]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const prop = btn.getAttribute('data-step-prop'); // 'borderWidth' | 'borderRadius'
        const dir = parseInt(btn.getAttribute('data-step-dir'), 10); // -1 | 1
        const isLine = primary.type === 'line';
        const step = prop === 'borderRadius' ? 2 : 1;
        const minVal = isLine && prop === 'borderWidth' ? 1 : 0;
        const maxVal = prop === 'borderRadius' ? 50 : 24;

        const currentVal = primary[prop] !== undefined ? primary[prop] : (prop === 'borderRadius' ? 8 : 2);
        const newVal = Math.max(minVal, Math.min(maxVal, currentVal + (dir * step)));

        primary[prop] = newVal;
        getTargets().forEach(o => this.objectManager.updateObject(o.id, { [prop]: newVal }));

        const valEl = this.toolbarEl.querySelector(`#mt-val-${prop}`);
        if (valEl) {
          valEl.textContent = newVal;
        }
      };
    });

    // Renk Paleti Tıklaması
    this.toolbarEl.querySelectorAll('#mt-style-popup [data-color-val]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const c = btn.getAttribute('data-color-val');
        if (this.currentTargetProp === 'border' || primary.type === 'line') {
          const chipBorder = this.toolbarEl.querySelector('.chip-preview-border');
          if (chipBorder) chipBorder.style.borderColor = c === 'transparent' ? '#cbd5e1' : c;
          const colorCircle = this.toolbarEl.querySelector('.mt-style-popup .mt-color-circle');
          if (colorCircle) colorCircle.style.backgroundColor = c === 'transparent' ? 'transparent' : c;
          getTargets().forEach(o => this.objectManager.updateObject(o.id, {
            borderColor: c,
            borderStyle: c === 'transparent' ? 'none' : (o.borderStyle === 'none' ? 'solid' : o.borderStyle || 'solid')
          }));
        } else {
          const chipFill = this.toolbarEl.querySelector('.chip-preview-fill');
          if (chipFill) chipFill.style.backgroundColor = c === 'transparent' ? 'transparent' : c;
          getTargets().forEach(o => this.objectManager.updateObject(o.id, { backgroundColor: c }));
        }

        this.toolbarEl.querySelectorAll('#mt-style-popup [data-color-val]').forEach(b => {
          b.classList.remove('is-active-swatch');
          const check = b.querySelector('.swatch-check');
          if (check) check.remove();
        });
        btn.classList.add('is-active-swatch');
        if (c !== 'transparent') {
          const isWhite = ['#ffffff', '#cbd5e1'].includes(c);
          btn.innerHTML = `<span class="swatch-check" style="color: ${isWhite ? '#000' : '#fff'}">✓</span>`;
        }
      };
    });

    // Metin Formatlama
    this.toolbarEl.querySelectorAll('[data-text-action]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const act = btn.getAttribute('data-text-action');
        const tTargets = getTextTargets();

        if (act === 'bold') {
          const isBold = primary.fontWeight === 'bold' || primary.fontWeight === '700' || primary.fontWeight === '800';
          const newWeight = isBold ? 'normal' : '700';
          btn.classList.toggle('active', newWeight === '700');
          tTargets.forEach(o => this.objectManager.updateObject(o.id, { fontWeight: newWeight }));
        } else if (act === 'italic') {
          const isItalic = primary.fontStyle === 'italic';
          const newStyle = isItalic ? 'normal' : 'italic';
          btn.classList.toggle('active', newStyle === 'italic');
          tTargets.forEach(o => this.objectManager.updateObject(o.id, { fontStyle: newStyle }));
        } else if (act === 'underline') {
          const isUnderline = primary.textDecoration === 'underline';
          const newDecor = isUnderline ? 'none' : 'underline';
          btn.classList.toggle('active', newDecor === 'underline');
          tTargets.forEach(o => this.objectManager.updateObject(o.id, { textDecoration: newDecor }));
        } else if (act === 'size-up') {
          const newSize = (primary.fontSize || 16) + 2;
          const sizeVal = this.toolbarEl.querySelector('.mt-size-val');
          if (sizeVal) sizeVal.textContent = newSize;
          tTargets.forEach(o => this.objectManager.updateObject(o.id, { fontSize: Math.max(10, (o.fontSize || 16) + 2) }));
        } else if (act === 'size-down') {
          const newSize = Math.max(10, (primary.fontSize || 16) - 2);
          const sizeVal = this.toolbarEl.querySelector('.mt-size-val');
          if (sizeVal) sizeVal.textContent = newSize;
          tTargets.forEach(o => this.objectManager.updateObject(o.id, { fontSize: Math.max(10, (o.fontSize || 16) - 2) }));
        }
      };
    });

    // Metin Tanımlı Renk Seçimi
    this.toolbarEl.querySelectorAll('[data-text-color-val]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const c = btn.getAttribute('data-text-color-val');
        const previewCircle = this.toolbarEl.querySelector('.mt-color-circle');
        if (previewCircle) previewCircle.style.backgroundColor = c;
        this.toolbarEl.querySelectorAll('[data-text-color-val]').forEach(b => {
          b.classList.remove('is-active-swatch');
          b.innerHTML = '';
        });
        btn.classList.add('is-active-swatch');
        btn.innerHTML = '<span class="swatch-check">✓</span>';
        getTextTargets().forEach(o => this.objectManager.updateObject(o.id, { textColor: c }));
      };
    });

    // Yatay Hizalama
    this.toolbarEl.querySelectorAll('[data-align-h]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const align = btn.getAttribute('data-align-h');
        this.toolbarEl.querySelectorAll('[data-align-h]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        getTextTargets().forEach(o => this.objectManager.updateObject(o.id, { textAlign: align }));
      };
    });

    // Dikey Hizalama
    this.toolbarEl.querySelectorAll('[data-align-v]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const vAlign = btn.getAttribute('data-align-v');
        this.toolbarEl.querySelectorAll('[data-align-v]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        getTextTargets().forEach(o => this.objectManager.updateObject(o.id, { verticalAlign: vAlign }));
      };
    });

    // Katman / Kilit Aksiyonları
    this.toolbarEl.querySelectorAll('[data-layer-action]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const act = btn.getAttribute('data-layer-action');
        const targets = getTargets();
        if (act === 'forward') {
          const sorted = [...targets].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));
          sorted.forEach(o => this.layerManager.bringForward(o.id));
          this.selectionManager.updateSelectionBox();
          this.core.pushHistoryState('Katmanı Öne Al');
        } else if (act === 'front') {
          const sorted = [...targets].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
          sorted.forEach(o => this.layerManager.bringToFront(o.id));
          this.selectionManager.updateSelectionBox();
          this.core.pushHistoryState('Katmanı En Öne Al');
        } else if (act === 'backward') {
          const sorted = [...targets].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
          sorted.forEach(o => this.layerManager.sendBackward(o.id));
          this.selectionManager.updateSelectionBox();
          this.core.pushHistoryState('Katmanı Arkaya Al');
        } else if (act === 'back') {
          const sorted = [...targets].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));
          sorted.forEach(o => this.layerManager.sendToBack(o.id));
          this.selectionManager.updateSelectionBox();
          this.core.pushHistoryState('Katmanı En Arkaya Al');
        } else if (act === 'toggle-lock') {
          const allLocked = targets.every(o => o.locked);
          const newLocked = !allLocked;
          btn.classList.toggle('active-lock', newLocked);
          btn.classList.toggle('is-locked', newLocked);
          const lockIcon = btn.querySelector('svg');
          if (lockIcon) {
            lockIcon.innerHTML = newLocked
              ? '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
              : '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
          }
          const labelSpan = btn.querySelector('.mt-lock-label') || btn.querySelector('span');
          if (labelSpan) {
            labelSpan.textContent = newLocked ? 'Kilidi Aç' : 'Kilit';
          }
          targets.forEach(o => this.objectManager.updateObject(o.id, { locked: newLocked }));
          this.selectionManager.updateSelectionBox();
          this.core.pushHistoryState(newLocked ? 'Nesneyi Kilitle' : 'Kilidi Aç');
        }
      };
    });

    // Çoklu Nesne Hizalama
    this.toolbarEl.querySelectorAll('[data-multi-align]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dir = btn.getAttribute('data-multi-align');
        this.alignSelectedObjects(dir);
        this.closePopup();
      };
    });

    // Eşit Dağıtma
    this.toolbarEl.querySelectorAll('[data-distribute]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const axis = btn.getAttribute('data-distribute');
        this.distributeSelected(axis);
        this.closePopup();
      };
    });

    // Genişlik Eşitleme (En Kısa / En Uzun)
    this.toolbarEl.querySelectorAll('[data-equalize-width]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-equalize-width');
        this.equalizeSelectedWidth(mode);
        this.closePopup();
      };
    });

    // Çoklu Seçim Grupla / Grubu Çöz
    this.toolbarEl.querySelectorAll('[data-action="toggle-group"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const targets = this.selectionManager.getSelectedObjects();
        const hasGroup = targets.some(o => o.groupId);
        if (hasGroup) {
          this.selectionManager.ungroupSelected();
        } else {
          this.selectionManager.groupSelected();
        }
        this.closePopup();
        this.render();
      };
    });
  }

  distributeSelected(axis) {
    const selected = this.selectionManager.getSelectedObjects().filter(o => !o.locked);
    if (selected.length < 3) return;

    if (axis === 'horizontal') {
      selected.sort((a, b) => a.x - b.x);
      const minX = selected[0].x;
      const lastObj = selected[selected.length - 1];
      const maxX = lastObj.x + lastObj.width;
      const totalWidths = selected.reduce((s, o) => s + o.width, 0);
      const totalGap = (maxX - minX) - totalWidths;
      const gap = totalGap / (selected.length - 1);

      let curX = minX;
      selected.forEach(o => {
        this.objectManager.updateObject(o.id, { x: Math.round(curX) });
        curX += o.width + gap;
      });
    } else if (axis === 'vertical') {
      selected.sort((a, b) => a.y - b.y);
      const minY = selected[0].y;
      const lastObj = selected[selected.length - 1];
      const maxY = lastObj.y + lastObj.height;
      const totalHeights = selected.reduce((s, o) => s + o.height, 0);
      const totalGap = (maxY - minY) - totalHeights;
      const gap = totalGap / (selected.length - 1);

      let curY = minY;
      selected.forEach(o => {
        this.objectManager.updateObject(o.id, { y: Math.round(curY) });
        curY += o.height + gap;
      });
    }

    this.selectionManager.updateSelectionBox();
  }

  equalizeSelectedWidth(mode) {
    const selected = this.selectionManager.getSelectedObjects().filter(o => !o.locked);
    if (selected.length < 2) return;

    const targetWidth = mode === 'min'
      ? Math.min(...selected.map(o => o.width))
      : Math.max(...selected.map(o => o.width));

    const stageW = (this.core && this.core.data && this.core.data.stage && this.core.data.stage.width) || 1200;

    selected.forEach(o => {
      let newX = o.x;
      if (newX + targetWidth > stageW) {
        newX = Math.max(0, stageW - targetWidth);
      }
      this.objectManager.updateObject(o.id, { width: targetWidth, x: newX });
    });

    this.selectionManager.updateSelectionBox();
  }

  alignSelectedObjects(direction) {
    const selected = this.selectionManager.getSelectedObjects().filter(o => !o.locked);
    if (selected.length < 2) return;

    if (direction === 'left') {
      const minX = Math.min(...selected.map(o => o.x));
      selected.forEach(o => this.objectManager.updateObject(o.id, { x: minX }));
    } else if (direction === 'right') {
      const maxR = Math.max(...selected.map(o => o.x + o.width));
      selected.forEach(o => this.objectManager.updateObject(o.id, { x: maxR - o.width }));
    } else if (direction === 'center') {
      const avgX = selected.reduce((sum, o) => sum + (o.x + o.width / 2), 0) / selected.length;
      selected.forEach(o => this.objectManager.updateObject(o.id, { x: Math.round(avgX - o.width / 2) }));
    } else if (direction === 'top') {
      const minY = Math.min(...selected.map(o => o.y));
      selected.forEach(o => this.objectManager.updateObject(o.id, { y: minY }));
    } else if (direction === 'bottom') {
      const maxB = Math.max(...selected.map(o => o.y + o.height));
      selected.forEach(o => this.objectManager.updateObject(o.id, { y: maxB - o.height }));
    } else if (direction === 'middle') {
      const avgY = selected.reduce((sum, o) => sum + (o.y + o.height / 2), 0) / selected.length;
      selected.forEach(o => this.objectManager.updateObject(o.id, { y: Math.round(avgY - o.height / 2) }));
    }

    this.selectionManager.updateSelectionBox();
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.MiniToolbar = MiniToolbar;

/**
 * UIManager - DND arayüzü, üst başlık, ikincil araç çubuğu,
 * şablonlar menüsü, mod geçişleri ve bildirimleri yönetir.
 * Yan paneller kaldırılmış, tam ekran tuval düzeni uygulanmıştır.
 */
class UIManager {
  constructor(core, stageManager, objectManager, selectionManager, historyManager, exportManager, options = {}) {
    this.core = core;
    this.stageManager = stageManager;
    this.objectManager = objectManager;
    this.selectionManager = selectionManager;
    this.historyManager = historyManager;
    this.exportManager = exportManager;
    this.options = options;
    this.root = options.root || document;

    this.previewContainer = this.root.getElementById('preview-container');
    this.editorContainer = this.root.getElementById('editor-layout');
    this.activePlayerInstance = null;

    this.init();
  }

  init() {
    this.bindHeaderActions();
    this.bindSubToolbar();
    this.bindModeSwitcher();
    this.bindProjectTitle();
    this.bindInlineTextEditing();

    this.core.on('historyChanged', ({ canUndo, canRedo }) => {
      const undoBtn = this.root.getElementById('btn-undo');
      const redoBtn = this.root.getElementById('btn-redo');
      if (undoBtn) undoBtn.disabled = !canUndo;
      if (redoBtn) redoBtn.disabled = !canRedo;
    });

    this.core.on('projectNameChanged', ({ name }) => {
      const titleInput = this.root.getElementById('project-title-input');
      if (titleInput && titleInput.value !== name) {
        titleInput.value = name;
      }
    });

    this.core.on('dataChanged', () => {
      this.updateSaveStatus(false);
    });

    this.core.on('modeChanged', ({ newMode }) => {
      this.handleModeChanged(newMode);
    });
  }

  updateSaveStatus(isSaved) {
    const statusBox = this.root.querySelector('.project-save-status');
    const statusText = this.root.getElementById('status-text');
    if (statusBox && statusText) {
      if (isSaved) {
        statusBox.classList.add('is-saved');
        statusText.textContent = 'Kaydedildi';
      } else {
        statusBox.classList.remove('is-saved');
        statusText.textContent = 'Kaydedilmedi';
      }
    }
  }

  bindHeaderActions() {
    // 1. Yeni Proje
    const btnNew = this.root.getElementById('btn-new-project');
    if (btnNew) {
      btnNew.onclick = () => {
        if (confirm('Yeni bir proje başlatmak istiyor musunuz? Kaydedilmemiş değişiklikler kaybolabilir.')) {
          const newProj = window.DND.SAMPLE_PROJECTS['matching'] || this.core.createDefaultProject('matching', 'Kavram ve Tanım');
          this.core.loadProject(newProj);
          this.updateSaveStatus(true);
          this.showToast('Yeni proje oluşturuldu.', 'info');
        }
      };
    }

    // 2. Proje Aç (JSON)
    const btnOpen = this.root.getElementById('btn-open-project');
    const fileInput = this.root.getElementById('file-input-project');
    if (btnOpen && fileInput) {
      btnOpen.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target.result);
              this.core.loadProject(parsed);
              this.updateSaveStatus(true);
              this.showToast('Proje başarıyla yüklendi.', 'success');
            } catch (err) {
              alert('Proje dosyası geçersiz: ' + err.message);
            }
          };
          reader.readAsText(file);
        }
        fileInput.value = '';
      };
    }

    // 3. Projeyi Kaydet (JSON İndir)
    const btnSave = this.root.getElementById('btn-save-project');
    if (btnSave) {
      btnSave.onclick = () => {
        const projectData = this.core.getProjectData();
        const jsonStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const safeTitle = (projectData.project.name || 'etkinlik')
          .toLowerCase()
          .replace(/[^a-z0-9ğüşıöç]+/g, '_');

        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.updateSaveStatus(true);
        this.showToast('Proje JSON olarak kaydedildi.', 'success');
      };
    }

    // 4. HTML İndir
    const btnExport = this.root.getElementById('btn-export-html');
    if (btnExport) {
      btnExport.onclick = () => {
        const ok = this.exportManager.exportStandaloneHTML();
        if (ok) {
          this.showToast('Bağımsız HTML etkinliği indirildi!', 'success');
        }
      };
    }
  }

  bindSubToolbar() {
    // Şablonlar Menüsü Aç / Kapa
    const btnTemplates = this.root.getElementById('btn-toggle-templates');
    const menuTemplates = this.root.getElementById('templates-menu');

    if (btnTemplates && menuTemplates) {
      btnTemplates.onclick = (e) => {
        e.stopPropagation();
        const isHidden = menuTemplates.style.display === 'none';
        menuTemplates.style.display = isHidden ? 'flex' : 'none';
      };

      window.addEventListener('click', () => {
        if (menuTemplates) menuTemplates.style.display = 'none';
      }, this.options.signal ? { signal: this.options.signal } : undefined);

      menuTemplates.querySelectorAll('[data-sample]').forEach(item => {
        item.onclick = (e) => {
          e.stopPropagation();
          const sampleKey = item.getAttribute('data-sample');
          const sample = window.DND.SAMPLE_PROJECTS[sampleKey];
          if (sample) {
            this.core.loadProject(sample);
            this.updateSaveStatus(true);
            this.showToast(`"${sample.project.name}" şablonu yüklendi.`, 'success');
          }
          menuTemplates.style.display = 'none';
        };
      });
    }

    // Nesne Ekleme: Metin Kutusu
    const btnAddText = this.root.getElementById('btn-add-text');
    if (btnAddText) {
      btnAddText.onclick = () => {
        const obj = this.objectManager.createObject('text', 'decorative', {
          text: 'Yeni Metin',
          x: 450,
          y: 280,
          width: 220,
          height: 54,
          fontSize: 16,
          fontWeight: '600',
          backgroundColor: '#ffffff',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 12
        });
        this.selectionManager.select(obj.id);
      };
    }

    // Nesne Ekleme: Dikdörtgen / Kart
    const btnAddRect = this.root.getElementById('btn-add-rect');
    if (btnAddRect) {
      btnAddRect.onclick = () => {
        const obj = this.objectManager.createObject('rectangle', 'decorative', {
          text: 'Kavram Kartı',
          x: 420,
          y: 240,
          width: 240,
          height: 60,
          fontSize: 15,
          fontWeight: '600',
          backgroundColor: '#ffffff',
          borderColor: '#f97316',
          borderWidth: 2,
          borderRadius: 12
        });
        this.selectionManager.select(obj.id);
      };
    }

    // Nesne Ekleme: Daire
    const btnAddCircle = this.root.getElementById('btn-add-circle');
    if (btnAddCircle) {
      btnAddCircle.onclick = () => {
        const obj = this.objectManager.createObject('circle', 'decorative', {
          x: 480,
          y: 240,
          width: 100,
          height: 100,
          borderRadius: 9999,
          backgroundColor: '#eff6ff',
          borderColor: '#2563eb',
          borderWidth: 2
        });
        this.selectionManager.select(obj.id);
      };
    }

    // Nesne Ekleme: Görsel Yükle
    const btnAddImage = this.root.getElementById('btn-add-image');
    const imageInput = this.root.getElementById('file-input-image');
    if (btnAddImage && imageInput) {
      btnAddImage.onclick = () => imageInput.click();
      imageInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) {
            alert('Lütfen geçerli bir görsel dosyası seçin.');
            return;
          }
          const task = (async () => {
            const uploaded = typeof this.options.uploadImage === 'function'
              ? await this.options.uploadImage(file, { signal: this.options.signal })
              : null;
            const dataUrl = uploaded?.url || await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.onerror = () => reject(reader.error || new Error('Görsel okunamadı.'));
              reader.readAsDataURL(file);
            });
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
              img.src = dataUrl;
            });
              let w = img.width, h = img.height;
              const maxDim = 320;
              if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                else { w = Math.round((w * maxDim) / h); h = maxDim; }
              }
              const obj = this.objectManager.createObject('image', 'decorative', {
                name: file.name.split('.')[0] || 'Görsel',
                src: dataUrl,
                x: 400,
                y: 200,
                width: w,
                height: h,
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0
              });
              this.selectionManager.select(obj.id);
          })().catch((error) => {
            this.showToast(error.message || 'Görsel yüklenemedi.', 'error');
            throw error;
          });
          if (typeof this.options.trackTask === 'function') this.options.trackTask(task);
        }
        imageInput.value = '';
      };
    }

    // Çizgi Ekleme (btn-add-target)
    const btnAddTarget = this.root.getElementById('btn-add-target');
    if (btnAddTarget) {
      btnAddTarget.onclick = () => {
        const obj = this.objectManager.createObject('line', 'decorative', {
          x: 400,
          y: 250,
          width: 200,
          height: 24,
          borderColor: '#1e293b',
          borderWidth: 3,
          borderStyle: 'solid'
        });
        this.selectionManager.select(obj.id);
      };
    }

    // Geri Al / İleri Al
    const btnUndo = this.root.getElementById('btn-undo');
    if (btnUndo) btnUndo.onclick = () => this.historyManager.undo();

    const btnRedo = this.root.getElementById('btn-redo');
    if (btnRedo) btnRedo.onclick = () => this.historyManager.redo();

    // Yakınlaştır / Uzaklaştır / Sıfırla
    const btnZoomIn = this.root.getElementById('btn-zoom-in');
    if (btnZoomIn) btnZoomIn.onclick = () => this.stageManager.zoomIn();

    const btnZoomOut = this.root.getElementById('btn-zoom-out');
    if (btnZoomOut) btnZoomOut.onclick = () => this.stageManager.zoomOut();

    const btnZoomReset = this.root.getElementById('btn-zoom-reset');
    if (btnZoomReset) btnZoomReset.onclick = () => this.stageManager.fitToScreen();
  }

  bindModeSwitcher() {
    const modeBtns = this.root.querySelectorAll('.mode-toggle-btn');
    modeBtns.forEach(btn => {
      btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        this.core.setMode(mode);
      };
    });
  }

  handleModeChanged(newMode) {
    this.root.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === newMode);
    });

    if (newMode === 'preview') {
      this.editorContainer.style.display = 'none';
      this.previewContainer.style.display = 'block';

      if (this.activePlayerInstance) {
        this.activePlayerInstance.destroy();
      }

      this.activePlayerInstance = new window.DND.ActivityEngine(
        this.previewContainer,
        this.core.getProjectData(),
        {
          isEmbedded: true,
          onExit: () => {
            this.core.setMode('design');
          }
        }
      );
    } else {
      if (this.activePlayerInstance) {
        this.activePlayerInstance.destroy();
        this.activePlayerInstance = null;
      }

      this.previewContainer.style.display = 'none';
      this.editorContainer.style.display = 'flex';
      this.stageManager.updateScale();
    }
  }

  bindProjectTitle() {
    const titleInput = this.root.getElementById('project-title-input');
    if (titleInput) {
      titleInput.oninput = (e) => {
        this.core.setProjectName(e.target.value);
        this.updateSaveStatus(false);
      };
    }
  }

  // Çift Tıklayarak veya Enter ile Yerinde Metin Düzenleme (Canva / Figma benzeri)
  bindInlineTextEditing() {
    this.isEditingText = false;
    this.activeEditingObjId = null;

    const stage = this.root.getElementById('stage');
    if (!stage) return;

    // 1. Çift Tıklama Olayı (Doğrudan nesneye veya seçim çerçevesine çift tıklandığında)
    stage.addEventListener('dblclick', (e) => {
      if (this.core.getMode() !== 'design') return;

      let objId = null;
      const objEl = e.target.closest('.stage-object');
      if (objEl) {
        objId = objEl.getAttribute('data-id');
      } else if (e.target.closest('.selection-box, .selection-border')) {
        const primary = this.selectionManager.getPrimarySelected();
        if (primary) objId = primary.id;
      }

      if (!objId) return;
      this.startInlineEditing(objId);
    });

    // 2. Çekirdek Olayı Dinleme (Enter tuşu veya MiniToolbar butonundan gelen tetikleme)
    this.core.on('requestInlineTextEdit', (data) => {
      if (data && data.objectId) {
        this.startInlineEditing(data.objectId);
      }
    });

    // 3. Dışarı Tıklamada Düzenlemeyi Tamamlama
    window.addEventListener('pointerdown', (e) => {
      if (!this.isEditingText) return;
      // Eğer tıklama düzenlenen metin kutusu içindeyse veya mini araç çubuğundaysa kapatma
      if (e.target.closest('.is-editing-text') || e.target.closest('#contextual-mini-toolbar')) {
        return;
      }
      this.finishInlineEditing();
    }, this.options.signal ? { capture: true, signal: this.options.signal } : true);
  }

  startInlineEditing(objId) {
    const obj = this.objectManager.getObject(objId);
    if (!obj || obj.locked || obj.type === 'line') return;

    // Zaten bu nesne düzenleniyorsa tekrar başlatma
    if (this.isEditingText && this.activeEditingObjId === objId) return;
    if (this.isEditingText) {
      this.finishInlineEditing();
    }

    const objEl = this.root.querySelector(`.stage-object[data-id="${objId}"]`);
    if (!objEl) return;

    const contentEl = objEl.querySelector('.object-inner-content');
    if (!contentEl) return;

    // Hedef metin öğesini bul veya oluştur
    let targetEl = objEl.querySelector('.object-text-span, .image-caption, .category-header, .sequence-slot-label');
    if (!targetEl) {
      targetEl = document.createElement('span');
      targetEl.className = 'object-text-span';
      targetEl.style.width = '100%';
      targetEl.style.display = 'block';
      targetEl.style.textAlign = obj.textAlign || 'center';
      targetEl.textContent = obj.text || '';
      contentEl.appendChild(targetEl);
    }

    this.isEditingText = true;
    this.activeEditingObjId = objId;

    objEl.classList.add('is-editing-text');
    targetEl.classList.add('is-editing-text-target');
    targetEl.contentEditable = 'true';
    targetEl.spellcheck = false;

    // Seçim kutusunu düzenleme moduna al (tıklamaları metne geçir)
    if (this.selectionManager && this.selectionManager.selectionOverlay) {
      this.selectionManager.selectionOverlay.classList.add('is-editing-text');
    }

    // Odaklan ve tüm metni seç
    targetEl.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(targetEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {
      // Güvenli devam
    }

    // Klavye kısayolları
    targetEl.onkeydown = (ke) => {
      if (ke.key === 'Escape') {
        ke.preventDefault();
        this.finishInlineEditing();
      } else if (ke.key === 'Enter' && (ke.ctrlKey || ke.metaKey)) {
        ke.preventDefault();
        this.finishInlineEditing();
      }
    };
  }

  finishInlineEditing() {
    if (!this.isEditingText || !this.activeEditingObjId) return;

    const objId = this.activeEditingObjId;
    const obj = this.objectManager.getObject(objId);
    this.isEditingText = false;
    this.activeEditingObjId = null;

    const objEl = this.root.querySelector(`.stage-object[data-id="${objId}"]`);
    if (objEl) {
      objEl.classList.remove('is-editing-text');
      const targetEl = objEl.querySelector('.is-editing-text-target') ||
                       objEl.querySelector('.object-text-span, .image-caption, .category-header, .sequence-slot-label');

      if (targetEl) {
        targetEl.contentEditable = 'false';
        targetEl.classList.remove('is-editing-text-target');
        targetEl.onkeydown = null;

        // Metin içeriğini temizleyip güncelle
        let rawText = targetEl.innerText !== undefined ? targetEl.innerText : targetEl.textContent;
        // Sondaki gereksiz fazladan boşluk veya satırları normalize et
        let newText = rawText.replace(/\r\n/g, '\n').replace(/\n+$/, '');

        if (obj && obj.text !== newText) {
          this.objectManager.updateObject(objId, { text: newText });
        }
      }
    }

    // Seçim kutusunu normale döndür
    if (this.selectionManager && this.selectionManager.selectionOverlay) {
      this.selectionManager.selectionOverlay.classList.remove('is-editing-text');
      this.selectionManager.updateSelectionBox();
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    let toast = this.root.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      (this.root.body || this.root).appendChild(toast);
    }

    toast.className = `app-toast toast-${type} is-visible`;
    toast.textContent = message;

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, duration);
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.UIManager = UIManager;

/**
 * SampleProjects - 4 temel etkinlik türü için hazır, yüksek kaliteli ve
 * görsel olarak zengin örnek projeler.
 */

// SVG Vektör Görsel Üreteçleri (Data URL)
function createSvgDataUrl(svgString) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim());
}

// 1. İnsan Anatomisi Vektör Görseli
const humanBodySvg = createSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 550" width="400" height="550">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fdba74" />
    </linearGradient>
    <linearGradient id="organGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fda4af" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
    <linearGradient id="lungGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>

  <!-- Kafa ve Boyun -->
  <circle cx="200" cy="70" r="45" fill="url(#bodyGrad)" stroke="#ea580c" stroke-width="2" />
  <rect x="188" y="110" width="24" height="30" fill="url(#bodyGrad)" />

  <!-- Gövde -->
  <path d="M 140 140 C 130 180, 125 240, 135 340 C 140 390, 150 430, 200 430 C 250 430, 260 390, 265 340 C 275 240, 270 180, 260 140 Z" fill="url(#bodyGrad)" stroke="#ea580c" stroke-width="2" />

  <!-- Omuzlar ve Kollar (Kısa) -->
  <path d="M 140 140 C 100 170, 90 230, 95 300" stroke="#fed7aa" stroke-width="26" stroke-linecap="round" fill="none" />
  <path d="M 260 140 C 300 170, 310 230, 305 300" stroke="#fed7aa" stroke-width="26" stroke-linecap="round" fill="none" />

  <!-- Beyin Şematik Çizgisi -->
  <path d="M 180 65 Q 200 45 220 65 Q 210 85 190 85 Z" fill="#fbcfe8" stroke="#db2777" stroke-width="1.5" opacity="0.85" />

  <!-- Akciğerler Şematik -->
  <path d="M 160 180 C 145 200, 150 250, 175 250 C 185 240, 185 200, 175 180 Z" fill="url(#lungGrad)" stroke="#0284c7" stroke-width="1.5" opacity="0.9" />
  <path d="M 240 180 C 255 200, 250 250, 225 250 C 215 240, 215 200, 225 180 Z" fill="url(#lungGrad)" stroke="#0284c7" stroke-width="1.5" opacity="0.9" />

  <!-- Kalp Şematik -->
  <path d="M 200 215 C 190 200, 175 210, 185 230 L 200 245 L 215 230 C 225 210, 210 200, 200 215 Z" fill="url(#organGrad)" stroke="#be123c" stroke-width="1.5" />

  <!-- Karaciğer Şematik -->
  <path d="M 175 270 C 160 275, 170 305, 205 305 C 220 295, 215 270, 195 270 Z" fill="#ca8a04" stroke="#a16207" stroke-width="1.5" opacity="0.85" />

  <!-- Mide Şematik -->
  <path d="M 210 275 C 235 280, 240 320, 215 330 C 195 330, 200 295, 210 275 Z" fill="#fb923c" stroke="#c2410c" stroke-width="1.5" opacity="0.9" />
</svg>
`);

// 2. Hayvan İkonları
const lionSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#fef08a"/><circle cx="50" cy="50" r="30" fill="#f59e0b"/><circle cx="40" cy="46" r="4" fill="#1e293b"/><circle cx="60" cy="46" r="4" fill="#1e293b"/><polygon points="46,55 54,55 50,60" fill="#78350f"/><path d="M 45 64 Q 50 68 55 64" stroke="#78350f" stroke-width="2" fill="none"/><text x="50" y="88" font-size="12" font-family="sans-serif" font-weight="bold" fill="#78350f" text-anchor="middle">ASLAN</text></svg>`);
const penguinSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="32" ry="42" fill="#0f172a"/><ellipse cx="50" cy="54" rx="22" ry="30" fill="#ffffff"/><circle cx="42" cy="38" r="3.5" fill="#0f172a"/><circle cx="58" cy="38" r="3.5" fill="#0f172a"/><polygon points="46,45 54,45 50,54" fill="#f97316"/><ellipse cx="36" cy="88" rx="8" ry="4" fill="#f97316"/><ellipse cx="64" cy="88" rx="8" ry="4" fill="#f97316"/><text x="50" y="24" font-size="11" font-family="sans-serif" font-weight="bold" fill="#38bdf8" text-anchor="middle">PENGUEN</text></svg>`);
const dolphinSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 20 65 Q 40 25 75 35 Q 85 45 80 55 Q 60 55 35 70 Z" fill="#0284c7"/><polygon points="75,35 90,20 85,38" fill="#0284c7"/><polygon points="48,32 54,18 58,34" fill="#0369a1"/><circle cx="32" cy="52" r="3" fill="#ffffff"/><circle cx="31" cy="52" r="1.5" fill="#0f172a"/><text x="50" y="90" font-size="12" font-family="sans-serif" font-weight="bold" fill="#0284c7" text-anchor="middle">YUNUS</text></svg>`);
const eagleSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#78350f"/><circle cx="50" cy="40" r="26" fill="#f8fafc"/><circle cx="42" cy="38" r="3.5" fill="#ca8a04"/><polygon points="45,44 55,44 50,58" fill="#eab308"/><text x="50" y="88" font-size="12" font-family="sans-serif" font-weight="bold" fill="#fef08a" text-anchor="middle">KARTAL</text></svg>`);

// 3. Yaşam Döngüsü İkonları (Kelebek)
const eggSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="65" rx="35" ry="18" fill="#84cc16"/><ellipse cx="48" cy="48" rx="14" ry="18" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/><circle cx="48" cy="42" r="3" fill="#ffffff"/><text x="50" y="92" font-size="11" font-family="sans-serif" font-weight="bold" fill="#365314" text-anchor="middle">1. YUMURTA</text></svg>`);
const caterpillarSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="25" cy="55" r="14" fill="#22c55e"/><circle cx="45" cy="50" r="14" fill="#16a34a"/><circle cx="65" cy="55" r="14" fill="#15803d"/><circle cx="80" cy="45" r="15" fill="#84cc16"/><circle cx="76" cy="40" r="2.5" fill="#000"/><circle cx="84" cy="40" r="2.5" fill="#000"/><text x="50" y="92" font-size="11" font-family="sans-serif" font-weight="bold" fill="#14532d" text-anchor="middle">2. TIRTIL</text></svg>`);
const chrysalisSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="46" y="10" width="8" height="25" fill="#78350f"/><path d="M 50 35 C 30 50, 35 75, 50 90 C 65 75, 70 50, 50 35 Z" fill="#84cc16" stroke="#4d7c0f" stroke-width="2"/><text x="50" y="96" font-size="11" font-family="sans-serif" font-weight="bold" fill="#365314" text-anchor="middle">3. KOZA</text></svg>`);
const butterflySvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 50 50 C 20 20, 10 50, 30 70 C 40 80, 48 65, 50 55 Z" fill="#ec4899"/><path d="M 50 50 C 80 20, 90 50, 70 70 C 60 80, 52 65, 50 55 Z" fill="#3b82f6"/><ellipse cx="50" cy="52" rx="4" ry="18" fill="#1e293b"/><text x="50" y="94" font-size="11" font-family="sans-serif" font-weight="bold" fill="#1e293b" text-anchor="middle">4. KELEBEK</text></svg>`);

const SAMPLE_PROJECTS = {
  // 1. ETKİNLİK: GÖRSEL ÜZERİNDE ETİKETLEME (ORGANLAR)
  'image-labeling': {
    version: '1.0',
    project: {
      id: 'proj_sample_labeling',
      name: 'İnsan Vücudundaki Organlar',
      activityType: 'image-labeling',
      description: 'Organ etiketlerini insan vücudu üzerindeki doğru konumlara yerleştirin.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#f8fafc',
      backgroundImage: null
    },
    objects: [
      // Başlık ve Açıklama
      {
        id: 'title_1',
        name: 'Ana Başlık',
        type: 'text',
        role: 'decorative',
        x: 40,
        y: 30,
        width: 440,
        height: 50,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'İnsan Vücudu ve Organlarımız',
        fontSize: 26,
        fontWeight: '800',
        textColor: '#0f172a',
        textAlign: 'left',
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },
      {
        id: 'desc_1',
        name: 'Açıklama',
        type: 'text',
        role: 'decorative',
        x: 40,
        y: 80,
        width: 440,
        height: 35,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Sağ taraftaki organ etiketlerini vücut üzerindeki doğru hedef kutucuklarına sürükleyin.',
        fontSize: 14,
        fontWeight: '500',
        textColor: '#64748b',
        textAlign: 'left',
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },

      // Ana Anatomi Görseli (Ortada)
      {
        id: 'bg_anatomy',
        name: 'Anatomi Çizimi',
        type: 'image',
        role: 'decorative',
        x: 410,
        y: 80,
        width: 380,
        height: 530,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        src: humanBodySvg,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
      },

      // Hedef Noktaları (Görsel Üzerinde)
      {
        id: 'target_brain',
        name: 'Hedef: Beyin',
        type: 'zone',
        role: 'target',
        x: 540,
        y: 120,
        width: 120,
        height: 44,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Baş Bölgesi',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#3b82f6',
        backgroundColor: 'rgba(239, 246, 255, 0.75)',
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        id: 'target_lungs',
        name: 'Hedef: Akciğerler',
        type: 'zone',
        role: 'target',
        x: 430,
        y: 250,
        width: 130,
        height: 48,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Göğüs',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#0284c7',
        backgroundColor: 'rgba(240, 249, 255, 0.75)',
        borderColor: '#0284c7',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        id: 'target_heart',
        name: 'Hedef: Kalp',
        type: 'zone',
        role: 'target',
        x: 640,
        y: 270,
        width: 120,
        height: 48,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Kalp',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#e11d48',
        backgroundColor: 'rgba(255, 241, 242, 0.75)',
        borderColor: '#e11d48',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        id: 'target_stomach',
        name: 'Hedef: Mide',
        type: 'zone',
        role: 'target',
        x: 610,
        y: 360,
        width: 120,
        height: 48,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Karın',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#ea580c',
        backgroundColor: 'rgba(255, 247, 237, 0.75)',
        borderColor: '#ea580c',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },

      // Sürüklenebilir Etiketler (Sağ Panelde)
      {
        id: 'drag_brain',
        name: 'Etiket: Beyin',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 130,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '🧠 Beyin',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      },
      {
        id: 'drag_lungs',
        name: 'Etiket: Akciğerler',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 200,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '🫁 Akciğerler',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      },
      {
        id: 'drag_heart',
        name: 'Etiket: Kalp',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 270,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '❤️ Kalp',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      },
      {
        id: 'drag_stomach',
        name: 'Etiket: Mide',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 340,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '🥘 Mide',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      }
    ],
    answerKey: {
      'drag_brain': 'target_brain',
      'drag_lungs': 'target_lungs',
      'drag_heart': 'target_heart',
      'drag_stomach': 'target_stomach'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      showTargetsInGame: true,
      completionMessage: 'Mükemmel! Bütün ana organları doğru yerlerine yerleştirdiniz.'
    }
  },

  // 2. ETKİNLİK: SÜRÜKLE-BIRAK EŞLEŞTİRME (KAVRAM VE TANIM)
  'matching': {
    version: '1.0',
    project: {
      id: 'proj_sample_matching',
      name: 'Kavram ve Tanım',
      activityType: 'matching',
      description: 'Kavramları doğru tanımlarla eşleştirin.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#ffffff',
      backgroundImage: null
    },
    objects: [
      // Ana Başlık
      {
        id: 'match_title',
        name: 'Başlık',
        type: 'text',
        role: 'decorative',
        x: 120,
        y: 45,
        width: 500,
        height: 42,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Kavram ve Tanım',
        fontSize: 28,
        fontWeight: '700',
        textColor: '#0f172a',
        textAlign: 'left'
      },
      // Alt Açıklama
      {
        id: 'match_subtitle',
        name: 'Açıklama',
        type: 'text',
        role: 'decorative',
        x: 120,
        y: 92,
        width: 600,
        height: 28,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Kavramları doğru tanımlarla eşleştirin.',
        fontSize: 14,
        fontWeight: '500',
        textColor: '#64748b',
        textAlign: 'left'
      },
      // Dekoratif İnce Ayırıcı Çizgi
      {
        id: 'header_divider',
        name: 'Ayırıcı Çizgi',
        type: 'rectangle',
        role: 'decorative',
        x: 120,
        y: 130,
        width: 960,
        height: 1,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        backgroundColor: '#e2e8f0',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0
      },
      // Kolon 1 Başlığı: KAVRAMLAR
      {
        id: 'col_kavramlar',
        name: 'Sütun Başlığı: Kavramlar',
        type: 'text',
        role: 'decorative',
        x: 120,
        y: 155,
        width: 250,
        height: 24,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'KAVRAMLAR',
        fontSize: 12,
        fontWeight: '700',
        textColor: '#64748b',
        textAlign: 'left'
      },
      // Kolon 2 Başlığı: TANIMLAR
      {
        id: 'col_tanimlar',
        name: 'Sütun Başlığı: Tanımlar',
        type: 'text',
        role: 'decorative',
        x: 520,
        y: 155,
        width: 250,
        height: 24,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'TANIMLAR',
        fontSize: 12,
        fontWeight: '700',
        textColor: '#64748b',
        textAlign: 'left'
      },
      // Sol Sütun: Sürüklenebilir Kavram Kartları (Turuncu Kenarlık)
      {
        id: 'drag_kuvvet',
        name: 'Kavram: Kuvvet',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 195,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Kuvvet',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'drag_enerji',
        name: 'Kavram: Enerji',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 275,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Enerji',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'drag_madde',
        name: 'Kavram: Madde',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 355,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Madde',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'drag_isi',
        name: 'Kavram: Isı',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 435,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Isı',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      // Sağ Sütun: Hedef Tanım Kutuları (Mavi Kenarlık, Açık Mavi Dolgu)
      {
        id: 'target_is',
        name: 'Tanım: İş yapabilme kapasitesi',
        type: 'text',
        role: 'target',
        x: 520,
        y: 195,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'İş yapabilme kapasitesi',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'target_hareket',
        name: 'Tanım: Hareketi değiştirebilen etki',
        type: 'text',
        role: 'target',
        x: 520,
        y: 275,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'Hareketi değiştirebilen etki',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'target_sicaklik',
        name: 'Tanım: Sıcaklık farkıyla aktarılan enerji',
        type: 'text',
        role: 'target',
        x: 520,
        y: 355,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'Sıcaklık farkıyla aktarılan enerji',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'target_kutle',
        name: 'Tanım: Kütlesi ve hacmi olan varlık',
        type: 'text',
        role: 'target',
        x: 520,
        y: 435,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'Kütlesi ve hacmi olan varlık',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      }
    ],
    answerKey: {
      'drag_kuvvet': 'target_hareket',
      'drag_enerji': 'target_is',
      'drag_madde': 'target_kutle',
      'drag_isi': 'target_sicaklik'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      completionMessage: 'Tebrikler! Bütün kavramları doğru tanımlarla eşleştirdiniz.'
    }
  },

  // 3. ETKİNLİK: KATEGORİLERE AYIRMA (MEYVELER VE SEBZELER)
  'categorization': {
    version: '1.0',
    project: {
      id: 'proj_sample_categorization',
      name: 'Meyveler ve Sebzeler',
      activityType: 'categorization',
      description: 'Yiyecekleri Meyveler veya Sebzeler sepetlerine sürükleyerek gruplandırın.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#f8fafc',
      backgroundImage: null
    },
    objects: [
      {
        id: 'cat_title',
        name: 'Başlık',
        type: 'text',
        role: 'decorative',
        x: 60,
        y: 25,
        width: 600,
        height: 45,
        zIndex: 1,
        locked: false,
        visible: true,
        text: '🍎 Besin Grupları: Meyveler ve Sebzeler 🥦',
        fontSize: 24,
        fontWeight: '800',
        textColor: '#0f172a',
        textAlign: 'left'
      },

      // 2 Büyük Kategori Alanı (Sol ve Sağ)
      {
        id: 'cat_fruits',
        name: 'Kategori: Meyveler',
        type: 'zone',
        role: 'category',
        x: 80,
        y: 90,
        width: 380,
        height: 520,
        zIndex: 2,
        locked: false,
        visible: true,
        text: '🍓 Meyveler Sepeti',
        fontSize: 20,
        fontWeight: '800',
        textColor: '#991b1b',
        backgroundColor: '#fff1f2',
        borderColor: '#f43f5e',
        borderStyle: 'dashed',
        borderWidth: 3,
        borderRadius: 20
      },
      {
        id: 'cat_vegetables',
        name: 'Kategori: Sebzeler',
        type: 'zone',
        role: 'category',
        x: 740,
        y: 90,
        width: 380,
        height: 520,
        zIndex: 2,
        locked: false,
        visible: true,
        text: '🥕 Sebzeler Sepeti',
        fontSize: 20,
        fontWeight: '800',
        textColor: '#166534',
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        borderStyle: 'dashed',
        borderWidth: 3,
        borderRadius: 20
      },

      // Ortadaki Sürüklenebilir Öğeler (8 adet)
      { id: 'drag_apple', name: 'Elma', type: 'text', role: 'draggable', x: 510, y: 100, width: 170, height: 50, text: '🍎 Kırmızı Elma', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_carrot', name: 'Havuç', type: 'text', role: 'draggable', x: 510, y: 165, width: 170, height: 50, text: '🥕 Havuç', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_banana', name: 'Muz', type: 'text', role: 'draggable', x: 510, y: 230, width: 170, height: 50, text: '🍌 Sarı Muz', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_broccoli', name: 'Brokoli', type: 'text', role: 'draggable', x: 510, y: 295, width: 170, height: 50, text: '🥦 Taze Brokoli', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_strawberry', name: 'Çilek', type: 'text', role: 'draggable', x: 510, y: 360, width: 170, height: 50, text: '🍓 Çilek', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_eggplant', name: 'Patlıcan', type: 'text', role: 'draggable', x: 510, y: 425, width: 170, height: 50, text: '🍆 Patlıcan', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_orange', name: 'Portakal', type: 'text', role: 'draggable', x: 510, y: 490, width: 170, height: 50, text: '🍊 Sulu Portakal', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_corn', name: 'Mısır', type: 'text', role: 'draggable', x: 510, y: 555, width: 170, height: 50, text: '🌽 Tatlı Mısır', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 }
    ],
    answerKey: {
      'drag_apple': 'cat_fruits',
      'drag_banana': 'cat_fruits',
      'drag_strawberry': 'cat_fruits',
      'drag_orange': 'cat_fruits',
      'drag_carrot': 'cat_vegetables',
      'drag_broccoli': 'cat_vegetables',
      'drag_eggplant': 'cat_vegetables',
      'drag_corn': 'cat_vegetables'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      completionMessage: 'Tebrikler! Bütün meyve ve sebzeleri doğru sepetlere ayırdınız.'
    }
  },

  // 4. ETKİNLİK: SIRALAMA (KELEBEĞİN YAŞAM DÖNGÜSÜ)
  'sequencing': {
    version: '1.0',
    project: {
      id: 'proj_sample_sequencing',
      name: 'Kelebeğin Yaşam Döngüsü',
      activityType: 'sequencing',
      description: 'Kelebeğin oluşum aşamalarını baştan sona doğru sıraya yerleştirin.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#f8fafc',
      backgroundImage: null
    },
    objects: [
      {
        id: 'seq_title',
        name: 'Başlık',
        type: 'text',
        role: 'decorative',
        x: 60,
        y: 40,
        width: 600,
        height: 45,
        zIndex: 1,
        locked: false,
        visible: true,
        text: '🦋 Kelebeğin Yaşam Döngüsünü Sıralayalım',
        fontSize: 26,
        fontWeight: '800',
        textColor: '#0f172a',
        textAlign: 'left'
      },
      {
        id: 'seq_desc',
        name: 'Açıklama',
        type: 'text',
        role: 'decorative',
        x: 60,
        y: 90,
        width: 600,
        height: 30,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Aşağıdaki aşamaları 1. adımdan 4. adıma doğru sırayla kutulara yerleştirin.',
        fontSize: 15,
        fontWeight: '500',
        textColor: '#64748b',
        textAlign: 'left'
      },

      // Üst Bölüm: Sıralama Kutuları (Slots)
      { id: 'slot_1', name: '1. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 0, x: 80, y: 150, width: 220, height: 200, text: '1. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },
      { id: 'slot_2', name: '2. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 1, x: 360, y: 150, width: 220, height: 200, text: '2. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },
      { id: 'slot_3', name: '3. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 2, x: 640, y: 150, width: 220, height: 200, text: '3. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },
      { id: 'slot_4', name: '4. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 3, x: 920, y: 150, width: 220, height: 200, text: '4. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },

      // Alt Bölüm: Karışık Başlayan Aşamalar
      { id: 'drag_step_egg', name: 'Aşama: Yumurta', type: 'image', role: 'draggable', x: 80, y: 410, width: 210, height: 180, src: eggSvg, text: 'Yumurta Evresi', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 },
      { id: 'drag_step_caterpillar', name: 'Aşama: Tırtıl', type: 'image', role: 'draggable', x: 360, y: 410, width: 210, height: 180, src: caterpillarSvg, text: 'Tırtıl (Larva)', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 },
      { id: 'drag_step_chrysalis', name: 'Aşama: Koza', type: 'image', role: 'draggable', x: 640, y: 410, width: 210, height: 180, src: chrysalisSvg, text: 'Krizalit (Koza)', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 },
      { id: 'drag_step_butterfly', name: 'Aşama: Kelebek', type: 'image', role: 'draggable', x: 920, y: 410, width: 210, height: 180, src: butterflySvg, text: 'Yetişkin Kelebek', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 }
    ],
    answerKey: {
      'drag_step_egg': 'slot_1',
      'drag_step_caterpillar': 'slot_2',
      'drag_step_chrysalis': 'slot_3',
      'drag_step_butterfly': 'slot_4'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      completionMessage: 'Harika bir biyologsun! Kelebeğin yaşam evrelerini kusursuz sıraladın.'
    }
  }
};

// Global namespace
window.DND = window.DND || {};
window.DND.SAMPLE_PROJECTS = SAMPLE_PROJECTS;

/**
 * Direct-mount editor API for SPA integrations. The build bundles the legacy
 * editor classes before this module and injects the editor CSS into EDITOR_CSS.
 */
const EDITOR_CSS = "/* ==========================================================================\n   EDITOR CSS - DND Minimalist Aray\u00fcz & Ba\u011flamsal Mini Ara\u00e7 \u00c7ubu\u011fu\n   Sa\u011f ve sol yan paneller kald\u0131r\u0131lm\u0131\u015f, tam ekran tuval d\u00fczeni.\n   ========================================================================== */\n\n.dnd-editor-root {\n  --primary: #2563eb;\n  --primary-hover: #1d4ed8;\n  --primary-light: #eff6ff;\n  --primary-border: #bfdbfe;\n\n  --success: #10b981;\n  --success-light: #ecfdf5;\n  --danger: #ef4444;\n  --danger-light: #fef2f2;\n  --warning: #f59e0b;\n  --warning-light: #fffbeb;\n\n  --bg-app: #f8fafc;\n  --bg-surface: #ffffff;\n  --bg-workspace: #f1f5f9;\n\n  --border-color: #e2e8f0;\n  --border-subtle: #f1f5f9;\n\n  --text-main: #0f172a;\n  --text-muted: #64748b;\n  --text-light: #94a3b8;\n\n  --radius-sm: 6px;\n  --radius-md: 10px;\n  --radius-lg: 14px;\n  --radius-full: 9999px;\n\n  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);\n  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);\n  --shadow-lg: 0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04);\n  --shadow-popup: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04);\n}\n\n*, *::before, *::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n.dnd-editor-root {\n  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n  background-color: var(--bg-workspace);\n  color: var(--text-main);\n  height: 100vh;\n  width: 100vw;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n}\n\n/* ==========================================\n   1. \u00dcST BA\u015eLIK SATIRI (TOP HEADER)\n   ========================================== */\n.app-top-header {\n  height: 58px;\n  background-color: var(--bg-surface);\n  border-bottom: 1px solid var(--border-color);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 24px;\n  z-index: 50;\n  transition: opacity 0.2s ease, transform 0.2s ease;\n}\n\n/* G\u00f6m\u00fcl\u00fc Mod (Embedded Mode): Ba\u015fka uygulamalara entegre edildi\u011finde header gizlenir */\n.dnd-editor-root.is-embedded .app-top-header {\n  display: none !important;\n}\n\n.dnd-editor-root.is-embedded {\n  min-height: 0;\n}\n\n.dnd-editor-root.is-embedded .editor-workspace {\n  flex: 1 1 0;\n  height: auto;\n  min-height: 0;\n}\n\n.top-header-left {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n}\n\n.app-brand-icon {\n  width: 36px;\n  height: 36px;\n  border-radius: var(--radius-md);\n  background: #eff6ff;\n  border: 1px solid var(--primary-border);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.header-titles-box {\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n}\n\n.app-subtitle {\n  font-size: 0.65rem;\n  font-weight: 700;\n  color: var(--text-muted);\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n}\n\n.project-title-row {\n  display: flex;\n  align-items: center;\n}\n\n.project-title-input {\n  border: none;\n  background: transparent;\n  font-size: 1.02rem;\n  font-weight: 700;\n  color: var(--text-main);\n  outline: none;\n  width: 260px;\n  padding: 0;\n  font-family: inherit;\n}\n\n.project-title-input:hover,\n.project-title-input:focus {\n  color: var(--primary);\n}\n\n.project-save-status {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  font-size: 0.72rem;\n  font-weight: 600;\n  color: var(--text-muted);\n}\n\n.status-dot {\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background-color: var(--warning);\n}\n\n.project-save-status.is-saved .status-dot {\n  background-color: var(--success);\n}\n\n.top-header-right {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.top-icon-btn {\n  width: 38px;\n  height: 38px;\n  border-radius: var(--radius-md);\n  border: 1px solid var(--border-color);\n  background: var(--bg-surface);\n  color: var(--text-main);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.top-icon-btn:hover {\n  background: var(--bg-app);\n  border-color: #cbd5e1;\n  color: var(--primary);\n}\n\n.top-primary-save-btn {\n  height: 38px;\n  padding: 0 18px;\n  border-radius: var(--radius-md);\n  border: none;\n  background: var(--primary);\n  color: #ffffff;\n  font-size: 0.88rem;\n  font-weight: 700;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  cursor: pointer;\n  transition: all 0.15s ease;\n  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);\n}\n\n.top-primary-save-btn:hover {\n  background: var(--primary-hover);\n  transform: translateY(-1px);\n}\n\n/* ==========================================\n   2. \u0130K\u0130NC\u0130L ARA\u00c7 \u00c7UBU\u011eU (SECONDARY TOOLBAR)\n   ========================================== */\n.app-sub-toolbar {\n  height: 48px;\n  background-color: var(--bg-surface);\n  border-bottom: 1px solid var(--border-color);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 24px;\n  z-index: 40;\n}\n\n.sub-toolbar-cluster {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.mode-pill-group {\n  display: flex;\n  align-items: center;\n  background: #f1f5f9;\n  padding: 3px;\n  border-radius: var(--radius-full);\n  gap: 2px;\n}\n\n.mode-toggle-btn {\n  width: 32px;\n  height: 32px;\n  border-radius: var(--radius-full);\n  border: none;\n  background: transparent;\n  color: var(--text-muted);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.mode-toggle-btn:hover {\n  color: var(--text-main);\n}\n\n.mode-toggle-btn.active {\n  background: #ffffff;\n  color: var(--primary);\n  box-shadow: var(--shadow-sm);\n}\n\n.sub-tool-btn {\n  width: 34px;\n  height: 34px;\n  border-radius: var(--radius-md);\n  border: 1px solid transparent;\n  background: transparent;\n  color: #475569;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.sub-tool-btn:hover:not(:disabled) {\n  background: #f1f5f9;\n  color: var(--text-main);\n}\n\n.sub-tool-btn.active {\n  background: #eff6ff;\n  border-color: var(--primary-border);\n  color: var(--primary);\n}\n\n.sub-tool-btn:disabled {\n  opacity: 0.35;\n  cursor: not-allowed;\n}\n\n.sub-divider {\n  width: 1px;\n  height: 20px;\n  background-color: var(--border-color);\n  margin: 0 4px;\n}\n\n/* \u015eablon A\u00e7\u0131l\u0131r Men\u00fcs\u00fc */\n.template-dropdown-wrapper {\n  position: relative;\n}\n\n.templates-menu {\n  position: absolute;\n  top: 42px;\n  left: 0;\n  background: #ffffff;\n  border: 1px solid var(--border-color);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-popup);\n  padding: 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 280px;\n  z-index: 1000;\n}\n\n.menu-title {\n  font-size: 0.72rem;\n  font-weight: 700;\n  color: var(--text-muted);\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  padding: 6px 10px;\n}\n\n.template-menu-item {\n  width: 100%;\n  text-align: left;\n  background: transparent;\n  border: none;\n  padding: 8px 12px;\n  border-radius: var(--radius-sm);\n  font-size: 0.82rem;\n  font-weight: 600;\n  color: var(--text-main);\n  cursor: pointer;\n  transition: background 0.15s ease;\n}\n\n.template-menu-item:hover {\n  background: #eff6ff;\n  color: var(--primary);\n}\n\n/* ==========================================\n   3. \u00c7ALI\u015eMA ALANI (FULL CANVAS WORKSPACE)\n   ========================================== */\n.editor-workspace {\n  flex: 1 1 0%;\n  min-height: 0;\n  width: 100%;\n  background-color: var(--bg-workspace);\n  position: relative;\n  overflow: hidden;\n  display: flex;\n}\n\n.stage-viewport {\n  width: 100%;\n  height: 100%;\n  flex: 1 1 0%;\n  position: relative;\n  overflow: auto;\n  overscroll-behavior: contain;\n  touch-action: pan-x pan-y;\n  scrollbar-width: thin;\n  scrollbar-color: rgba(148, 163, 184, 0.45) transparent;\n}\n\n/* Modern \u0130nce Scrollbar (Webkit) */\n.stage-viewport::-webkit-scrollbar {\n  width: 10px;\n  height: 10px;\n}\n\n.stage-viewport::-webkit-scrollbar-track {\n  background: transparent;\n}\n\n.stage-viewport::-webkit-scrollbar-thumb {\n  background-color: rgba(148, 163, 184, 0.35);\n  border-radius: 9999px;\n  border: 2px solid transparent;\n  background-clip: padding-box;\n  transition: background-color 0.2s ease;\n}\n\n.stage-viewport::-webkit-scrollbar-thumb:hover {\n  background-color: rgba(100, 116, 139, 0.65);\n}\n\n.stage-viewport::-webkit-scrollbar-corner {\n  background: transparent;\n}\n\n/* Sahne Kapsay\u0131c\u0131 ve \u00d6l\u00e7ekleyici (Scroll & Center Mimari) */\n.stage-container {\n  min-width: 100%;\n  min-height: 100%;\n  width: max-content;\n  height: max-content;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 40px;\n  box-sizing: border-box;\n  position: relative;\n}\n\n.stage-scaler {\n  position: relative;\n  flex-shrink: 0;\n  margin: auto;\n  border-radius: 16px;\n  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04);\n}\n\n/* ==========================================\n   4. BA\u011eLAMSAL M\u0130N\u0130 ARA\u00c7 \u00c7UBU\u011eU (MINI TOOLBAR)\n   ========================================== */\n.mini-toolbar-container {\n  position: fixed;\n  z-index: 9999;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  pointer-events: auto;\n  user-select: none;\n}\n\n.mini-toolbar-pill {\n  display: flex;\n  align-items: center;\n  gap: 3px;\n  background: #ffffff;\n  border: 1px solid var(--border-color);\n  border-radius: var(--radius-lg);\n  padding: 5px 8px;\n  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04);\n  width: 252px;\n  min-width: 252px;\n  box-sizing: border-box;\n  justify-content: space-between;\n}\n\n.mini-toolbar-pill.line-mini-toolbar-pill {\n  width: 252px;\n  min-width: 252px;\n  box-sizing: border-box;\n  justify-content: center;\n  gap: 14px;\n}\n\n.mini-toolbar-pill.is-multi {\n  width: max-content;\n  min-width: 252px;\n  justify-content: flex-start;\n  gap: 3px;\n}\n\n.mt-btn {\n  width: 32px;\n  height: 32px;\n  border-radius: var(--radius-md);\n  border: 1px solid transparent;\n  background: transparent;\n  color: #475569;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.mt-btn:hover {\n  background: #f1f5f9;\n  color: #0f172a;\n}\n\n.mt-btn.active {\n  background: #f1f5f9;\n  border-color: #cbd5e1;\n  color: #0f172a;\n  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);\n}\n\n.mt-btn-danger:hover {\n  background: #fef2f2;\n  color: var(--danger);\n}\n\n.mt-text-icon {\n  font-size: 0.95rem;\n  font-weight: 800;\n  letter-spacing: -0.05em;\n}\n\n.mt-divider {\n  width: 1px;\n  height: 18px;\n  background: var(--border-color);\n  margin: 0 4px;\n}\n\n/* ==========================================\n   5. POPUP KARTLARI (ROLES, STYLE, TEXT, ETC)\n   ========================================== */\n.mini-toolbar-container.placement-above {\n  flex-direction: column-reverse;\n}\n\n.mini-toolbar-container.placement-above .mt-popup-card {\n  margin-top: 0;\n  margin-bottom: 8px;\n}\n\n.mini-toolbar-container.placement-above .mt-popup-card.is-opening {\n  animation: popupSlideUp 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);\n}\n\n@keyframes popupSlideUp {\n  from { opacity: 0; transform: translateY(6px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.mt-popup-card {\n  margin-top: 8px;\n  background: #ffffff;\n  border: 1px solid var(--border-color);\n  border-radius: var(--radius-lg);\n  padding: 14px 16px;\n  box-shadow: var(--shadow-popup);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  min-width: 250px;\n  width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  max-height: calc(100vh - 180px);\n  overflow-y: auto;\n  scrollbar-width: thin;\n}\n\n.mt-popup-card.is-opening {\n  animation: popupSlideDown 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);\n}\n\n@keyframes popupSlideDown {\n  from { opacity: 0; transform: translateY(-6px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n/* Minimalist ve kayd\u0131rma \u00e7ubu\u011fuz ortak popup kart taban\u0131 */\n.mt-popup-card {\n  padding: 10px 12px;\n  gap: 8px;\n  box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04);\n  scrollbar-width: none !important;\n  -ms-overflow-style: none !important;\n  overflow: hidden;\n}\n\n.mt-popup-card::-webkit-scrollbar {\n  display: none !important;\n  width: 0 !important;\n  height: 0 !important;\n}\n\n.mt-popup-title,\n.mt-line-popup-title,\n.mt-palette-header {\n  font-size: 0.72rem;\n  font-weight: 600;\n  color: #64748b;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  margin: 0;\n  user-select: none;\n}\n\n/* \u00c7izgi \u00d6zel Mini Toolbar ve Popup Kart\u0131 */\n.mt-line-popup {\n  width: 252px;\n  min-width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  padding: 10px 12px;\n  gap: 8px;\n  border-radius: var(--radius-lg);\n  background: #ffffff;\n  box-shadow: var(--shadow-popup);\n  border: 1px solid var(--border-color);\n}\n\n.mt-line-popup-section {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.mt-line-pill-group {\n  display: flex;\n  align-items: center;\n  background: #f1f5f9;\n  border-radius: 8px;\n  padding: 2.5px;\n  gap: 2px;\n  justify-content: space-between;\n}\n\n.mt-line-type-btn {\n  flex: 1;\n  height: 30px;\n  border-radius: 6px;\n  border: none;\n  background: transparent;\n  color: #64748b;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n.mt-line-type-btn:hover {\n  color: #0f172a;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n.mt-line-type-btn.active {\n  background: #ffffff;\n  color: #0f172a;\n  font-weight: 600;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.mt-line-align-btn,\n.mt-line-arrow-btn {\n  flex: 1;\n  height: 30px;\n  border-radius: 6px;\n  border: none;\n  background: transparent;\n  color: #64748b;\n  font-size: 0.78rem;\n  font-weight: 500;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 4px;\n  cursor: pointer;\n  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n.mt-line-align-btn:hover,\n.mt-line-arrow-btn:hover {\n  color: #0f172a;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n.mt-line-align-btn.active,\n.mt-line-arrow-btn.active {\n  background: #ffffff;\n  color: #0f172a;\n  font-weight: 600;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.mt-line-group-divider {\n  width: 1px;\n  height: 16px;\n  background-color: #cbd5e1;\n  margin: 0 2px;\n}\n\n.mt-popup-header-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n}\n\n.mt-inline-edit-btn {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  background: #f1f5f9;\n  border: 1px solid #e2e8f0;\n  border-radius: 6px;\n  padding: 2px 7px;\n  font-size: 0.74rem;\n  font-weight: 500;\n  color: #475569;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.mt-inline-edit-btn:hover {\n  background: #ffffff;\n  border-color: #cbd5e1;\n  color: #0f172a;\n}\n\n.mt-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.mt-pill-group {\n  display: flex;\n  align-items: center;\n  background: #f1f5f9;\n  border-radius: 8px;\n  padding: 2.5px;\n  gap: 2px;\n  box-sizing: border-box;\n}\n\n.mt-role-btn {\n  padding: 5px 12px;\n  border-radius: 6px;\n  border: none;\n  background: transparent;\n  font-size: 0.8rem;\n  font-weight: 500;\n  color: #64748b;\n  cursor: pointer;\n  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.mt-role-btn:hover {\n  color: #0f172a;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n.mt-role-btn.active {\n  background: #ffffff;\n  color: #0f172a;\n  font-weight: 600;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.mt-role-popup {\n  width: 252px;\n  min-width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  padding: 10px 12px;\n  gap: 8px;\n}\n\n.mt-role-popup .mt-pill-group {\n  width: 100%;\n  box-sizing: border-box;\n  display: flex;\n}\n\n.mt-role-popup .mt-role-btn {\n  flex: 1;\n  text-align: center;\n  padding: 5px 2px;\n}\n\n/* Kenarl\u0131k ve G\u00f6r\u00fcn\u00fcm Kontrolleri */\n.mt-border-style-row {\n  justify-content: space-between;\n}\n\n.mt-icon-btn {\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n  border: none;\n  background: transparent;\n  color: #64748b;\n  font-size: 0.85rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);\n  user-select: none;\n}\n\n.mt-icon-btn:hover {\n  color: #0f172a;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n.mt-icon-btn.active {\n  background: #ffffff;\n  color: #0f172a;\n  font-weight: 600;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.mt-icon-btn:disabled,\n.mt-icon-btn[disabled] {\n  opacity: 0.35;\n  cursor: not-allowed;\n  pointer-events: none;\n}\n\n.mt-color-target-toggle {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.mt-target-chip {\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n  border: 1.5px solid transparent;\n  background: #f1f5f9;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.mt-target-chip:hover {\n  background: #e2e8f0;\n}\n\n.mt-target-chip.active {\n  background: #ffffff;\n  border-color: #0f172a;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.chip-preview-border {\n  width: 14px;\n  height: 14px;\n  border-radius: 3px;\n  border: 2px solid #3b82f6;\n  background: transparent;\n}\n\n.chip-preview-fill {\n  width: 14px;\n  height: 14px;\n  border-radius: 3px;\n  background: #3b82f6;\n}\n\n.mt-stepper-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.mt-stepper-group {\n  display: flex;\n  align-items: center;\n  background: #f1f5f9;\n  border-radius: 8px;\n  padding: 2.5px 5px;\n  gap: 2px;\n  box-sizing: border-box;\n}\n\n.mt-stepper-label-icon {\n  font-size: 0.82rem;\n  font-weight: 600;\n  color: #94a3b8;\n  padding: 0 3px;\n  user-select: none;\n}\n\n.mt-step-btn {\n  width: 22px;\n  height: 22px;\n  border-radius: 5px;\n  border: none;\n  background: transparent;\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: #64748b;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 1;\n  transition: all 0.15s ease;\n  user-select: none;\n}\n\n.mt-step-btn:hover {\n  background: #ffffff;\n  color: #0f172a;\n  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);\n}\n\n.mt-step-btn:active {\n  transform: scale(0.95);\n}\n\n.mt-step-val {\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: #0f172a;\n  min-width: 18px;\n  text-align: center;\n  user-select: none;\n}\n\n.mt-step-unit {\n  font-size: 0.68rem;\n  font-weight: 500;\n  color: #94a3b8;\n  margin-right: 2px;\n  user-select: none;\n}\n\n.mt-style-popup {\n  width: 252px;\n  min-width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  padding: 10px 12px;\n  gap: 8px;\n}\n\n.mt-style-palette-section {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding-top: 8px;\n  border-top: 1px solid #f1f5f9;\n}\n\n.mt-style-palette-section.is-opening {\n  animation: popupSlideDown 0.16s ease;\n}\n\n/* Renk Paleti Swatch Izgaras\u0131 */\n.mt-color-palette {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n  gap: 7px;\n  margin-top: 2px;\n}\n\n.mt-color-swatch {\n  width: 24px;\n  height: 24px;\n  border-radius: 50%;\n  border: 1.5px solid rgba(0, 0, 0, 0.12);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: transform 0.15s ease, box-shadow 0.15s ease;\n}\n\n.mt-color-swatch:hover {\n  transform: scale(1.15);\n  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);\n}\n\n.mt-color-swatch.is-transparent {\n  position: relative;\n  border-color: #cbd5e1;\n}\n\n.slash-line {\n  font-size: 0.85rem;\n  color: #ef4444;\n  font-weight: 800;\n}\n\n/* Metin Popup Stilleri */\n.mt-text-popup {\n  width: 252px;\n  min-width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  padding: 10px 12px;\n  gap: 8px;\n}\n\n.mt-text-format-row,\n.mt-align-row {\n  justify-content: space-between;\n}\n\n.mt-format-btn {\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n  border: none;\n  background: transparent;\n  font-size: 0.85rem;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #64748b;\n  transition: all 0.15s ease;\n}\n\n.mt-format-btn:hover {\n  color: #0f172a;\n  background: rgba(255, 255, 255, 0.5);\n}\n\n.mt-format-btn.active {\n  background: #ffffff;\n  color: #0f172a;\n  font-weight: 700;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.mt-size-stepper {\n  display: flex;\n  align-items: center;\n  gap: 3px;\n  background: #f1f5f9;\n  padding: 2px 6px;\n  border-radius: 8px;\n  height: 28px;\n  box-sizing: border-box;\n}\n\n.mt-size-val {\n  font-size: 0.82rem;\n  font-weight: 600;\n  color: #0f172a;\n  min-width: 20px;\n  text-align: center;\n}\n\n.mt-stepper-arrows {\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n}\n\n.mt-stepper-arrows button {\n  border: none;\n  background: transparent;\n  font-size: 0.55rem;\n  cursor: pointer;\n  padding: 0 1px;\n  line-height: 1;\n  color: #64748b;\n}\n\n.mt-stepper-arrows button:hover {\n  color: #0f172a;\n}\n\n.mt-size-unit {\n  font-size: 0.72rem;\n  color: var(--text-muted);\n  font-weight: 600;\n}\n\n.mt-color-preview-btn {\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n  border: 1.5px solid #e2e8f0;\n  background: #f1f5f9;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: all 0.15s ease;\n  padding: 0;\n}\n\n.mt-color-preview-btn:hover {\n  border-color: #cbd5e1;\n  background: #ffffff;\n}\n\n.mt-color-preview-btn.active {\n  border-color: #0f172a;\n  background: #ffffff;\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n\n.mt-color-circle {\n  width: 18px;\n  height: 18px;\n  border-radius: 50%;\n  border: 1.5px solid rgba(0, 0, 0, 0.18);\n  display: block;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n\n.mt-text-palette-section {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding-top: 8px;\n  border-top: 1px solid #f1f5f9;\n}\n\n.mt-text-palette-section.is-opening {\n  animation: popupSlideDown 0.16s ease;\n}\n\n.mt-palette-header {\n  font-size: 0.72rem;\n  font-weight: 600;\n  color: #64748b;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n\n.mt-color-swatch.is-active-swatch {\n  transform: scale(1.15);\n  box-shadow: 0 0 0 2px #0f172a, 0 2px 5px rgba(0, 0, 0, 0.2);\n  border-color: transparent;\n}\n\n.swatch-check {\n  font-size: 0.72rem;\n  font-weight: 900;\n  color: #ffffff;\n  line-height: 1;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);\n}\n\n.mt-custom-color-swatch {\n  position: relative;\n  background: #f8fafc !important;\n  border: 1.5px dashed #94a3b8 !important;\n  cursor: pointer;\n}\n\n.mt-custom-color-swatch:hover {\n  border-color: #0f172a !important;\n  background: #f1f5f9 !important;\n}\n\n.custom-color-icon {\n  font-size: 1rem;\n  font-weight: 800;\n  color: var(--text-muted);\n  line-height: 1;\n}\n\n/* Katmanlar & Kilit Popup (Minimalist Men\u00fc) */\n.mt-layer-popup {\n  width: 252px;\n  min-width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  padding: 5px;\n  border-radius: var(--radius-lg);\n  background: #ffffff;\n  box-shadow: var(--shadow-popup);\n  border: 1px solid var(--border-color);\n}\n\n.mt-layer-menu {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  width: 100%;\n}\n\n.mt-layer-item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  height: 30px;\n  padding: 0 8px;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: #475569;\n  font-size: 0.8rem;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.12s ease;\n  user-select: none;\n  text-align: left;\n  box-sizing: border-box;\n}\n\n.mt-layer-item svg {\n  flex-shrink: 0;\n  color: #64748b;\n  transition: color 0.12s ease;\n}\n\n.mt-layer-item:hover {\n  background: #f1f5f9;\n  color: #0f172a;\n}\n\n.mt-layer-item:hover svg {\n  color: #0f172a;\n}\n\n.mt-layer-item:active {\n  transform: scale(0.98);\n}\n\n.mt-layer-divider {\n  height: 1px;\n  background: #f1f5f9;\n  margin: 3px 2px;\n}\n\n.mt-layer-lock-item {\n  color: #475569;\n}\n\n.mt-layer-lock-item.is-locked,\n.mt-layer-lock-item.active-lock {\n  background: #f8fafc;\n  color: #0f172a;\n  font-weight: 600;\n  border: 1px solid #e2e8f0;\n}\n\n.mt-layer-lock-item.is-locked svg,\n.mt-layer-lock-item.active-lock svg {\n  color: #475569;\n}\n\n.mt-layer-lock-item.is-locked:hover,\n.mt-layer-lock-item.active-lock:hover {\n  background: #f1f5f9;\n  color: #0f172a;\n}\n\n.mt-layer-btn-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 6px;\n}\n\n.mt-layer-btn {\n  padding: 8px 12px;\n  background: #f8fafc;\n  border: 1px solid var(--border-color);\n  border-radius: var(--radius-md);\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: var(--text-main);\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.mt-layer-btn:hover {\n  background: #f1f5f9;\n  border-color: #cbd5e1;\n  color: #0f172a;\n}\n\n.mt-layer-btn.active-lock {\n  background: #f8fafc;\n  border-color: #e2e8f0;\n  color: #0f172a;\n}\n\n/* \u00c7oklu Se\u00e7im Gruplama Butonu */\n.mt-group-action-btn {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  padding: 4px 8px;\n  background: #f1f5f9;\n  border: 1px solid #e2e8f0;\n  border-radius: 6px;\n  font-size: 0.76rem;\n  font-weight: 500;\n  color: #475569;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.mt-group-action-btn:hover {\n  background: #ffffff;\n  border-color: #cbd5e1;\n  color: #0f172a;\n}\n\n.mt-group-action-btn.active-group {\n  background: #ffffff;\n  border-color: #0f172a;\n  color: #0f172a;\n  font-weight: 600;\n  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);\n}\n\n.mt-align-popup {\n  width: 252px;\n  min-width: 252px;\n  max-width: 100%;\n  box-sizing: border-box;\n  padding: 10px 12px;\n  gap: 8px;\n}\n\n.mt-align-popup .mt-group-action-btn {\n  padding: 4px 8px;\n  font-size: 0.76rem;\n  gap: 4px;\n}\n\n/* ==========================================\n   TOAST B\u0130LD\u0130R\u0130MLER\u0130\n   ========================================== */\n.app-toast {\n  position: fixed;\n  bottom: 24px;\n  right: 24px;\n  padding: 12px 20px;\n  border-radius: var(--radius-md);\n  font-size: 0.88rem;\n  font-weight: 600;\n  color: #ffffff;\n  background: #1e293b;\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);\n  z-index: 99999;\n  opacity: 0;\n  transform: translateY(20px);\n  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);\n  pointer-events: none;\n}\n\n.app-toast.is-visible {\n  opacity: 1;\n  transform: translateY(0);\n}\n\n.app-toast.toast-success { background: #059669; }\n.app-toast.toast-error { background: #dc2626; }\n.app-toast.toast-info { background: #2563eb; }\n\n/* ==========================================================================\n   STAGE CSS - 1200x675 Mant\u0131ksal Tuval, Nesneler ve D\u00f6n\u00fc\u015f\u00fcm Tutama\u00e7lar\u0131\n   ========================================================================== */\n\n.stage {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 1200px;\n  height: 675px;\n  background-color: #ffffff;\n  border: 1px solid #e2e8f0;\n  border-radius: 16px;\n  overflow: visible;\n  touch-action: none;\n  user-select: none;\n  -webkit-user-select: none;\n  transform-origin: top left;\n}\n\n/* Izgara (Grid) \u00c7izgileri */\n.stage.grid-visible::before {\n  content: '';\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  background-size: 20px 20px;\n  background-image:\n    linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px),\n    linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px);\n  z-index: 0;\n}\n\n/* SVG Ba\u011flant\u0131 ve \u00c7izim Katman\u0131 */\n.stage-svg-overlay {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 500;\n  overflow: visible;\n}\n\n/* Nesneler Katman\u0131 */\n.stage-objects {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n}\n\n/* ==========================================\n   SAHNE NESNELER\u0130 (.stage-object)\n   ========================================== */\n.stage-object {\n  position: absolute;\n  top: 0;\n  left: 0;\n  pointer-events: auto;\n  box-sizing: border-box;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  user-select: none;\n  -webkit-user-select: none;\n  cursor: move;\n}\n\n.stage-object.is-locked {\n  cursor: pointer;\n}\n\n.stage-object.is-hidden {\n  display: none !important;\n}\n\n/* \u00c7izgi Nesnesi Stilleri */\n.stage-object[data-type=\"line\"] {\n  background-color: transparent !important;\n  border: none !important;\n  box-shadow: none !important;\n  overflow: visible !important;\n}\n\n.stage-object[data-type=\"line\"] .object-inner-content {\n  width: 100%;\n  height: 100%;\n  padding: 0 !important;\n  overflow: visible !important;\n}\n\n.object-line-bar {\n  width: 100%;\n  height: 100%;\n  display: block;\n  pointer-events: none;\n  box-sizing: border-box;\n  overflow: visible;\n}\n\n/* \u0130\u00e7erik Kutusu */\n.object-inner-content {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  pointer-events: none;\n  word-break: break-word;\n  white-space: pre-wrap;\n}\n\n.object-inner-content span,\n.object-inner-content .object-text-span {\n  width: 100%;\n  display: block;\n  text-align: inherit;\n  box-sizing: border-box;\n}\n\n.object-text-span:empty::before {\n  content: 'Metin girin...';\n  color: #94a3b8;\n  font-style: italic;\n  pointer-events: none;\n}\n\n/* ==========================================\n   YER\u0130NDE MET\u0130N D\u00dcZENLEME (INLINE EDITING)\n   ========================================== */\n.stage-object.is-editing-text {\n  cursor: text !important;\n}\n\n.stage-object.is-editing-text .object-inner-content {\n  pointer-events: auto !important;\n  user-select: text !important;\n  -webkit-user-select: text !important;\n}\n\n.stage-object.is-editing-text [contenteditable=\"true\"] {\n  pointer-events: auto !important;\n  user-select: text !important;\n  -webkit-user-select: text !important;\n  cursor: text !important;\n  outline: 2px dashed #0ea5e9 !important;\n  outline-offset: 4px !important;\n  border-radius: 4px !important;\n  min-height: 1.2em;\n}\n\n/* Se\u00e7im kutusunun d\u00fczenleme s\u0131ras\u0131nda t\u0131klamalar\u0131 engellememesi */\n.selection-box.is-editing-text {\n  pointer-events: none !important;\n}\n\n.selection-box.is-editing-text .selection-border {\n  pointer-events: none !important;\n  border-color: rgba(14, 165, 233, 0.3) !important;\n  border-style: dotted !important;\n}\n\n.selection-box.is-editing-text .resize-handle,\n.selection-box.is-editing-text .rotate-handle,\n.selection-box.is-editing-text .rotate-stem {\n  display: none !important;\n}\n\n.object-inner-content img {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n  pointer-events: none;\n}\n\n.image-caption {\n  margin-top: 4px;\n  font-size: 0.82rem;\n  font-weight: 600;\n}\n\n/* Kategori Ba\u015fl\u0131\u011f\u0131 ve Alan\u0131 */\n.category-header {\n  font-size: 1.15rem;\n  font-weight: 800;\n  color: #065f46;\n  margin-bottom: 6px;\n}\n\n.category-drop-hint {\n  font-size: 0.8rem;\n  color: #10b981;\n  font-style: italic;\n}\n\n/* S\u0131ralama Kutusu */\n.sequence-slot-number {\n  font-size: 1.6rem;\n  font-weight: 800;\n  color: #6d28d9;\n}\n\n.sequence-slot-label {\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: #64748b;\n}\n\n/* Kilit \u0130konu (T\u0131klanabilir buton) */\n.lock-indicator {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  font-size: 0.85rem;\n  background: #ffffff;\n  border: 1px solid #cbd5e1;\n  border-radius: 6px;\n  padding: 2px 5px;\n  cursor: pointer;\n  pointer-events: auto;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);\n  transition: all 0.15s ease;\n  z-index: 101;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.lock-indicator:hover {\n  background: #fef2f2;\n  border-color: #ef4444;\n  transform: scale(1.15);\n}\n\n/* ==========================================\n   SE\u00c7\u0130M VE D\u00d6N\u00dc\u015e\u00dcM \u00c7ER\u00c7EVES\u0130 (.selection-box)\n   ========================================== */\n.selection-box {\n  position: absolute;\n  top: 0;\n  left: 0;\n  pointer-events: auto;\n  z-index: 1000;\n  display: none;\n}\n\n.selection-border {\n  position: absolute;\n  top: -1px;\n  left: -1px;\n  width: calc(100% + 2px);\n  height: calc(100% + 2px);\n  border: 1.5px solid #0ea5e9;\n  pointer-events: auto;\n  cursor: move;\n}\n\n.selection-box.multi-select .selection-border {\n  border: 1.5px dashed #0ea5e9;\n}\n\n.selection-border.group-border {\n  border: 1.5px solid #6366f1 !important;\n}\n\n.multi-count-badge.is-group-badge {\n  background: #6366f1 !important;\n}\n\n/* Kilitli Nesne Se\u00e7im Stili */\n.selection-box.is-locked-selection .locked-border {\n  border: 1.5px dashed #f59e0b;\n  cursor: default;\n}\n\n.selection-lock-floating-pill {\n  position: absolute;\n  top: -38px;\n  left: 50%;\n  transform: translateX(-50%);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: auto;\n  white-space: nowrap;\n  z-index: 1020;\n}\n\n.lock-pill-unlock-btn {\n  background: #1e293b;\n  color: #ffffff;\n  border: 1px solid rgba(255, 255, 255, 0.15);\n  border-radius: 9999px;\n  padding: 5px 12px;\n  font-size: 0.76rem;\n  font-weight: 600;\n  cursor: pointer;\n  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  transition: all 0.15s ease;\n  user-select: none;\n}\n\n.lock-pill-unlock-btn:hover {\n  background: #0f172a;\n  transform: scale(1.05);\n  border-color: #f59e0b;\n  color: #fbbf24;\n}\n\n/* 8 Y\u00f6nl\u00fc Boyutland\u0131rma Tutama\u00e7lar\u0131 */\n.resize-handle {\n  position: absolute;\n  width: 8px;\n  height: 8px;\n  background-color: #ffffff;\n  border: 1.5px solid #0ea5e9;\n  border-radius: 1px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);\n  z-index: 1010;\n  pointer-events: auto;\n}\n\n.handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }\n.handle-n  { top: -5px; left: calc(50% - 4px); cursor: ns-resize; }\n.handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }\n.handle-e  { top: calc(50% - 4px); right: -5px; cursor: ew-resize; }\n.handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }\n.handle-s  { bottom: -5px; left: calc(50% - 4px); cursor: ns-resize; }\n.handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }\n.handle-w  { top: calc(50% - 4px); left: -5px; cursor: ew-resize; }\n\n/* D\u00f6nd\u00fcrme Tutamac\u0131 */\n.rotate-stem {\n  position: absolute;\n  top: -22px;\n  left: 50%;\n  width: 1px;\n  height: 18px;\n  background-color: #0ea5e9;\n  pointer-events: none;\n}\n\n.rotate-handle {\n  position: absolute;\n  top: -30px;\n  left: calc(50% - 6px);\n  width: 12px;\n  height: 12px;\n  background-color: #ffffff;\n  border: 1.5px solid #0ea5e9;\n  border-radius: 50%;\n  cursor: grab;\n  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);\n  z-index: 1020;\n  pointer-events: auto;\n}\n\n.rotate-handle:active {\n  cursor: grabbing;\n}\n\n/* \u00c7izgi Se\u00e7im Tutama\u00e7lar\u0131 ve \u00c7er\u00e7evesi */\n.selection-box.is-line-selection {\n  pointer-events: none;\n}\n\n.selection-box.is-line-selection .selection-border {\n  display: none !important;\n}\n\n.line-endpoint-handle {\n  position: absolute;\n  width: 18px;\n  height: 18px;\n  border-radius: 50% !important;\n  background-color: #ffffff !important;\n  border: 3px solid #f97316 !important;\n  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);\n  z-index: 1010;\n  pointer-events: auto;\n  cursor: grab;\n  transition: transform 0.12s ease;\n  box-sizing: border-box;\n}\n\n.line-endpoint-handle:hover {\n  transform: scale(1.2);\n  border-color: #ea580c !important;\n}\n\n.line-endpoint-handle:active {\n  cursor: grabbing;\n}\n\n.line-endpoint-handle.handle-start {\n  left: -9px;\n  top: calc(50% - 9px);\n}\n\n.line-endpoint-handle.handle-end {\n  right: -9px;\n  top: calc(50% - 9px);\n}\n\n.line-rotate-stem {\n  top: -24px;\n  height: 20px;\n}\n\n.line-rotate-handle {\n  top: -32px;\n}\n\n/* \u00c7oklu Se\u00e7im Sayac\u0131 */\n.multi-count-badge {\n  position: absolute;\n  top: -26px;\n  left: 0;\n  background: #0ea5e9;\n  color: #ffffff;\n  font-size: 0.72rem;\n  font-weight: 700;\n  padding: 2px 8px;\n  border-radius: 4px;\n  pointer-events: none;\n}\n\n/* ==========================================\n   MARQUEE (ALAN SE\u00c7\u0130M\u0130) KUTUSU\n   ========================================== */\n.stage-marquee-selection {\n  position: absolute;\n  border: 1px solid #0ea5e9;\n  background-color: rgba(14, 165, 233, 0.12);\n  pointer-events: none;\n  z-index: 999;\n  display: none;\n}\n\n/* ==========================================\n   AKILLI KILAVUZ \u00c7\u0130ZG\u0130LER\u0130 (GUIDELINES)\n   ========================================== */\n.stage-guidelines {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 998;\n}\n\n.guideline {\n  position: absolute;\n  background-color: #06b6d4;\n  box-shadow: 0 0 4px #06b6d4;\n}\n\n.guideline-h {\n  left: 0;\n  width: 100%;\n  height: 1px;\n}\n\n.guideline-v {\n  top: 0;\n  height: 100%;\n  width: 1px;\n}\n\n/* ==========================================================================\n   ANSWER KEY CSS - Cevap Anahtar\u0131 Modu G\u00f6rsel E\u015fle\u015ftirme Stilleri\n   ========================================================================== */\n\n/* Cevap Anahtar\u0131 Modunda Nesneler */\n.mode-answer-key .stage-object {\n  cursor: default;\n}\n\n.mode-answer-key .stage-object[data-role=\"draggable\"] {\n  cursor: pointer !important;\n}\n\n/* Se\u00e7ilen Kaynak S\u00fcr\u00fcklenebilir \u00d6\u011fe (Sadece se\u00e7ili nesne vurgulan\u0131r, konumu korunur) */\n.mode-answer-key .stage-object.ak-source-active {\n  outline: 3px solid #6366f1 !important;\n  outline-offset: 3px !important;\n  box-shadow: 0 0 0 2px #ffffff, 0 8px 24px rgba(99, 102, 241, 0.35) !important;\n  z-index: 1000 !important;\n  cursor: pointer !important;\n}\n\n/* ==========================================================================\n   Hedef Se\u00e7im A\u015famas\u0131: S\u00fcr\u00fcklenecek nesne se\u00e7ildikten sonra\n   Sadece sahne rol\u00fc \"Hedef\" olan nesneler t\u0131klanabilir olmal\u0131d\u0131r.\n   ========================================================================== */\n.mode-answer-key.ak-selecting-target .stage-object {\n  cursor: default;\n  pointer-events: none; /* Hedef olmayan (dekoratif vb.) nesneler t\u0131klanamaz */\n}\n\n/* Kaynak nesnenin kendisi t\u0131klanarak se\u00e7im iptal edilebilir */\n.mode-answer-key.ak-selecting-target .stage-object.ak-source-active {\n  cursor: pointer !important;\n  pointer-events: auto !important;\n}\n\n/* Ba\u015fka bir s\u00fcr\u00fcklenebilir nesneye t\u0131klanarak kaynak de\u011fi\u015ftirilebilir */\n.mode-answer-key.ak-selecting-target .stage-object[data-role=\"draggable\"] {\n  cursor: pointer !important;\n  pointer-events: auto !important;\n}\n\n/* Sahne rol\u00fc \"Hedef\" olan nesneler t\u0131klanabilir */\n.mode-answer-key.ak-selecting-target .stage-object[data-role=\"target\"],\n.mode-answer-key.ak-selecting-target .stage-object[data-role=\"category\"],\n.mode-answer-key.ak-selecting-target .stage-object[data-role=\"sequence_slot\"] {\n  cursor: pointer !important;\n  pointer-events: auto !important;\n}\n\n/* SVG Ba\u011flant\u0131 \u00c7izgileri */\n.ak-connection-group {\n  cursor: pointer;\n  pointer-events: auto;\n}\n\n.ak-connection-hitbox {\n  fill: none;\n  stroke: transparent;\n  stroke-width: 24;\n  pointer-events: stroke;\n}\n\n.ak-connection-path {\n  fill: none;\n  stroke: #6366f1;\n  stroke-width: 3.5;\n  stroke-linecap: round;\n  stroke-dasharray: 6 4;\n  animation: dashAnimation 1s linear infinite;\n  filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3));\n}\n\n@keyframes dashAnimation {\n  to {\n    stroke-dashoffset: -20;\n  }\n}\n\n.ak-node-circle {\n  fill: #4f46e5;\n  stroke: #ffffff;\n  stroke-width: 2;\n}\n\n.ak-node-circle.start {\n  fill: #ec4899;\n}\n\n.ak-node-circle.end {\n  fill: #10b981;\n}\n\n/* Ba\u011flant\u0131 Kald\u0131rma (Unlink) Butonu */\n.ak-unlink-btn {\n  width: 26px;\n  height: 26px;\n  border-radius: 50%;\n  background: #ef4444;\n  color: #ffffff;\n  border: 2px solid #ffffff;\n  font-size: 12px;\n  font-weight: 800;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);\n  transition: transform 0.15s ease, background 0.15s ease;\n  pointer-events: auto;\n  padding: 0;\n  margin: 0;\n}\n\n.ak-unlink-btn:hover {\n  background: #dc2626;\n  transform: scale(1.2);\n}\n\n/* ==========================================================================\n   Cevap Anahtar\u0131 \u00dcst Rehber \u00c7ubu\u011fu (Answer Key Guide Bar)\n   \u00dcst ara\u00e7 \u00e7ubu\u011funun hemen alt\u0131nda, 56\u201364px y\u00fcksekli\u011finde, \u015f\u0131k ve minimalist\n   ========================================================================== */\n.answer-key-guide-bar {\n  height: 60px;\n  min-height: 60px;\n  background-color: #ffffff;\n  border-bottom: 1px solid var(--border-color, #e2e8f0);\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0 24px;\n  box-sizing: border-box;\n  z-index: 45;\n  user-select: none;\n  animation: akSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n}\n\n@keyframes akSlideDown {\n  from {\n    opacity: 0;\n    transform: translateY(-6px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n.ak-guide-left {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n}\n\n.ak-guide-icon-badge {\n  width: 38px;\n  height: 38px;\n  border-radius: 10px;\n  background: #eff6ff;\n  color: #2563eb;\n  border: 1px solid #dbeafe;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  transition: all 0.2s ease;\n}\n\n.ak-guide-icon-badge.is-complete {\n  background: #ecfdf5;\n  color: #059669;\n  border-color: #a7f3d0;\n}\n\n.ak-guide-content {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  gap: 2px;\n}\n\n.ak-guide-title {\n  font-size: 0.94rem;\n  font-weight: 700;\n  color: #0f172a;\n  line-height: 1.25;\n  letter-spacing: -0.01em;\n}\n\n.ak-guide-instruction {\n  font-size: 0.82rem;\n  font-weight: 500;\n  color: #64748b;\n  line-height: 1.2;\n}\n\n.ak-guide-right {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n\n.ak-guide-counter {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 14px;\n  border-radius: 9999px;\n  font-size: 0.82rem;\n  font-weight: 600;\n  background: #f8fafc;\n  color: #475569;\n  border: 1px solid #e2e8f0;\n  transition: all 0.2s ease;\n}\n\n.ak-guide-counter.is-complete {\n  background: #ecfdf5;\n  color: #059669;\n  border-color: #a7f3d0;\n}\n\n/* ==========================================================================\n   PLAYER CSS - Etkinlik Oynat\u0131c\u0131 ve \u00d6nizleme Stilleri\n   ========================================================================== */\n\n#preview-container {\n  display: none;\n  width: 100%;\n  height: 100%;\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 9999;\n  background: #0f172a;\n  overflow: hidden;\n}\n\n.player-wrapper {\n  width: 100%;\n  height: 100%;\n  max-width: 100%;\n  max-height: 100%;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  position: relative;\n  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);\n  user-select: none;\n  -webkit-user-select: none;\n}\n\n.player-header {\n  height: 60px;\n  min-height: 52px;\n  flex-shrink: 0;\n  padding: 0 24px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  background: rgba(15, 23, 42, 0.88);\n  backdrop-filter: blur(8px);\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n  z-index: 100;\n}\n\n/* Minimal Floating Header (Sadece Edit\u00f6r \u00d6nizlemesinde 'Edit\u00f6re D\u00f6n' i\u00e7in) */\n.player-header.player-header-minimal {\n  position: absolute;\n  top: 14px;\n  right: 18px;\n  height: auto;\n  min-height: unset;\n  padding: 0;\n  background: transparent;\n  border-bottom: none;\n  backdrop-filter: none;\n  z-index: 500;\n  pointer-events: auto;\n}\n\n.player-header.player-header-minimal .exit-btn {\n  background: rgba(239, 68, 68, 0.18);\n  border: 1px solid rgba(239, 68, 68, 0.45);\n  color: #fca5a5;\n  backdrop-filter: blur(8px);\n  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);\n  border-radius: 9999px;\n  padding: 7px 16px;\n  font-size: 0.85rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.player-header.player-header-minimal .exit-btn:hover {\n  background: rgba(239, 68, 68, 0.38);\n  border-color: rgba(239, 68, 68, 0.7);\n  color: #ffffff;\n  transform: translateY(-1px);\n}\n\n.player-title-box {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.player-title {\n  font-size: 1.15rem;\n  font-weight: 700;\n  color: #f8fafc;\n}\n\n.player-badge {\n  font-size: 0.75rem;\n  font-weight: 600;\n  background: rgba(99, 102, 241, 0.25);\n  color: #a5b4fc;\n  border: 1px solid rgba(99, 102, 241, 0.4);\n  padding: 3px 10px;\n  border-radius: 9999px;\n}\n\n.player-stats {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.stat-pill {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  background: rgba(30, 41, 59, 0.9);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n  padding: 6px 14px;\n  border-radius: 9999px;\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: #e2e8f0;\n}\n\n.stat-pill .stat-value {\n  color: #38bdf8;\n}\n\n.player-actions {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n\n.player-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  padding: 8px 16px;\n  border-radius: 8px;\n  font-size: 0.85rem;\n  font-weight: 600;\n  border: 1px solid rgba(255, 255, 255, 0.15);\n  background: rgba(255, 255, 255, 0.08);\n  color: #f8fafc;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.player-btn:hover {\n  background: rgba(255, 255, 255, 0.16);\n  transform: translateY(-1px);\n}\n\n.player-btn.primary-btn,\n.player-btn.check-answers-btn {\n  background: #0f172a;\n  border: 1px solid #0f172a;\n  color: #ffffff;\n  border-radius: 9999px;\n  padding: 8px 20px;\n  font-size: 0.875rem;\n  font-weight: 600;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  cursor: pointer;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);\n  transition: all 0.15s ease;\n}\n\n.player-btn.primary-btn:hover,\n.player-btn.check-answers-btn:hover {\n  background: #1e293b;\n  border-color: #1e293b;\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);\n}\n\n.player-btn.secondary-btn,\n.player-btn.reset-btn {\n  background: transparent;\n  border: none;\n  color: #475569;\n  font-size: 0.875rem;\n  font-weight: 500;\n  padding: 7px 12px;\n  border-radius: 8px;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  transition: all 0.15s ease;\n  box-shadow: none;\n}\n\n.player-btn.secondary-btn:hover,\n.player-btn.reset-btn:hover {\n  background: #f1f5f9;\n  color: #0f172a;\n  transform: none;\n}\n\n.player-btn.reset-btn .btn-icon {\n  font-size: 1.05rem;\n  line-height: 1;\n}\n\n.player-btn.retry-btn {\n  background: #d97706;\n  border: 1px solid #d97706;\n  color: #ffffff;\n  border-radius: 9999px;\n  padding: 8px 20px;\n  font-size: 0.875rem;\n  font-weight: 600;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  cursor: pointer;\n  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);\n  transition: all 0.15s ease;\n}\n\n.player-btn.retry-btn:hover {\n  background: #b45309;\n  border-color: #b45309;\n  transform: translateY(-1px);\n}\n\n.player-btn.pulse-highlight {\n  animation: checkPulse 1.5s infinite;\n}\n\n@keyframes checkPulse {\n  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }\n  70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }\n  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }\n}\n\n.player-btn.exit-btn {\n  background: rgba(239, 68, 68, 0.2);\n  border-color: rgba(239, 68, 68, 0.4);\n  color: #fca5a5;\n}\n\n.player-btn.exit-btn:hover {\n  background: rgba(239, 68, 68, 0.35);\n}\n\n/* OYUN ALANI (Stage + Kontroller + Footer tek b\u00fct\u00fcn) */\n.player-viewport,\n.player-stage-viewport {\n  width: 100%;\n  height: 100%;\n  flex: 1 1 0%;\n  min-width: 0;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  position: relative;\n  background: #f8fafc;\n  touch-action: none;\n}\n\n/* SAHNE ALANI KONTEYNERI (Stage'in en-boy orant\u0131l\u0131 s\u0131\u011faca\u011f\u0131 alan) */\n.player-stage-container {\n  flex: 1 1 0%;\n  min-width: 0;\n  min-height: 0;\n  width: 100%;\n  position: relative;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  touch-action: none;\n}\n\n/* B\u00dcT\u00dcNLE\u015e\u0130K SAHNE VE KONTROL KARTI (player-stage-board) */\n.player-stage-board {\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05);\n  border-radius: 16px;\n  overflow: hidden;\n  background: #ffffff;\n  border: 1px solid #e2e8f0;\n  box-sizing: border-box;\n  flex-shrink: 0;\n}\n\n/* \u00d6L\u00c7EKLENM\u0130\u015e SAHNE TUTUCU */\n.player-stage-scaler {\n  position: relative;\n  overflow: hidden;\n  flex-shrink: 0;\n  border-radius: 16px 16px 0 0;\n}\n\n.player-stage {\n  position: absolute;\n  top: 0;\n  left: 0;\n  overflow: hidden;\n  touch-action: none;\n  transform-origin: top left;\n  user-select: none;\n  -webkit-user-select: none;\n  flex-shrink: 0;\n}\n\n.player-targets-layer,\n.player-draggables-layer {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n}\n\n.player-object {\n  position: absolute;\n  top: 0;\n  left: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-sizing: border-box;\n  pointer-events: auto;\n  user-select: none;\n}\n\n.player-object.is-draggable {\n  cursor: grab;\n  touch-action: none;\n  transition: box-shadow 0.2s ease, filter 0.2s ease;\n}\n\n.player-object.is-draggable:hover {\n  filter: brightness(1.05);\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important;\n}\n\n.player-object.is-dragging {\n  cursor: grabbing !important;\n  opacity: 0.92;\n  filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.35));\n}\n\n.player-object.is-locked {\n  cursor: default !important;\n  opacity: 0.95;\n  pointer-events: none;\n}\n\n.player-object.is-correct {\n  border-color: #10b981 !important;\n  background-color: #ecfdf5 !important;\n  color: #065f46 !important;\n}\n\n.player-object.is-incorrect {\n  border-color: #ef4444 !important;\n  background-color: #fef2f2 !important;\n}\n\n.player-object.is-incorrect .player-object-content {\n  animation: shake 0.4s ease-in-out;\n}\n\n.player-object.hover-active {\n  border-color: #38bdf8 !important;\n  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.35) !important;\n}\n\n.player-object.keyboard-active {\n  outline: 4px solid #f59e0b;\n  outline-offset: 4px;\n  animation: pulse 1s infinite alternate;\n}\n\n@keyframes shake {\n  0%, 100% { transform: translateX(0); }\n  20%, 60% { transform: translateX(-8px); }\n  40%, 80% { transform: translateX(8px); }\n}\n\n@keyframes pulse {\n  from { box-shadow: 0 0 0 2px #f59e0b; }\n  to { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.4); }\n}\n\n/* DO\u011eRU / YANLI\u015e \u0130KON ROZETLER\u0130 (\u2713 / \u2715) */\n.player-status-badge {\n  position: absolute;\n  top: -10px;\n  right: -10px;\n  width: 24px;\n  height: 24px;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 13px;\n  font-weight: 900;\n  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);\n  z-index: 100;\n  animation: badgePop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);\n  pointer-events: none;\n}\n\n.player-status-badge.badge-correct {\n  background: #10b981;\n  color: #ffffff;\n  border: 2px solid #ffffff;\n}\n\n.player-status-badge.badge-incorrect {\n  background: #ef4444;\n  color: #ffffff;\n  border: 2px solid #ffffff;\n}\n\n@keyframes badgePop {\n  0% { transform: scale(0); opacity: 0; }\n  100% { transform: scale(1); opacity: 1; }\n}\n\n.player-object.is-target.is-target-locked {\n  pointer-events: none !important;\n  opacity: 0.9;\n  border-color: #10b981 !important;\n}\n\n.player-object-content {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  overflow: hidden;\n  word-break: break-word;\n  white-space: pre-wrap;\n}\n\n/* \u00c7izgi Nesnesi Oynat\u0131c\u0131 Stilleri */\n.player-object[data-type=\"line\"] {\n  background-color: transparent !important;\n  border: none !important;\n  box-shadow: none !important;\n  overflow: visible !important;\n}\n\n.player-object[data-type=\"line\"] .player-inner-content {\n  overflow: visible !important;\n  padding: 0 !important;\n}\n\n.player-line-bar,\n.player-object svg.object-line-bar {\n  width: 100%;\n  height: 100%;\n  display: block;\n  pointer-events: none;\n  overflow: visible;\n}\n\n.player-object-content span,\n.player-object-content .player-text-span {\n  width: 100%;\n  display: block;\n  text-align: inherit;\n  box-sizing: border-box;\n}\n\n.player-object-content img {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n  pointer-events: none;\n}\n\n.cat-title {\n  font-size: 1.15rem;\n  font-weight: 700;\n  color: #065f46;\n  margin-bottom: 8px;\n}\n\n.slot-badge {\n  font-size: 1.4rem;\n  font-weight: 800;\n  color: #6d28d9;\n}\n\n.slot-text {\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: #64748b;\n}\n\n/* KONTROL ALANI (A\u00e7\u0131k Zemin, Hiyerar\u015fik Butonlar) */\n.player-controls {\n  flex-shrink: 0;\n  min-height: 54px;\n  padding: 10px 18px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  background: #ffffff;\n  border-top: 1px solid #f1f5f9;\n  box-sizing: border-box;\n  width: 100%;\n}\n\n.player-actions {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-left: auto;\n}\n\n/* MOD DE\u011e\u0130\u015eT\u0130R\u0130C\u0130 (Segmented Switch) */\n.player-mode-switch {\n  display: inline-flex;\n  align-items: center;\n  background: #f1f5f9;\n  border: 1px solid #e2e8f0;\n  border-radius: 10px;\n  padding: 3px;\n  gap: 2px;\n}\n\n.player-mode-switch .mode-btn {\n  border: none;\n  background: transparent;\n  color: #64748b;\n  font-size: 0.85rem;\n  font-weight: 500;\n  padding: 6px 14px;\n  border-radius: 7px;\n  cursor: pointer;\n  transition: all 0.15s ease;\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  white-space: nowrap;\n  user-select: none;\n}\n\n.player-mode-switch .mode-btn:hover {\n  color: #0f172a;\n}\n\n.player-mode-switch .mode-btn.active {\n  background: #ffffff;\n  color: #0f172a;\n  font-weight: 600;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);\n}\n\n/* YARDIMCI \u0130PUCU METN\u0130 (Koyu panel de\u011fil, sade yard\u0131mc\u0131 metin) */\n.player-footer {\n  height: auto;\n  min-height: 28px;\n  flex-shrink: 0;\n  padding: 8px 16px 2px 16px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: transparent;\n  border: none;\n  color: #64748b;\n  font-size: 0.82rem;\n  box-sizing: border-box;\n  width: 100%;\n}\n\n.player-hint {\n  text-align: center;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  color: #64748b;\n  font-size: 0.82rem;\n  line-height: 1.4;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* BA\u015eARI MODALI */\n.player-modal-backdrop {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: rgba(15, 23, 42, 0.75);\n  backdrop-filter: blur(8px);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n\n.player-modal-card {\n  background: #ffffff;\n  border-radius: 20px;\n  padding: 36px 40px;\n  text-align: center;\n  max-width: 440px;\n  width: 90%;\n  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);\n  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);\n  position: relative;\n  overflow: hidden;\n}\n\n@keyframes popIn {\n  from { transform: scale(0.8); opacity: 0; }\n  to { transform: scale(1); opacity: 1; }\n}\n\n.modal-star-banner {\n  font-size: 2.2rem;\n  margin-bottom: 12px;\n}\n\n.modal-title {\n  font-size: 1.8rem;\n  font-weight: 800;\n  color: #1e293b;\n  margin-bottom: 8px;\n}\n\n.modal-desc {\n  font-size: 1rem;\n  color: #64748b;\n  margin-bottom: 24px;\n  line-height: 1.5;\n}\n\n.modal-score-summary {\n  display: flex;\n  gap: 16px;\n  justify-content: center;\n  margin-bottom: 24px;\n}\n\n.summary-box {\n  background: #f8fafc;\n  border: 1px solid #e2e8f0;\n  border-radius: 12px;\n  padding: 12px 20px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.summary-num {\n  font-size: 1.6rem;\n  font-weight: 800;\n  color: #4f46e5;\n}\n\n.summary-lbl {\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: #64748b;\n  text-transform: uppercase;\n}\n\n.modal-btn {\n  width: 100%;\n  padding: 14px 24px;\n  font-size: 1.05rem;\n  font-weight: 700;\n  border-radius: 12px;\n  background: #4f46e5;\n  color: #ffffff;\n  border: none;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.modal-btn:hover {\n  background: #4338ca;\n  transform: translateY(-2px);\n  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);\n}\n\n/* ==========================================================================\n   RESPONSIVE UYARLAMALAR (K\u00fc\u00e7\u00fck Ekran ve Pencereler)\n   ========================================================================== */\n@media (max-width: 768px) {\n  .player-header {\n    height: auto;\n    min-height: 48px;\n    padding: 6px 12px;\n    gap: 6px;\n  }\n\n  .player-title {\n    font-size: 0.95rem;\n  }\n\n  .player-badge {\n    display: none;\n  }\n\n  .stat-pill {\n    padding: 4px 8px;\n    font-size: 0.75rem;\n  }\n\n  .player-btn {\n    padding: 6px 10px;\n    font-size: 0.75rem;\n  }\n\n  .player-mode-switch .mode-btn {\n    padding: 4px 8px;\n    font-size: 0.72rem;\n  }\n\n  .player-controls {\n    min-height: 44px;\n    padding: 6px 12px;\n    gap: 8px;\n  }\n\n  .player-footer {\n    height: auto;\n    min-height: 30px;\n    padding: 4px 12px;\n  }\n\n  .player-hint {\n    font-size: 0.75rem;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n}\n\n:host { display: block; width: 100%; height: 100%; min-height: 0; }\n.dnd-editor-root { width: 100%; height: 100%; min-height: 620px; position: relative; }\n.dnd-editor-root.hide-file-actions .top-header-right { display: none; }\n.dnd-editor-root #preview-container { position: absolute; inset: 0; }\n";

const shell = () => `
  <div class="dnd-editor-root">
    <header class="app-top-header">
      <div class="top-header-left"><div class="header-titles-box">
        <div class="app-subtitle">ETKİNLİK DÜZENLEYİCİSİ</div>
        <div class="project-title-row"><input id="project-title-input" class="project-title-input" value="Eşleştirme" aria-label="Etkinlik başlığı"></div>
        <div class="project-save-status is-saved"><span class="status-dot"></span><span id="status-text">Kaydedildi</span></div>
      </div></div>
      <div class="top-header-right">
        <button id="btn-new-project" class="top-icon-btn" type="button" title="Yeni">＋</button>
        <button id="btn-open-project" class="top-icon-btn" type="button" title="Aç">↥</button>
        <input id="file-input-project" type="file" accept=".json,application/json" hidden>
        <button id="btn-export-html" class="top-icon-btn" type="button" title="HTML indir">HTML</button>
        <button id="btn-save-project" class="top-primary-save-btn" type="button">Kaydet</button>
      </div>
    </header>
    <nav class="app-sub-toolbar">
    <!-- Sol Mod Kümesi -->
    <div class="sub-toolbar-cluster">
      <div class="mode-pill-group">
        <button type="button" class="mode-toggle-btn active" data-mode="design" title="Tasarım Modu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button type="button" class="mode-toggle-btn" data-mode="answer-key" title="Cevap Anahtarı Modu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
        </button>
        <button type="button" class="mode-toggle-btn" data-mode="preview" title="Önizleme Modu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <!-- Şablon Seçici Menü -->
      <div class="template-dropdown-wrapper">
        <button type="button" class="sub-tool-btn" id="btn-toggle-templates" title="Örnek Etkinlik Şablonları">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </button>
        <div class="templates-menu" id="templates-menu" style="display: none;">
          <div class="menu-title">Örnek Şablonlar</div>
          <button type="button" class="template-menu-item" data-sample="matching">1. Eşleştirme (Kavram ve Tanım)</button>
          <button type="button" class="template-menu-item" data-sample="image-labeling">2. Görsel Etiketleme (İnsan Anatomisi)</button>
          <button type="button" class="template-menu-item" data-sample="categorization">3. Kategorilere Ayırma (Meyve/Sebze)</button>
          <button type="button" class="template-menu-item" data-sample="sequencing">4. Sıralama (Kelebek Yaşam Döngüsü)</button>
        </div>
      </div>
    </div>

    <!-- Orta Araç Kümesi (Nesne Ekleme) -->
    <div class="sub-toolbar-cluster">
      <button type="button" class="sub-tool-btn" id="btn-add-text" title="Metin Kutusu Ekle">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>
      </button>

      <button type="button" class="sub-tool-btn" id="btn-add-rect" title="Kutu / Kart Ekle">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
      </button>

      <button type="button" class="sub-tool-btn" id="btn-add-circle" title="Daire Şekli Ekle">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>
      </button>

      <button type="button" class="sub-tool-btn" id="btn-add-image" title="Bilgisayardan Görsel Yükle">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <input type="file" id="file-input-image" accept="image/*" style="display: none;">

      <button type="button" class="sub-tool-btn" id="btn-add-target" title="Çizgi Ekle">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="20" x2="20" y2="4"/></svg>
      </button>
    </div>

    <!-- Sağ Geçmiş & Yakınlaştırma Kümesi -->
    <div class="sub-toolbar-cluster">
      <button type="button" class="sub-tool-btn" id="btn-undo" title="Geri Al (Ctrl+Z)" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
      </button>

      <button type="button" class="sub-tool-btn" id="btn-redo" title="İleri Al (Ctrl+Y)" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
      </button>

      <div class="sub-divider"></div>

      <button type="button" class="sub-tool-btn" id="btn-zoom-out" title="Uzaklaştır">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>

      <button type="button" class="sub-tool-btn" id="btn-zoom-reset" title="Ekrana Sığdır">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>

      <button type="button" class="sub-tool-btn" id="btn-zoom-in" title="Yakınlaştır">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
    </div>
  </nav>
    <div class="answer-key-guide-bar" id="answer-key-guide-bar" style="display: none;">
      <div class="ak-guide-left">
        <div class="ak-guide-icon-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <path d="M9 16l2 2 4-4"/>
          </svg>
        </div>
        <div class="ak-guide-content">
          <div class="ak-guide-title" id="ak-guide-title">Cevap anahtarı oluştur</div>
          <div class="ak-guide-instruction" id="ak-guide-instruction">Seçerek eşleştirmeye başla</div>
        </div>
      </div>
      <div class="ak-guide-right">
        <div class="ak-guide-counter" id="ak-guide-counter">0 / 0 Eşleşti</div>
      </div>
    </div>
    <main id="editor-layout" class="editor-workspace">
      <div id="stage-viewport" class="stage-viewport">
        <div id="stage-container" class="stage-container">
          <div id="stage-scaler" class="stage-scaler">
            <div id="stage" class="stage grid-visible mode-design">
              <svg class="stage-svg-overlay" id="svg-overlay"><g id="svg-connections"></g></svg>
              <div class="stage-objects" id="stage-objects"></div>
              <div class="selection-box" id="selection-overlay"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <div id="preview-container"></div>
  </div>`;

function resolveContainer(target) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(container instanceof HTMLElement)) throw new TypeError('DND editörü için geçerli bir container gerekli.');
  return container;
}

function xml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

export function createDefaultActivity(activityType = 'matching', name = 'Eşleştirme') {
  const Core = window.DND?.EditorCore;
  if (!Core) throw new Error('DND editör çekirdeği yüklenmedi.');
  return new Core().createDefaultProject(activityType, name);
}

export function renderActivityPreview(projectData) {
  const width = projectData.stage?.width || 1200;
  const height = projectData.stage?.height || 675;
  const background = projectData.stage?.backgroundColor || '#ffffff';
  const objects = [...(projectData.objects || [])].filter(item => item.visible !== false).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const body = [];
  if (projectData.stage?.backgroundImage) {
    body.push(`<image href="${xml(projectData.stage.backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`);
  }
  for (const item of objects) {
    const x = Number(item.x) || 0, y = Number(item.y) || 0;
    const w = Math.max(1, Number(item.width) || 1), h = Math.max(1, Number(item.height) || 1);
    const transform = item.rotation ? ` transform="rotate(${Number(item.rotation) || 0} ${x + w / 2} ${y + h / 2})"` : '';
    if (item.type === 'line') {
      const dash = item.borderStyle === 'dashed' ? '8 6' : item.borderStyle === 'dotted' ? '2 6' : '';
      body.push(`<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${xml(item.borderColor || '#1e293b')}" stroke-width="${Number(item.borderWidth) || 2}"${dash ? ` stroke-dasharray="${dash}"` : ''}${transform}/>`);
      continue;
    }
    const radius = item.type === 'circle' ? Math.min(w, h) / 2 : Number(item.borderRadius) || 0;
    body.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${xml(item.backgroundColor || 'transparent')}" stroke="${xml(item.borderColor || 'transparent')}" stroke-width="${Number(item.borderWidth) || 0}"${transform}/>`);
    if (item.type === 'image' && item.src) {
      body.push(`<image href="${xml(item.src)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${transform}/>`);
    }
    if (item.text) {
      body.push(`<text x="${x + w / 2}" y="${y + h / 2}" dominant-baseline="middle" text-anchor="middle" font-family="${xml(item.fontFamily || 'system-ui, sans-serif')}" font-size="${Number(item.fontSize) || 16}" font-weight="${xml(item.fontWeight || 'normal')}" fill="${xml(item.textColor || '#1e293b')}"${transform}>${xml(item.text)}</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${xml(background)}"/>${body.join('')}</svg>`;
}

export function initializeDndEditor(options = {}) {
  const container = resolveContainer(options.container || options.target);
  if (options.signal?.aborted) throw new DOMException('DND editörü açma işlemi iptal edildi.', 'AbortError');
  const lifecycle = new AbortController();
  const shadow = container.shadowRoot || container.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${EDITOR_CSS}</style>${shell()}`;
  const root = shadow;
  const host = root.querySelector('.dnd-editor-root');
  if (options.ui?.fileActions === false) host.classList.add('hide-file-actions');
  if (options.ui?.embedded === true) host.classList.add('is-embedded');

  const stageViewport = root.getElementById('stage-viewport');
  const stageEl = root.getElementById('stage');
  const core = new window.DND.EditorCore();
  const stageManager = new window.DND.StageManager(core, stageViewport, stageEl, { signal: lifecycle.signal });
  const objectManager = new window.DND.ObjectManager(core, stageEl);
  const selectionManager = new window.DND.SelectionManager(core, stageManager, objectManager, stageEl, { signal: lifecycle.signal });
  const historyManager = new window.DND.HistoryManager(core, 40, { signal: lifecycle.signal });
  const layerManager = new window.DND.LayerManager(core, objectManager);
  const answerKeyManager = new window.DND.AnswerKeyManager(core, stageManager, objectManager, stageEl);
  const transformEngine = new window.DND.TransformEngine(core, stageManager, objectManager, selectionManager, historyManager, stageEl, { signal: lifecycle.signal });
  const exportManager = new window.DND.ExportManager(core);
  const pending = new Set();
  let taskError = null;
  let destroyed = false;
  const trackTask = task => {
    pending.add(task);
    task.catch(error => { taskError = error; }).finally(() => pending.delete(task));
  };
  const miniToolbar = new window.DND.MiniToolbar(core, objectManager, selectionManager, layerManager, stageManager, root, { signal: lifecycle.signal });
  const uiManager = new window.DND.UIManager(core, stageManager, objectManager, selectionManager, historyManager, exportManager, {
    root,
    uploadImage: options.uploadImage,
    signal: lifecycle.signal,
    trackTask,
  });
  const initial = options.activity || createDefaultActivity('matching', 'Eşleştirme');
  core.loadProject(initial);
  uiManager.updateSaveStatus(true);

  if (options.signal) options.signal.addEventListener('abort', () => lifecycle.abort(), { once: true });

  const ensureAlive = () => { if (destroyed) throw new Error('DND editörü kapatılmış.'); };
  return {
    async flush() {
      ensureAlive();
      uiManager.finishInlineEditing?.();
      await Promise.all([...pending]);
      if (taskError) { const error = taskError; taskError = null; throw error; }
    },
    getActivity() { ensureAlive(); return core.getProjectData(); },
    setActivity(activity) { ensureAlive(); core.loadProject(activity); },
    getMode() { ensureAlive(); return core.getMode(); },
    setMode(mode) { ensureAlive(); core.setMode(mode); },
    async exportPreview() {
      await this.flush();
      return new Blob([renderActivityPreview(core.getProjectData())], { type: 'image/svg+xml' });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      lifecycle.abort();
      uiManager.activePlayerInstance?.destroy();
      stageManager.resizeObserver?.disconnect();
      miniToolbar.toolbarEl?.remove();
      shadow.replaceChildren();
    },
  };
}
