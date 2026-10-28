/**
 * PropertyPanel - Sağ tarafta yer alan dinamik özellikler paneli.
 * Seçili nesnenin özelliklerini düzenleme, katmanlar ve nesne listesini yönetme,
 * kilit açma/kapama ve genel proje/oyun ayarlarını yapılandırma imkanı sunar.
 */
class PropertyPanel {
  constructor(core, objectManager, selectionManager, layerManager, panelEl) {
    this.core = core;
    this.objectManager = objectManager;
    this.selectionManager = selectionManager;
    this.layerManager = layerManager;
    this.panel = panelEl;

    this.activeTab = 'properties'; // 'properties' | 'layers' | 'answer-key' | 'settings'
    this.init();
  }

  init() {
    this.core.on('selectionChanged', () => this.render());
    this.core.on('objectUpdated', () => this.updateFieldsIfSelected());
    this.core.on('projectLoaded', () => this.render());
    this.core.on('activityTypeChanged', () => this.render());
    this.core.on('layerChanged', () => {
      if (this.activeTab === 'layers') this.render();
    });
    this.core.on('answerKeyChanged', () => {
      if (this.activeTab === 'answer-key') this.render();
    });

    this.render();
  }

  setTab(tabName) {
    this.activeTab = tabName;
    this.render();
  }

  render() {
    const selectedObj = this.selectionManager.getPrimarySelected();
    const selectedCount = this.selectionManager.selectedIds.size;

    this.panel.innerHTML = `
      <div class="panel-tabs">
        <button class="panel-tab-btn ${this.activeTab === 'properties' ? 'active' : ''}" data-tab="properties">
          ${selectedCount > 0 ? '🎨 Nesne' : '⚙️ Proje'}
        </button>
        <button class="panel-tab-btn ${this.activeTab === 'layers' ? 'active' : ''}" data-tab="layers">
          📑 Katmanlar
        </button>
        <button class="panel-tab-btn ${this.activeTab === 'answer-key' ? 'active' : ''}" data-tab="answer-key">
          🔑 Cevaplar
        </button>
        <button class="panel-tab-btn ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          🎮 Ayarlar
        </button>
      </div>
      <div class="panel-scroll-content">
        ${this.renderTabContent(selectedObj, selectedCount)}
      </div>
    `;

    // Tab buton dinleyicileri
    this.panel.querySelectorAll('.panel-tab-btn').forEach(btn => {
      btn.onclick = () => this.setTab(btn.getAttribute('data-tab'));
    });

    this.bindEvents(selectedObj);
  }

  renderTabContent(selectedObj, selectedCount) {
    if (this.activeTab === 'settings') {
      return this.renderProjectSettings();
    }

    if (this.activeTab === 'layers') {
      return this.renderLayersTab();
    }

    if (this.activeTab === 'answer-key') {
      return this.renderAnswerKeySettings(selectedObj);
    }

    // Properties Tab
    if (selectedCount > 1) {
      return this.renderMultiSelectProperties(selectedCount);
    }

    if (selectedObj) {
      return this.renderSingleObjectProperties(selectedObj);
    }

    return this.renderStageProperties();
  }

  renderSingleObjectProperties(obj) {
    const isText = obj.type === 'text';
    const isImage = obj.type === 'image';
    const isLine = obj.type === 'line';
    const isZone = ['target', 'category', 'sequence_slot'].includes(obj.role);

    return `
      <!-- Kilit Durumu ve Hızlı Kilit Açma/Kilitleme Bannerı -->
      ${obj.locked ? `
        <div class="locked-banner">
          <div class="locked-banner-info">
            <span class="locked-icon">🔒</span>
            <div>
              <strong style="color: #b45309;">Bu Nesne Kilitli</strong>
              <div class="locked-desc">Taşıma ve boyutlandırma korumalıdır.</div>
            </div>
          </div>
          <button type="button" class="btn-unlock-action" id="btn-unlock-prop" title="Kilidi Aç">🔓 Kilidi Aç</button>
        </div>
      ` : `
        <div class="lock-quick-bar">
          <button type="button" class="btn-lock-action" id="btn-lock-prop" title="Yanlışlıkla taşınmasını önlemek için kilitle">
            🔒 Nesneyi Kilitle
          </button>
        </div>
      `}

      <!-- Genel Bilgiler -->
      <div class="prop-group">
        <div class="prop-group-title">Genel Özellikler</div>
        <div class="prop-row">
          <label class="prop-label">Nesne Adı</label>
          <input type="text" class="prop-input" id="prop-name" value="${window.DND.ValidationEngine.sanitizeText(obj.name)}">
        </div>
        <div class="prop-row">
          <label class="prop-label">Nesne ID</label>
          <input type="text" class="prop-input readonly" value="${obj.id}" readonly>
        </div>
        <div class="prop-row">
          <label class="prop-label">Rol</label>
          <select class="prop-select" id="prop-role">
            <option value="decorative" ${obj.role === 'decorative' ? 'selected' : ''}>Dekoratif (Sabit)</option>
            <option value="draggable" ${obj.role === 'draggable' ? 'selected' : ''}>🎯 Sürüklenebilir Öğe</option>
            <option value="target" ${obj.role === 'target' ? 'selected' : ''}>📥 Hedef Alanı</option>
            <option value="category" ${obj.role === 'category' ? 'selected' : ''}>📦 Kategori Alanı</option>
            <option value="sequence_slot" ${obj.role === 'sequence_slot' ? 'selected' : ''}>🔢 Sıralama Yuvası</option>
          </select>
        </div>
      </div>

      <!-- Konum ve Boyut -->
      <div class="prop-group">
        <div class="prop-group-title">Konum ve Boyut (px)</div>
        <div class="prop-grid-2">
          <div class="prop-col">
            <label class="prop-sublabel">X</label>
            <input type="number" class="prop-input" id="prop-x" value="${Math.round(obj.x)}" ${obj.locked ? 'disabled' : ''}>
          </div>
          <div class="prop-col">
            <label class="prop-sublabel">Y</label>
            <input type="number" class="prop-input" id="prop-y" value="${Math.round(obj.y)}" ${obj.locked ? 'disabled' : ''}>
          </div>
        </div>
        <div class="prop-grid-2">
          <div class="prop-col">
            <label class="prop-sublabel">Genişlik</label>
            <input type="number" class="prop-input" id="prop-width" value="${Math.round(obj.width)}" ${obj.locked ? 'disabled' : ''}>
          </div>
          <div class="prop-col">
            <label class="prop-sublabel">Yükseklik</label>
            <input type="number" class="prop-input" id="prop-height" value="${Math.round(obj.height)}" ${obj.locked ? 'disabled' : ''}>
          </div>
        </div>
        <div class="prop-grid-2">
          <div class="prop-col">
            <label class="prop-sublabel">Döndürme (°)</label>
            <input type="number" class="prop-input" id="prop-rotation" value="${Math.round(obj.rotation || 0)}" ${obj.locked ? 'disabled' : ''}>
          </div>
          <div class="prop-col">
            <label class="prop-sublabel">Opaklık (0-1)</label>
            <input type="number" class="prop-input" id="prop-opacity" step="0.1" min="0" max="1" value="${obj.opacity !== undefined ? obj.opacity : 1}">
          </div>
        </div>
      </div>

      <!-- Katman ve Durum -->
      <div class="prop-group">
        <div class="prop-group-title">Katman ve Kilit</div>
        <div class="prop-btn-row">
          <button class="prop-tool-btn" id="btn-bring-front" title="En Öne Getir">🔝 En Öne</button>
          <button class="prop-tool-btn" id="btn-bring-forward" title="Bir Katman Öne">⬆️ Öne</button>
          <button class="prop-tool-btn" id="btn-send-backward" title="Bir Katman Arkaya">⬇️ Arkaya</button>
          <button class="prop-tool-btn" id="btn-send-back" title="En Arkaya Gönder">🔚 En Arkaya</button>
        </div>
        <div class="prop-row checkbox-row" style="margin-top: 6px;">
          <label><input type="checkbox" id="prop-locked" ${obj.locked ? 'checked' : ''}> 🔒 Nesneyi Kilitle (Taşınamaz)</label>
        </div>
      </div>

      ${isLine ? `
        <!-- Çizgi Görünümü -->
        <div class="prop-group">
          <div class="prop-group-title">Çizgi Görünümü</div>
          <div class="prop-grid-2">
            <div class="prop-col">
              <label class="prop-sublabel">Çizgi Rengi</label>
              <input type="color" class="prop-color-picker" id="prop-bordercolor" value="${this.sanitizeColorHex(obj.borderColor, '#1e293b')}">
            </div>
            <div class="prop-col">
              <label class="prop-sublabel">Çizgi Kalınlığı (px)</label>
              <input type="number" class="prop-input" id="prop-borderwidth" min="1" max="40" value="${obj.borderWidth !== undefined ? obj.borderWidth : 3}">
            </div>
          </div>
          <div class="prop-row">
            <label class="prop-label">Çizgi Stili</label>
            <select class="prop-select" id="prop-borderstyle">
              <option value="solid" ${obj.borderStyle === 'solid' ? 'selected' : ''}>Düz (Solid)</option>
              <option value="dashed" ${obj.borderStyle === 'dashed' ? 'selected' : ''}>Kesikli (Dashed)</option>
              <option value="dotted" ${obj.borderStyle === 'dotted' ? 'selected' : ''}>Noktalı (Dotted)</option>
            </select>
          </div>
        </div>
      ` : `
        <!-- Metin ve Tipografi -->
        <div class="prop-group">
          <div class="prop-group-title">İçerik ve Tipografi</div>
          <div class="prop-row">
            <label class="prop-label">Metin</label>
            <textarea class="prop-textarea" id="prop-text" rows="2">${window.DND.ValidationEngine.sanitizeText(obj.text || '')}</textarea>
          </div>
          <div class="prop-grid-2">
            <div class="prop-col">
              <label class="prop-sublabel">Boyut (px)</label>
              <input type="number" class="prop-input" id="prop-fontsize" value="${obj.fontSize || 16}">
            </div>
            <div class="prop-col">
              <label class="prop-sublabel">Yazı Rengi</label>
              <input type="color" class="prop-color-picker" id="prop-textcolor" value="${obj.textColor || '#1e293b'}">
            </div>
          </div>
          <div class="prop-grid-2">
            <div class="prop-col">
              <label class="prop-sublabel">Kalınlık</label>
              <select class="prop-select" id="prop-fontweight">
                <option value="normal" ${obj.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="600" ${obj.fontWeight === '600' ? 'selected' : ''}>Yarı Kalın</option>
                <option value="bold" ${obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === '800' ? 'selected' : ''}>Kalın</option>
              </select>
            </div>
            <div class="prop-col">
              <label class="prop-sublabel">Hizalama</label>
              <select class="prop-select" id="prop-textalign">
                <option value="left" ${obj.textAlign === 'left' ? 'selected' : ''}>Sol</option>
                <option value="center" ${obj.textAlign === 'center' ? 'selected' : ''}>Orta</option>
                <option value="right" ${obj.textAlign === 'right' ? 'selected' : ''}>Sağ</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Görünüm ve Kenarlık -->
        <div class="prop-group">
          <div class="prop-group-title">Renk ve Kenarlık</div>
          <div class="prop-grid-2">
            <div class="prop-col">
              <label class="prop-sublabel">Arka Plan</label>
              <input type="color" class="prop-color-picker" id="prop-bgcolor" value="${this.sanitizeColorHex(obj.backgroundColor, '#ffffff')}">
            </div>
            <div class="prop-col">
              <label class="prop-sublabel">Kenarlık Rengi</label>
              <input type="color" class="prop-color-picker" id="prop-bordercolor" value="${this.sanitizeColorHex(obj.borderColor, '#94a3b8')}">
            </div>
          </div>
          <div class="prop-grid-2">
            <div class="prop-col">
              <label class="prop-sublabel">Kenar Kalınlığı</label>
              <input type="number" class="prop-input" id="prop-borderwidth" min="0" max="20" value="${obj.borderWidth !== undefined ? obj.borderWidth : 2}">
            </div>
            <div class="prop-col">
              <label class="prop-sublabel">Köşe Yuvarlaklığı</label>
              <input type="number" class="prop-input" id="prop-borderradius" min="0" max="100" value="${obj.borderRadius !== undefined ? obj.borderRadius : 8}">
            </div>
          </div>
          <div class="prop-row">
            <label class="prop-label">Kenar Stili</label>
            <select class="prop-select" id="prop-borderstyle">
              <option value="solid" ${obj.borderStyle === 'solid' ? 'selected' : ''}>Düz (Solid)</option>
              <option value="dashed" ${obj.borderStyle === 'dashed' ? 'selected' : ''}>Kesikli (Dashed)</option>
              <option value="dotted" ${obj.borderStyle === 'dotted' ? 'selected' : ''}>Noktalı (Dotted)</option>
              <option value="none" ${obj.borderStyle === 'none' ? 'selected' : ''}>Yok</option>
            </select>
          </div>
        </div>
      `}

      <!-- Hedef / Kategori Özel Alanları -->
      ${isZone ? `
        <div class="prop-group">
          <div class="prop-group-title">Hedef / Kategori Ayarları</div>
          ${obj.role === 'category' ? `
            <div class="prop-row">
              <label class="prop-label">Kapasite (0 = Sınırsız)</label>
              <input type="number" class="prop-input" id="prop-acceptlimit" min="0" value="${obj.acceptLimit || 0}">
            </div>
          ` : ''}
          ${obj.role === 'sequence_slot' ? `
            <div class="prop-row">
              <label class="prop-label">Sıra Numarası (Adım)</label>
              <input type="number" class="prop-input" id="prop-slotindex" min="0" value="${obj.slotIndex !== undefined ? obj.slotIndex + 1 : 1}">
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Silme Butonu -->
      <div class="prop-group">
        <button class="prop-danger-btn" id="btn-delete-selected">🗑️ Nesneyi Sil</button>
      </div>
    `;
  }

  renderLayersTab() {
    const objects = [...this.objectManager.getObjects()].sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1));
    const selectedIds = this.selectionManager.selectedIds;

    return `
      <div class="prop-group">
        <div class="prop-group-title">📑 Sahne Nesneleri ve Katmanlar</div>
        <p class="prop-info-text">
          Sahnedeki tüm nesneleri listeleyebilir, tıklayarak seçebilir, kilitlerini açıp kapatabilir veya gizleyebilirsiniz.
        </p>

        <div class="layers-list">
          ${objects.length === 0 ? '<p class="prop-empty-text">Henüz nesne eklenmedi.</p>' : ''}
          ${objects.map(obj => {
            const isSelected = selectedIds.has(obj.id);
            let roleIcon = '🎨';
            if (obj.role === 'draggable') roleIcon = '🎯';
            else if (obj.role === 'target') roleIcon = '📥';
            else if (obj.role === 'category') roleIcon = '📦';
            else if (obj.role === 'sequence_slot') roleIcon = '🔢';
            else if (obj.type === 'image') roleIcon = '🖼️';
            else if (obj.type === 'line') roleIcon = '━';

            return `
              <div class="layer-item-row ${isSelected ? 'is-active' : ''} ${obj.locked ? 'is-locked-row' : ''}" data-layer-id="${obj.id}">
                <div class="layer-item-left" data-layer-select="${obj.id}" title="Tuvalde seçmek için tıklayın">
                  <span class="layer-role-icon">${roleIcon}</span>
                  <span class="layer-name">${window.DND.ValidationEngine.sanitizeText(obj.name || obj.text || obj.id)}</span>
                </div>
                <div class="layer-item-actions">
                  <button type="button" class="layer-action-btn btn-toggle-lock ${obj.locked ? 'active-locked' : ''}" data-lock-id="${obj.id}" title="${obj.locked ? 'Kilidi Aç' : 'Kilitle'}">
                    ${obj.locked ? '🔒' : '🔓'}
                  </button>
                  <button type="button" class="layer-action-btn btn-toggle-visibility ${obj.visible === false ? 'is-hidden' : ''}" data-vis-id="${obj.id}" title="${obj.visible === false ? 'Görünür Yap' : 'Gizle'}">
                    ${obj.visible === false ? '🙈' : '👁️'}
                  </button>
                  <button type="button" class="layer-action-btn btn-delete-layer" data-del-id="${obj.id}" title="Sil">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderMultiSelectProperties(count) {
    return `
      <div class="prop-group">
        <div class="prop-group-title">Çoklu Seçim</div>
        <p class="prop-info-text">Şu anda <strong>${count}</strong> nesne seçili durumda.</p>
        <div class="prop-btn-row">
          <button class="prop-tool-btn" id="btn-bring-front">🔝 En Öne</button>
          <button class="prop-tool-btn" id="btn-send-back">🔚 En Arkaya</button>
        </div>
        <button class="prop-danger-btn" id="btn-delete-selected" style="margin-top:12px;">🗑️ Seçilenleri Sil</button>
      </div>
    `;
  }

  renderStageProperties() {
    const stage = this.core.data.stage;
    const project = this.core.data.project;

    return `
      <div class="prop-group">
        <div class="prop-group-title">Sahne ve Tuval Özellikleri</div>
        <p class="prop-info-text">Hiçbir nesne seçili değil. Sahne ayarlarını düzenleyebilirsiniz.</p>
        <div class="prop-row">
          <label class="prop-label">Etkinlik Türü</label>
          <select class="prop-select" id="prop-activity-type">
            <option value="image-labeling" ${project.activityType === 'image-labeling' ? 'selected' : ''}>Görsel Üzerinde Etiketleme</option>
            <option value="matching" ${project.activityType === 'matching' ? 'selected' : ''}>Sürükle-Bırak Eşleştirme</option>
            <option value="categorization" ${project.activityType === 'categorization' ? 'selected' : ''}>Kategorilere Ayırma</option>
            <option value="sequencing" ${project.activityType === 'sequencing' ? 'selected' : ''}>Sürükleyerek Sıralama</option>
          </select>
        </div>
        <div class="prop-grid-2">
          <div class="prop-col">
            <label class="prop-sublabel">Genişlik</label>
            <input type="number" class="prop-input readonly" value="${stage.width}" readonly>
          </div>
          <div class="prop-col">
            <label class="prop-sublabel">Yükseklik</label>
            <input type="number" class="prop-input readonly" value="${stage.height}" readonly>
          </div>
        </div>
        <div class="prop-row">
          <label class="prop-label">Sahne Arka Plan Rengi</label>
          <input type="color" class="prop-color-picker" id="prop-stage-bg" value="${this.sanitizeColorHex(stage.backgroundColor, '#f8fafc')}">
        </div>
        <div class="prop-row">
          <label class="prop-label">Arka Plan Görseli</label>
          <input type="file" id="prop-stage-bg-file" accept="image/*" class="prop-file-input">
          ${stage.backgroundImage ? `
            <button class="prop-tool-btn" id="btn-remove-stage-bg" style="margin-top:6px;">Görseli Kaldır</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderAnswerKeySettings(selectedObj) {
    const activityType = this.core.data.project.activityType;
    const answerKey = this.core.data.answerKey || {};
    const draggables = this.core.data.objects.filter(o => o.role === 'draggable');
    const targets = this.core.data.objects.filter(o =>
      ['target', 'category', 'sequence_slot'].includes(o.role) ||
      (activityType === 'matching' && o.role !== 'draggable')
    );

    return `
      <div class="prop-group">
        <div class="prop-group-title">🔑 Cevap Anahtarı Yönetimi</div>
        <p class="prop-info-text">
          Sürüklenebilir nesnelerin doğru hedeflerini aşağıdaki listeden belirleyebilir
          veya üst araç çubuğundaki <strong>"Cevap Anahtarı"</strong> moduna geçip
          sahne üzerinde nesnelere tıklayarak görsel olarak bağlayabilirsiniz.
        </p>

        <div class="ak-mappings-list">
          ${draggables.length === 0 ? '<p class="prop-empty-text">Henüz sürüklenebilir nesne eklenmedi.</p>' : ''}
          ${draggables.map(drag => {
            const currentTargetId = answerKey[drag.id] || '';
            const isAssigned = !!currentTargetId;

            return `
              <div class="ak-item-row ${drag.id === selectedObj?.id ? 'highlight-row' : ''}">
                <div class="ak-item-header">
                  <span class="ak-drag-name">🎯 ${window.DND.ValidationEngine.sanitizeText(drag.name || drag.text || drag.id)}</span>
                  <span class="ak-status-pill ${isAssigned ? 'assigned' : 'unassigned'}">
                    ${isAssigned ? '✓ Eşleşti' : '✕ Hedef Yok'}
                  </span>
                </div>
                <div class="ak-select-wrap">
                  <select class="prop-select ak-target-select" data-drag-id="${drag.id}">
                    <option value="">-- Doğru Hedefi Seçin --</option>
                    ${targets.map(t => `
                      <option value="${t.id}" ${currentTargetId === t.id ? 'selected' : ''}>
                        ${t.role === 'category' ? '📦 ' : (t.role === 'sequence_slot' ? '🔢 ' : '📥 ')}
                        ${window.DND.ValidationEngine.sanitizeText(t.name || t.text || t.id)}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderProjectSettings() {
    const settings = this.core.data.settings;

    return `
      <div class="prop-group">
        <div class="prop-group-title">🎮 Oyun ve Değerlendirme Ayarları</div>

        <div class="prop-row">
          <label class="prop-label">Değerlendirme Modu</label>
          <select class="prop-select" id="setting-evaluation-mode">
            <option value="instant" ${settings.evaluationMode === 'instant' ? 'selected' : ''}>Anında Kontrol (Bırakıldığı Anda)</option>
            <option value="submit" ${settings.evaluationMode === 'submit' ? 'selected' : ''}>"Kontrol Et" Butonuyla (Toplu)</option>
          </select>
        </div>

        <div class="prop-row">
          <label class="prop-label">Yanlış Cevap Davranışı</label>
          <select class="prop-select" id="setting-wrong-behavior">
            <option value="return" ${settings.wrongAnswerBehavior === 'return' ? 'selected' : ''}>Başlangıç Konumuna Döndür</option>
            <option value="stay" ${settings.wrongAnswerBehavior === 'stay' ? 'selected' : ''}>Olduğu Yerde Bırak (Kırmızı Göster)</option>
          </select>
        </div>

        <div class="prop-row checkbox-row">
          <label><input type="checkbox" id="setting-shuffle" ${settings.shuffleDraggables ? 'checked' : ''}> Sürüklenebilir Nesneleri Karıştır</label>
        </div>

        <div class="prop-row checkbox-row">
          <label><input type="checkbox" id="setting-sound" ${settings.soundEnabled ? 'checked' : ''}> Ses Efektlerini Aç</label>
        </div>

        <div class="prop-row checkbox-row">
          <label><input type="checkbox" id="setting-retry" ${settings.allowRetry ? 'checked' : ''}> Tekrar Denemeye İzin Ver</label>
        </div>

        <div class="prop-row">
          <label class="prop-label">Tamamlanma Kutlama Mesajı</label>
          <textarea class="prop-textarea" id="setting-completion-msg" rows="3">${window.DND.ValidationEngine.sanitizeText(settings.completionMessage || '')}</textarea>
        </div>
      </div>
    `;
  }

  bindEvents(selectedObj) {
    // 1. Katmanlar Tabı Dinleyicileri
    if (this.activeTab === 'layers') {
      this.panel.querySelectorAll('[data-layer-select]').forEach(el => {
        el.onclick = () => {
          const id = el.getAttribute('data-layer-select');
          this.selectionManager.select(id, false);
          this.render();
        };
      });

      this.panel.querySelectorAll('[data-lock-id]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-lock-id');
          const obj = this.objectManager.getObject(id);
          if (obj) {
            this.objectManager.updateObject(id, { locked: !obj.locked });
            this.selectionManager.updateSelectionBox();
            this.render();
          }
        };
      });

      this.panel.querySelectorAll('[data-vis-id]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-vis-id');
          const obj = this.objectManager.getObject(id);
          if (obj) {
            this.objectManager.updateObject(id, { visible: obj.visible === false });
            this.selectionManager.updateSelectionBox();
            this.render();
          }
        };
      });

      this.panel.querySelectorAll('[data-del-id]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-del-id');
          this.objectManager.deleteObject(id);
          this.selectionManager.deselect(id);
          this.render();
        };
      });
      return;
    }

    if (!selectedObj) {
      // Sahne ve proje ayarları dinleyicileri
      const actTypeSelect = this.panel.querySelector('#prop-activity-type');
      if (actTypeSelect) {
        actTypeSelect.onchange = (e) => this.core.setActivityType(e.target.value);
      }

      const stageBg = this.panel.querySelector('#prop-stage-bg');
      if (stageBg) {
        stageBg.oninput = (e) => this.core.updateStage({ backgroundColor: e.target.value });
      }

      const stageBgFile = this.panel.querySelector('#prop-stage-bg-file');
      if (stageBgFile) {
        stageBgFile.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => this.core.updateStage({ backgroundImage: re.target.result });
            reader.readAsDataURL(file);
          }
        };
      }

      const removeBgBtn = this.panel.querySelector('#btn-remove-stage-bg');
      if (removeBgBtn) {
        removeBgBtn.onclick = () => this.core.updateStage({ backgroundImage: null });
      }
    } else {
      // Seçili nesne özellikleri dinleyicileri
      const id = selectedObj.id;

      const update = (props) => {
        const targets = this.selectionManager.getSelectedObjects();
        if (targets.length > 1) {
          targets.forEach(o => this.objectManager.updateObject(o.id, props, true));
        } else {
          this.objectManager.updateObject(id, props, true);
        }
        this.selectionManager.updateSelectionBox();
      };

      // Kilit açma/kapama butonları
      const unlockPropBtn = this.panel.querySelector('#btn-unlock-prop');
      if (unlockPropBtn) {
        unlockPropBtn.onclick = () => {
          update({ locked: false });
          this.render();
        };
      }

      const lockPropBtn = this.panel.querySelector('#btn-lock-prop');
      if (lockPropBtn) {
        lockPropBtn.onclick = () => {
          update({ locked: true });
          this.render();
        };
      }

      const bindInput = (selector, prop, isNumber = false) => {
        const el = this.panel.querySelector(selector);
        if (el) {
          el.oninput = (e) => {
            const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
            update({ [prop]: val });
          };
        }
      };

      bindInput('#prop-name', 'name');
      bindInput('#prop-x', 'x', true);
      bindInput('#prop-y', 'y', true);
      bindInput('#prop-width', 'width', true);
      bindInput('#prop-height', 'height', true);
      bindInput('#prop-rotation', 'rotation', true);
      bindInput('#prop-opacity', 'opacity', true);

      bindInput('#prop-text', 'text');
      bindInput('#prop-fontsize', 'fontSize', true);
      bindInput('#prop-textcolor', 'textColor');
      bindInput('#prop-fontweight', 'fontWeight');
      bindInput('#prop-textalign', 'textAlign');

      bindInput('#prop-bgcolor', 'backgroundColor');
      bindInput('#prop-bordercolor', 'borderColor');
      bindInput('#prop-borderwidth', 'borderWidth', true);
      bindInput('#prop-borderradius', 'borderRadius', true);
      bindInput('#prop-borderstyle', 'borderStyle');

      const roleSelect = this.panel.querySelector('#prop-role');
      if (roleSelect) {
        roleSelect.onchange = (e) => {
          update({ role: e.target.value });
          this.render();
        };
      }

      const lockedCb = this.panel.querySelector('#prop-locked');
      if (lockedCb) {
        lockedCb.onchange = (e) => {
          update({ locked: e.target.checked });
          this.render();
        };
      }

      const acceptLimitInput = this.panel.querySelector('#prop-acceptlimit');
      if (acceptLimitInput) {
        acceptLimitInput.oninput = (e) => update({ acceptLimit: parseInt(e.target.value, 10) || 0 });
      }

      const slotIndexInput = this.panel.querySelector('#prop-slotindex');
      if (slotIndexInput) {
        slotIndexInput.oninput = (e) => update({ slotIndex: (parseInt(e.target.value, 10) || 1) - 1 });
      }

      // Katman butonları
      const bringFront = this.panel.querySelector('#btn-bring-front');
      if (bringFront) bringFront.onclick = () => this.layerManager.bringToFront(id);

      const bringForward = this.panel.querySelector('#btn-bring-forward');
      if (bringForward) bringForward.onclick = () => this.layerManager.bringForward(id);

      const sendBackward = this.panel.querySelector('#btn-send-backward');
      if (sendBackward) sendBackward.onclick = () => this.layerManager.sendBackward(id);

      const sendBack = this.panel.querySelector('#btn-send-back');
      if (sendBack) sendBack.onclick = () => this.layerManager.sendToBack(id);

      const deleteBtn = this.panel.querySelector('#btn-delete-selected');
      if (deleteBtn) deleteBtn.onclick = () => this.selectionManager.deleteSelected();
    }

    // Cevap Anahtarı Açılır Kutuları Dinleyicisi
    this.panel.querySelectorAll('.ak-target-select').forEach(sel => {
      sel.onchange = (e) => {
        const dragId = sel.getAttribute('data-drag-id');
        const targetId = e.target.value;
        if (targetId) {
          this.core.data.answerKey[dragId] = targetId;
        } else {
          delete this.core.data.answerKey[dragId];
        }
        this.core.emit('answerKeyChanged', { answerKey: this.core.data.answerKey });
        this.core.autoSave();
        this.render();
      };
    });

    // Oyun Ayarları Dinleyicileri
    const evalMode = this.panel.querySelector('#setting-evaluation-mode');
    if (evalMode) {
      evalMode.onchange = (e) => this.core.updateSettings({ evaluationMode: e.target.value });
    }

    const wrongBeh = this.panel.querySelector('#setting-wrong-behavior');
    if (wrongBeh) {
      wrongBeh.onchange = (e) => this.core.updateSettings({ wrongAnswerBehavior: e.target.value });
    }

    const shuffleCb = this.panel.querySelector('#setting-shuffle');
    if (shuffleCb) {
      shuffleCb.onchange = (e) => this.core.updateSettings({ shuffleDraggables: e.target.checked });
    }

    const soundCb = this.panel.querySelector('#setting-sound');
    if (soundCb) {
      soundCb.onchange = (e) => this.core.updateSettings({ soundEnabled: e.target.checked });
    }

    const retryCb = this.panel.querySelector('#setting-retry');
    if (retryCb) {
      retryCb.onchange = (e) => this.core.updateSettings({ allowRetry: e.target.checked });
    }

    const completionMsg = this.panel.querySelector('#setting-completion-msg');
    if (completionMsg) {
      completionMsg.oninput = (e) => this.core.updateSettings({ completionMessage: e.target.value });
    }
  }

  updateFieldsIfSelected() {
    const selectedObj = this.selectionManager.getPrimarySelected();
    if (!selectedObj) return;

    const setVal = (id, val) => {
      const el = this.panel.querySelector(id);
      if (el && document.activeElement !== el) el.value = val;
    };

    setVal('#prop-x', Math.round(selectedObj.x));
    setVal('#prop-y', Math.round(selectedObj.y));
    setVal('#prop-width', Math.round(selectedObj.width));
    setVal('#prop-height', Math.round(selectedObj.height));
    setVal('#prop-rotation', Math.round(selectedObj.rotation || 0));
  }

  sanitizeColorHex(val, fallback = '#000000') {
    if (!val || typeof val !== 'string') return fallback;
    if (val.startsWith('#') && (val.length === 7 || val.length === 4)) {
      return val;
    }
    return fallback;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.PropertyPanel = PropertyPanel;
