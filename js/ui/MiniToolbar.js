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
