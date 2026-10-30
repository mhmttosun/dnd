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
    const iconBadge = bar.querySelector('.ak-guide-icon-badge');

    if (titleEl) titleEl.textContent = state.title;
    if (instructionEl) instructionEl.textContent = state.instruction;

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
