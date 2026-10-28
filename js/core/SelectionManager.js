/**
 * SelectionManager - Tekli ve çoklu nesne seçimi, seçim çerçevesi,
 * 8 yönlü boyutlandırma tutamaçları ve döndürme tutamacını yönetir.
 */
class SelectionManager {
  constructor(core, stageManager, objectManager, stageEl) {
    this.core = core;
    this.stageManager = stageManager;
    this.objectManager = objectManager;
    this.stage = stageEl;

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
    });
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
