/**
 * @mhmttosun/dnd - Player Bundle (UMD / CommonJS)
 * Lisans: MIT (c) 2026 mhmttosun
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.DND = global.DND || {}));
})(this, (function (exports) {
  'use strict';

  var windowObj = typeof window !== 'undefined' ? window : {};
  windowObj.DND = windowObj.DND || {};

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

  windowObj.DND.AudioSynthesizer = AudioSynthesizer;

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

  windowObj.DND.ValidationEngine = ValidationEngine;

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

    // Sürükleme değişkenleri
    this.activeDragId = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragElemStart = { x: 0, y: 0 };
    this.activePointerId = null;
    this.currentScale = 1.0;

    // Klavye erişilebilirliği için seçili nesne
    this.keyboardSelectedId = null;

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
        <header class="player-header">
          <div class="player-title-box">
            <h1 class="player-title">${window.DND.ValidationEngine.sanitizeText(this.projectData.project.name || 'Etkinlik')}</h1>
            <span class="player-badge">${this.getActivityTypeLabel()}</span>
          </div>
          <div class="player-stats">
            <div class="stat-pill score-stat" title="Doğru Sayısı">
              <span class="stat-icon">🎯</span>
              <span class="stat-value" id="stat-correct">0</span> / <span id="stat-total">0</span>
            </div>
            <div class="stat-pill attempts-stat" title="Deneme Sayısı">
              <span class="stat-icon">⚡</span>
              <span class="stat-value" id="stat-attempts">0</span> Deneme
            </div>
          </div>
          <div class="player-actions">
            <button class="player-btn sound-btn" id="btn-toggle-sound" title="Ses Aç/Kapat">
              ${this.audio.enabled ? '🔊' : '🔇'}
            </button>
            <button class="player-btn reset-btn" id="btn-reset-game" title="Yeniden Başlat">
              🔄 Baştan Başla
            </button>
            ${this.options.isEmbedded ? `
              <button class="player-btn exit-btn" id="btn-exit-preview" title="Önizlemeden Çık">
                ✕ Editöre Dön
              </button>
            ` : ''}
          </div>
        </header>

        <main class="player-stage-viewport" id="player-viewport">
          <div class="player-stage" id="player-stage">
            <div class="player-targets-layer" id="player-targets"></div>
            <div class="player-draggables-layer" id="player-draggables"></div>
          </div>
        </main>

        <footer class="player-footer">
          <div class="player-hint" id="player-hint">
            💡 İpucu: Öğeleri doğru hedeflere sürükleyip bırakın. (Klavyeyle: Boşluk ile tut, hedefe git, Boşluk ile bırak)
          </div>
          <div class="player-footer-actions">
            <button class="player-btn primary-btn check-answers-btn" id="btn-check-answers" style="display: none;">
              ✓ Kontrol Et
            </button>
          </div>
        </footer>

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
    const soundBtn = this.container.querySelector('#btn-toggle-sound');
    if (soundBtn) {
      soundBtn.onclick = () => {
        this.audio.setEnabled(!this.audio.enabled);
        soundBtn.textContent = this.audio.enabled ? '🔊' : '🔇';
      };
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
    if (checkBtn) checkBtn.onclick = () => this.checkAllAnswers();

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

  setupResizeHandler() {
    this.stageEl = this.container.querySelector('#player-stage');
    this.viewportEl = this.container.querySelector('#player-viewport');

    this.onResizeBound = () => this.updateScale();
    window.addEventListener('resize', this.onResizeBound);

    if (typeof window !== 'undefined' && window.ResizeObserver && this.viewportEl) {
      this.resizeObserver = new window.ResizeObserver(() => {
        this.updateScale();
      });
      this.resizeObserver.observe(this.viewportEl);
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

    const vpRect = this.viewportEl.getBoundingClientRect();
    if (vpRect.width === 0 || vpRect.height === 0) {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.updateScale());
      }
      return;
    }

    const pad = vpRect.width < 600 ? 16 : 32;
    const availW = Math.max(vpRect.width - pad, 60);
    const availH = Math.max(vpRect.height - pad, 60);

    this.currentScale = Math.min(availW / stageW, availH / stageH);
    this.stageEl.style.transform = `scale(${this.currentScale})`;
    this.stageEl.style.transformOrigin = 'center center';
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
    this.container.querySelector('#stat-total').textContent = this.totalDraggables;
    this.container.querySelector('#stat-correct').textContent = '0';
    this.container.querySelector('#stat-attempts').textContent = '0';

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

    // Değerlendirme modu ayarı
    const isManualCheck = this.projectData.settings?.evaluationMode === 'submit';
    const checkBtn = this.container.querySelector('#btn-check-answers');
    if (checkBtn) {
      checkBtn.style.display = isManualCheck ? 'inline-block' : 'none';
    }
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
      ['target', 'category', 'sequence_slot'].includes(o.role)
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
      if (targetId && el.getAttribute('data-id') === targetId) {
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

    const isInstant = this.projectData.settings?.evaluationMode !== 'submit';
    this.attempts++;
    this.updateStats();

    if (isInstant) {
      this.evaluateSingleDrop(dragId, targetId);
    } else {
      // Manuel kontrol modunda doğrudan hedefe oturtulur, henüz doğrulanmaz
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

    if (isCorrect) {
      // DOĞRU CEVAP
      this.audio.playCorrect();
      this.placedMap[dragId] = targetId;
      this.correctCount++;
      this.updateStats();

      this.snapToTarget(dragId, targetObj);

      if (dragEl) {
        dragEl.classList.remove('is-incorrect');
        dragEl.classList.add('is-correct');

        if (this.projectData.settings?.correctAnswerBehavior === 'lock') {
          dragEl.classList.add('is-locked');
          dragEl.setAttribute('tabindex', '-1');
        }
      }

      this.emit('drop', { dragId, targetId, isCorrect: true });
      this.emit('step', this.getState());
      this.checkCompletion();
    } else {
      // YANLIŞ CEVAP
      this.audio.playWrong();

      if (dragEl) {
        dragEl.classList.add('is-incorrect');
        setTimeout(() => {
          if (dragEl) dragEl.classList.remove('is-incorrect');
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

    if (dragEl.classList.contains('is-correct')) {
      dragEl.classList.remove('is-correct');
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

  // Toplu Değerlendirme (Submit Modu)
  checkAllAnswers() {
    const answerKey = this.projectData.answerKey || {};
    let correct = 0;
    this.attempts++;

    for (const [dragId, targetId] of Object.entries(this.placedMap)) {
      const isRight = answerKey[dragId] === targetId;
      const dragEl = this.container.querySelector(`[data-id="${dragId}"]`);

      if (isRight) {
        correct++;
        if (dragEl) {
          dragEl.classList.remove('is-incorrect');
          dragEl.classList.add('is-correct');
          dragEl.classList.add('is-locked');
        }
      } else {
        if (dragEl) {
          dragEl.classList.add('is-incorrect');
        }
      }
    }

    this.correctCount = correct;
    this.updateStats();

    if (correct === this.totalDraggables) {
      this.isCompleted = true;
      this.audio.playComplete();
      this.showCompletionModal();
    } else {
      this.audio.playWrong();
      this.showHint('Bazı eşleştirmeler hatalı. Kırmızı ile işaretlenenleri düzeltmeyi deneyin.');
    }
  }

  checkCompletion() {
    if (this.correctCount >= this.totalDraggables && this.totalDraggables > 0) {
      if (!this.isCompleted) {
        this.isCompleted = true;
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

    const modal = this.container.querySelector('#completion-modal');
    if (modal) modal.style.display = 'none';

    this.prepareItems();
    this.emit('reset', this.getState());
  }
}

  windowObj.DND.ActivityEngine = ActivityEngine;

  var ActivityPlayer = class {
    constructor(options) {
      this.options = Object.assign({
        sound: true,
        onComplete: null,
        onStep: null,
        onDrop: null,
        onReset: null,
        onReady: null
      }, options || {});

      this.container = null;
      this.engine = null;
      this.isDestroyed = false;

      if (this.options.target) {
        this.resolveContainer(this.options.target);
      }

      if (this.options.data) {
        this.mount(this.options.data);
      } else if (this.options.src) {
        this.loadFromUrl(this.options.src);
      } else if (this.options.file) {
        this.loadFromFile(this.options.file);
      } else if (this.options.jsonString) {
        this.loadFromJsonString(this.options.jsonString);
      }
    }

    resolveContainer(target) {
      if (typeof target === 'string') {
        this.container = document.querySelector(target);
      } else if (target instanceof HTMLElement) {
        this.container = target;
      }
      if (!this.container) {
        throw new Error('[ActivityPlayer] Hedef container bulunamadı: ' + target);
      }
    }

    async loadFromUrl(url) {
      try {
        var response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        this.mount(data);
      } catch (err) {
        console.error('[ActivityPlayer] Veri yüklenemedi:', err);
        if (this.container) {
          this.container.innerHTML = '<div style="padding:20px;color:red;">⚠️ Veri yüklenemedi: ' + err.message + '</div>';
        }
        throw err;
      }
    }

    async loadFromFile(file) {
      if (!file) throw new Error('[ActivityPlayer] Dosya nesnesi boş olamaz.');
      try {
        var text = '';
        if (typeof file.text === 'function') {
          text = await file.text();
        } else {
          text = await new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'utf-8');
          });
        }
        this.loadFromJsonString(text);
      } catch (err) {
        console.error('[ActivityPlayer] Dosya okunamadı:', err);
        if (this.container) {
          this.container.innerHTML = '<div style="padding:20px;color:red;">⚠️ Dosya okunamadı: ' + err.message + '</div>';
        }
        throw err;
      }
    }

    loadFromJsonString(jsonString) {
      try {
        var data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        this.mount(data);
      } catch (err) {
        console.error('[ActivityPlayer] JSON ayrıştırma hatası:', err);
        if (this.container) {
          this.container.innerHTML = '<div style="padding:20px;color:red;">⚠️ Geçersiz JSON: ' + err.message + '</div>';
        }
        throw err;
      }
    }
    }

    mount(projectData) {
      if (this.isDestroyed || !this.container) return;
      if (this.engine) {
        this.engine.destroy();
        this.engine = null;
      }

      var engineOptions = {
        isEmbedded: false,
        onComplete: (res) => {
          if (typeof this.options.onComplete === 'function') this.options.onComplete(res);
        },
        onStep: (state) => {
          if (typeof this.options.onStep === 'function') this.options.onStep(state);
        },
        onDrop: (dropInfo) => {
          if (typeof this.options.onDrop === 'function') this.options.onDrop(dropInfo);
        },
        onReset: (state) => {
          if (typeof this.options.onReset === 'function') this.options.onReset(state);
        }
      };

      if (projectData.settings) {
        projectData.settings.soundEnabled = this.options.sound !== false;
      }

      this.engine = new ActivityEngine(this.container, projectData, engineOptions);

      if (typeof this.options.onReady === 'function') {
        this.options.onReady(this);
      }
    }

    on(event, callback) {
      return this.engine ? this.engine.on(event, callback) : function(){};
    }

    off(event, callback) {
      if (this.engine) this.engine.off(event, callback);
    }

    getState() {
      return this.engine ? this.engine.getState() : null;
    }

    setSound(enabled) {
      if (this.engine && this.engine.audio) {
        this.engine.audio.setEnabled(!!enabled);
      }
    }

    reset() {
      if (this.engine) this.engine.resetGame();
    }

    destroy() {
      if (this.isDestroyed) return;
      if (this.engine) {
        this.engine.destroy();
        this.engine = null;
      }
      if (this.container) {
        this.container.innerHTML = '';
      }
      this.isDestroyed = true;
    }
  };

  var DNDPlayerElement = class extends HTMLElement {
    static get observedAttributes() { return ['src', 'sound']; }
    constructor() {
      super();
      this._player = null;
      this._data = null;
    }
    connectedCallback() { this.render(); }
    disconnectedCallback() { if (this._player) { this._player.destroy(); this._player = null; } }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue || !this.isConnected) return;
      if (name === 'src' && newValue) this.initPlayer();
      else if (name === 'sound' && this._player) this._player.setSound(newValue !== 'false');
    }
    get data() { return this._data; }
    set data(val) { this._data = val; this.initPlayer(); }
    get player() { return this._player; }
    render() {
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.width = '100%';
      this.style.minHeight = this.style.minHeight || '500px';
      this.initPlayer();
    }
    initPlayer() {
      if (this._player) { this._player.destroy(); this._player = null; }
      var src = this.getAttribute('src');
      var soundAttr = this.getAttribute('sound');
      if (!src && !this._data) return;
      this._player = new ActivityPlayer({
        target: this,
        src: src || undefined,
        data: this._data || undefined,
        sound: soundAttr !== 'false',
        onComplete: (stats) => this.dispatchEvent(new CustomEvent('dnd:complete', { detail: stats, bubbles: true })),
        onStep: (state) => this.dispatchEvent(new CustomEvent('dnd:step', { detail: state, bubbles: true })),
        onDrop: (dropInfo) => this.dispatchEvent(new CustomEvent('dnd:drop', { detail: dropInfo, bubbles: true })),
        onReset: (state) => this.dispatchEvent(new CustomEvent('dnd:reset', { detail: state, bubbles: true })),
        onReady: (p) => this.dispatchEvent(new CustomEvent('dnd:ready', { detail: { player: p }, bubbles: true }))
      });
    }
    loadFile(file) {
      if (this._player) this._player.loadFromFile(file);
      else this._player = new ActivityPlayer({ target: this, file: file, sound: this.getAttribute('sound') !== 'false' });
    }
    loadJsonString(str) {
      if (this._player) this._player.loadFromJsonString(str);
      else this._player = new ActivityPlayer({ target: this, jsonString: str, sound: this.getAttribute('sound') !== 'false' });
    }
    reset() { if (this._player) this._player.reset(); }
    getState() { return this._player ? this._player.getState() : null; }
  };

  if (typeof customElements !== 'undefined' && !customElements.get('dnd-player')) {
    customElements.define('dnd-player', DNDPlayerElement);
  }

  exports.ActivityPlayer = ActivityPlayer;
  exports.DNDPlayerElement = DNDPlayerElement;
  exports.ActivityEngine = ActivityEngine;
  exports.AudioSynthesizer = AudioSynthesizer;
  exports.ValidationEngine = ValidationEngine;
}));
