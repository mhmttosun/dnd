/**
 * UIManager - DND arayüzü, üst başlık, ikincil araç çubuğu,
 * şablon kütüphanesi, mod geçişleri ve bildirimleri yönetir.
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
    this.isProjectDirty = false;
    this.templateShelfRendered = false;
    this.pendingTemplateId = null;
    this.templateLibrary = window.DND.TemplateLibrary
      ? new window.DND.TemplateLibrary()
      : null;

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
    this.isProjectDirty = !isSaved;
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

  downloadProjectJSON() {
    const projectData = this.core.getProjectData();
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeTitle = ((projectData.project && projectData.project.name) || 'etkinlik')
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/g, '_');
    const ownerDocument = this.root.ownerDocument || document;
    const anchor = ownerDocument.createElement('a');
    anchor.href = url;
    anchor.download = `${safeTitle}.json`;
    ownerDocument.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    this.updateSaveStatus(true);
    this.showToast('Proje JSON olarak kaydedildi.', 'success');
  }

  bindHeaderActions() {
    // 1. Proje Aç (JSON)
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

    // 2. Projeyi Kaydet (JSON İndir)
    const btnSave = this.root.getElementById('btn-save-project');
    if (btnSave) {
      btnSave.onclick = () => this.downloadProjectJSON();
    }

    // 3. HTML İndir
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
    // Şablon Önizleme Kütüphanesi Aç / Kapa
    const btnTemplates = this.root.getElementById('btn-toggle-templates');
    const templateShelf = this.root.getElementById('template-shelf');
    const templateRail = this.root.getElementById('template-rail');
    const btnMore = this.root.getElementById('btn-more-menu');
    const menuMore = this.root.getElementById('more-dropdown-menu');

    if (btnTemplates && templateShelf && templateRail && this.templateLibrary) {
      btnTemplates.onclick = (e) => {
        e.stopPropagation();
        if (menuMore) {
          menuMore.style.display = 'none';
          if (btnMore) btnMore.setAttribute('aria-expanded', 'false');
        }
        if (templateShelf.hidden) {
          this.ensureTemplateShelfRendered();
          this.openTemplateShelf();
        } else {
          this.closeTemplateShelf();
        }
      };

      templateRail.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        templateRail.scrollLeft += event.deltaY;
      }, this.options.signal ? { passive: false, signal: this.options.signal } : { passive: false });

      window.addEventListener('pointerdown', (event) => {
        if (templateShelf.hidden) return;
        const utils = window.DND.InteractionUtils;
        if (!utils.pathContains(event, templateShelf) && !utils.pathContains(event, btnTemplates)) {
          this.closeTemplateShelf();
        }
      }, this.options.signal ? { signal: this.options.signal } : undefined);

      this.root.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !templateShelf.hidden) {
          event.preventDefault();
          this.closeTemplateShelf();
          btnTemplates.focus();
        }
      }, this.options.signal ? { signal: this.options.signal } : undefined);
    }

    // Daha Fazla Seçenek Menüsü Aç / Kapa (Proje Aç, Çevrimdışı HTML İndir, Kaydet)
    if (btnMore && menuMore) {
      btnMore.onclick = (e) => {
        e.stopPropagation();
        this.closeTemplateShelf();
        const isHidden = menuMore.style.display === 'none';
        menuMore.style.display = isHidden ? 'flex' : 'none';
        btnMore.setAttribute('aria-expanded', String(isHidden));
      };

      window.addEventListener('click', () => {
        if (menuMore) {
          menuMore.style.display = 'none';
          btnMore.setAttribute('aria-expanded', 'false');
        }
      }, this.options.signal ? { signal: this.options.signal } : undefined);

      menuMore.querySelectorAll('.more-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          menuMore.style.display = 'none';
          btnMore.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Nesne Ekleme: Metin Kutusu
    const btnAddText = this.root.getElementById('btn-add-text');
    if (btnAddText) {
      btnAddText.onclick = () => {
        const obj = this.objectManager.createObject('text', 'decorative', {
          text: 'Metin yazın',
          x: 450,
          y: 280,
          width: 220,
          height: 48,
          fontSize: 18,
          fontWeight: '600',
          textColor: '#1e293b',
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4,
          boxShadow: 'none',
          padding: 4
        });
        this.selectionManager.select(obj.id);
      };
    }

    // Nesne Ekleme: Dikdörtgen / Kart
    const btnAddRect = this.root.getElementById('btn-add-rect');
    if (btnAddRect) {
      btnAddRect.onclick = () => {
        const obj = this.objectManager.createObject('rectangle', 'decorative', {
          text: '',
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
          text: '',
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
                text: '',
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

  ensureTemplateShelfRendered() {
    if (this.templateShelfRendered || !this.templateLibrary) return;
    const rail = this.root.getElementById('template-rail');
    if (!rail) return;
    const ownerDocument = this.root.ownerDocument || document;
    const fragment = ownerDocument.createDocumentFragment();

    this.templateLibrary.list().forEach(entry => {
      try {
        const card = ownerDocument.createElement('article');
        card.className = 'template-card';
        card.setAttribute('role', 'listitem');

        const preview = ownerDocument.createElement('div');
        preview.className = 'template-preview';
        preview.appendChild(this.templateLibrary.createPreviewElement(entry.project, ownerDocument));

        const startButton = ownerDocument.createElement('button');
        startButton.type = 'button';
        startButton.className = 'template-start-btn';
        startButton.textContent = 'Başla';
        startButton.setAttribute('aria-label', `${entry.project.project?.name || 'Şablon'} ile başla`);
        startButton.onclick = (event) => {
          event.stopPropagation();
          this.requestTemplateStart(entry.id);
        };

        card.append(preview, startButton);
        fragment.appendChild(card);
      } catch (error) {
        console.error(`[DND] Şablon önizlemesi oluşturulamadı: ${entry.id}`, error);
      }
    });

    rail.replaceChildren(fragment);
    this.templateShelfRendered = true;
  }

  openTemplateShelf() {
    const shelf = this.root.getElementById('template-shelf');
    const button = this.root.getElementById('btn-toggle-templates');
    if (!shelf || this.core.getMode() !== 'design') return;
    shelf.hidden = false;
    if (button) {
      button.classList.add('active');
      button.setAttribute('aria-expanded', 'true');
    }
  }

  closeTemplateShelf() {
    const shelf = this.root.getElementById('template-shelf');
    const button = this.root.getElementById('btn-toggle-templates');
    if (shelf) shelf.hidden = true;
    if (button) {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    }
  }

  requestTemplateStart(templateId) {
    if (!this.isProjectDirty) {
      this.applyTemplate(templateId);
      return;
    }

    const dialog = this.getTemplateConfirmDialog();
    if (dialog && typeof dialog.showModal === 'function') {
      this.pendingTemplateId = templateId;
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (window.confirm('Kaydedilmemiş değişiklikleriniz var. Şablonla devam edilsin mi?')) {
      this.applyTemplate(templateId);
    }
  }

  getTemplateConfirmDialog() {
    let dialog = this.root.getElementById('template-confirm-dialog');
    if (dialog) return dialog;
    const ownerDocument = this.root.ownerDocument || document;
    dialog = ownerDocument.createElement('dialog');
    dialog.id = 'template-confirm-dialog';
    dialog.className = 'template-confirm-dialog';

    const content = ownerDocument.createElement('div');
    content.className = 'template-confirm-content';
    const title = ownerDocument.createElement('strong');
    title.textContent = 'Kaydedilmemiş değişiklikler var';
    const message = ownerDocument.createElement('p');
    message.textContent = 'Şablon başlatıldığında mevcut çalışma yeni bir projeyle değiştirilecek.';
    const actions = ownerDocument.createElement('div');
    actions.className = 'template-confirm-actions';

    [
      ['cancel', 'Vazgeç', false],
      ['discard', 'Kaydetmeden devam et', false],
      ['save', 'Kaydet ve başla', true]
    ].forEach(([action, label, primary]) => {
      const button = ownerDocument.createElement('button');
      button.type = 'button';
      button.dataset.templateAction = action;
      button.textContent = label;
      if (primary) button.classList.add('is-primary');
      actions.appendChild(button);
    });

    content.append(title, message, actions);
    dialog.appendChild(content);
    (this.root.body || this.root).appendChild(dialog);

    dialog.addEventListener('click', event => {
      const button = event.target.closest('[data-template-action]');
      if (!button) return;
      const action = button.dataset.templateAction;
      const templateId = this.pendingTemplateId;
      this.pendingTemplateId = null;
      dialog.close();
      if (!templateId || action === 'cancel') return;
      if (action === 'save') this.downloadProjectJSON();
      this.applyTemplate(templateId);
    }, this.options.signal ? { signal: this.options.signal } : undefined);

    dialog.addEventListener('cancel', () => {
      this.pendingTemplateId = null;
    }, this.options.signal ? { signal: this.options.signal } : undefined);
    return dialog;
  }

  applyTemplate(templateId) {
    try {
      this.finishInlineEditing?.();
      const projectCopy = this.templateLibrary.instantiate(templateId);
      this.closeTemplateShelf();
      if (this.core.getMode() !== 'design') this.core.setMode('design');
      this.core.loadProject(projectCopy);
      this.updateSaveStatus(false);
      const fit = () => this.stageManager.fitToScreen();
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fit);
      else fit();
      this.showToast('Şablon kopyası sahneye eklendi.', 'success');
    } catch (error) {
      console.error('[DND] Şablon başlatılamadı:', error);
      this.showToast(`Şablon başlatılamadı: ${error.message}`, 'error');
    }
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
    if (newMode !== 'design') this.closeTemplateShelf();
    this.root.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === newMode);
    });

    const subToolbar = this.root.querySelector('.app-sub-toolbar');
    if (subToolbar) {
      subToolbar.classList.toggle('mode-answer-key', newMode === 'answer-key');
    }

    const clusterAdd = this.root.querySelector('.cluster-add-objects') || this.root.getElementById('cluster-add-objects');
    const clusterHistoryZoom = this.root.querySelector('.cluster-history-zoom') || this.root.getElementById('cluster-history-zoom');
    const templateLibrary = this.root.querySelector('.template-library-wrapper');
    if (clusterAdd) clusterAdd.style.display = newMode === 'answer-key' ? 'none' : 'flex';
    if (clusterHistoryZoom) clusterHistoryZoom.style.display = newMode === 'answer-key' ? 'none' : 'flex';
    if (templateLibrary) templateLibrary.style.display = newMode === 'design' ? '' : 'none';
    const moreMenuDivider = this.root.getElementById('more-menu-divider');
    if (moreMenuDivider) moreMenuDivider.style.display = newMode === 'answer-key' ? 'none' : 'block';

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
      // Shadow DOM event retargeting nedeniyle window seviyesinde e.target host
      // element olabilir. Gerçek tıklama yolu üzerinden düzenlenen alanı ve bu
      // editöre ait mini toolbar'ı ayırt et.
      const utils = window.DND.InteractionUtils;
      const clickedEditingTarget = utils.pathMatches(e, '.is-editing-text, .is-editing-text-target');
      const miniToolbar = this.root.getElementById
        ? this.root.getElementById('contextual-mini-toolbar')
        : this.root.querySelector('#contextual-mini-toolbar');
      const clickedMiniToolbar = utils.pathContains(e, miniToolbar);
      if (clickedEditingTarget || clickedMiniToolbar) {
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
      if (obj.type === 'image') {
        targetEl = document.createElement('div');
        targetEl.className = 'image-caption';
        targetEl.style.width = '100%';
        targetEl.style.textAlign = obj.textAlign || 'center';
        targetEl.textContent = obj.text || '';
        contentEl.appendChild(targetEl);
      } else {
        targetEl = document.createElement('span');
        targetEl.className = 'object-text-span';
        targetEl.style.width = '100%';
        targetEl.style.display = 'block';
        targetEl.style.textAlign = obj.textAlign || 'center';
        targetEl.textContent = obj.text || '';
        contentEl.appendChild(targetEl);
      }
    }

    this.isEditingText = true;
    this.activeEditingObjId = objId;
    this.core.emit('inlineEditingChanged', { isEditing: true, objectId: objId });

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
        if (obj && ['rectangle', 'circle', 'image'].includes(obj.type) && !newText.trim()) {
          newText = '';
        }

        if (obj && obj.text !== newText) {
          this.objectManager.updateObject(objId, { text: newText });
        } else if (obj && ['rectangle', 'circle', 'image'].includes(obj.type) && newText === '') {
          targetEl.remove();
        }
      }
    }

    // Seçim kutusunu normale döndür
    if (this.selectionManager && this.selectionManager.selectionOverlay) {
      this.selectionManager.selectionOverlay.classList.remove('is-editing-text');
      this.selectionManager.updateSelectionBox();
    }

    this.core.emit('inlineEditingChanged', { isEditing: false, objectId: objId });
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
