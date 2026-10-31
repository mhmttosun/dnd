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
    this.root = options.root || (stageEl && typeof stageEl.getRootNode === 'function' ? stageEl.getRootNode() : document);

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
    // Sahne klavye kısayolları için gerçek bir focus hedefidir. Böylece
    // Shadow DOM içindeki keydown olayları yalnızca ilgili editör root'unda kalır.
    if (!this.stage.hasAttribute('tabindex')) this.stage.tabIndex = 0;
    if (!this.stage.hasAttribute('aria-label')) this.stage.setAttribute('aria-label', 'Tasarım sahnesi');

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

    // Sahne veya nesne tıklaması bu editörü klavye etkileşimleri için aktif eder.
    // Buton ve form elemanlarının kendi focus davranışı korunur.
    const utils = window.DND.InteractionUtils;
    const hasInteractiveTarget = utils.getEventPath(e).some(node => utils.isInteractiveElement(node));
    if (!hasInteractiveTarget && typeof this.stage.focus === 'function') {
      try {
        this.stage.focus({ preventScroll: true });
      } catch (error) {
        this.stage.focus();
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

    if (this.core && typeof this.core.beginTransaction === 'function') {
      this.core.beginTransaction({ source: 'move', description: 'Nesneleri Taşı' });
    }
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

    if (this.core && typeof this.core.beginTransaction === 'function') {
      this.core.beginTransaction({ source: 'resize', description: 'Nesneyi Boyutlandır' });
    }
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

    if (this.core && typeof this.core.beginTransaction === 'function') {
      this.core.beginTransaction({ source: 'rotate', description: 'Nesneyi Döndür' });
    }
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

    if (!this.hasMovedOrDragged && this.activeAction !== 'marquee') {
      return;
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

      this.objectManager.updateObject(item.id, { x: newX, y: newY }, { transient: true, saveHistory: false, source: 'move' });
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
        }, { transient: true, saveHistory: false, source: 'resize' });
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
        }, { transient: true, saveHistory: false, source: 'resize' });
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
    }, { transient: true, saveHistory: false, source: 'resize' });

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
    }, { transient: true, saveHistory: false, source: 'rotate' });

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

    const prevAction = this.activeAction;
    const wasDragged = this.hasMovedOrDragged;
    const isMarquee = prevAction === 'marquee';

    try {
      if (['move', 'resize', 'rotate'].includes(prevAction)) {
        if (wasDragged) {
          let desc = 'Nesneleri Taşı';
          if (prevAction === 'resize') desc = 'Nesneyi Boyutlandır';
          if (prevAction === 'rotate') desc = 'Nesneyi Döndür';

          if (this.core && typeof this.core.endTransaction === 'function') {
            this.core.endTransaction({
              source: prevAction,
              description: desc,
              forceCommit: true,
              saveHistory: true,
              persist: true,
              emitDataChanged: true
            });
          } else {
            this.historyManager.pushState(desc);
            this.core.emit('dataChanged', { source: prevAction });
            this.core.autoSave();
          }
        } else {
          // Hareket gerçekleşmedi: transaction geri alınır
          if (this.core && typeof this.core.rollbackTransaction === 'function') {
            this.core.rollbackTransaction();
          }
        }
      }
    } finally {
      // Güvenli temizlik: Açık veya yarım transaction kalması engellenir
      if (this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction()) {
        this.core.rollbackTransaction();
      }

      this.activeAction = null;
      this.activeHandle = null;
      this.activePointerId = null;
      this.startObjectsData = [];
      this.isPointerDown = false;
      this.isMarqueeShift = false;
      this.initialMarqueeSelectedIds = null;
    }

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
