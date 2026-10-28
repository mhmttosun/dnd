/**
 * UIManager - CNVS arayüzü, üst başlık, ikincil araç çubuğu,
 * şablonlar menüsü, mod geçişleri ve bildirimleri yönetir.
 * Yan paneller kaldırılmış, tam ekran tuval düzeni uygulanmıştır.
 */
class UIManager {
  constructor(core, stageManager, objectManager, selectionManager, historyManager, exportManager) {
    this.core = core;
    this.stageManager = stageManager;
    this.objectManager = objectManager;
    this.selectionManager = selectionManager;
    this.historyManager = historyManager;
    this.exportManager = exportManager;

    this.previewContainer = document.getElementById('preview-container');
    this.editorContainer = document.getElementById('editor-layout');
    this.activePlayerInstance = null;
    this.activeTool = 'select'; // 'select' | 'hand'

    this.init();
  }

  init() {
    this.bindHeaderActions();
    this.bindSubToolbar();
    this.bindModeSwitcher();
    this.bindProjectTitle();
    this.bindInlineTextEditing();

    this.core.on('historyChanged', ({ canUndo, canRedo }) => {
      const undoBtn = document.getElementById('btn-undo');
      const redoBtn = document.getElementById('btn-redo');
      if (undoBtn) undoBtn.disabled = !canUndo;
      if (redoBtn) redoBtn.disabled = !canRedo;
    });

    this.core.on('projectNameChanged', ({ name }) => {
      const titleInput = document.getElementById('project-title-input');
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
    const statusBox = document.querySelector('.project-save-status');
    const statusText = document.getElementById('status-text');
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
    const btnNew = document.getElementById('btn-new-project');
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
    const btnOpen = document.getElementById('btn-open-project');
    const fileInput = document.getElementById('file-input-project');
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
    const btnSave = document.getElementById('btn-save-project');
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
    const btnExport = document.getElementById('btn-export-html');
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
    const btnTemplates = document.getElementById('btn-toggle-templates');
    const menuTemplates = document.getElementById('templates-menu');

    if (btnTemplates && menuTemplates) {
      btnTemplates.onclick = (e) => {
        e.stopPropagation();
        const isHidden = menuTemplates.style.display === 'none';
        menuTemplates.style.display = isHidden ? 'flex' : 'none';
      };

      window.addEventListener('click', () => {
        if (menuTemplates) menuTemplates.style.display = 'none';
      });

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

    // Araçlar: Seçim ve El Aracı
    const toolSelect = document.getElementById('tool-select');
    const toolHand = document.getElementById('tool-hand');
    if (toolSelect && toolHand) {
      toolSelect.onclick = () => {
        this.activeTool = 'select';
        toolSelect.classList.add('active');
        toolHand.classList.remove('active');
      };
      toolHand.onclick = () => {
        this.activeTool = 'hand';
        toolHand.classList.add('active');
        toolSelect.classList.remove('active');
      };
    }

    // Nesne Ekleme: Metin Kutusu
    const btnAddText = document.getElementById('btn-add-text');
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
    const btnAddRect = document.getElementById('btn-add-rect');
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
    const btnAddCircle = document.getElementById('btn-add-circle');
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
    const btnAddImage = document.getElementById('btn-add-image');
    const imageInput = document.getElementById('file-input-image');
    if (btnAddImage && imageInput) {
      btnAddImage.onclick = () => imageInput.click();
      imageInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) {
            alert('Lütfen geçerli bir görsel dosyası seçin.');
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            const img = new Image();
            img.onload = () => {
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
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }
        imageInput.value = '';
      };
    }

    // Çizgi Ekleme (btn-add-target)
    const btnAddTarget = document.getElementById('btn-add-target');
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
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) btnUndo.onclick = () => this.historyManager.undo();

    const btnRedo = document.getElementById('btn-redo');
    if (btnRedo) btnRedo.onclick = () => this.historyManager.redo();

    // Yakınlaştır / Uzaklaştır / Sıfırla
    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) btnZoomIn.onclick = () => this.stageManager.zoomIn();

    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) btnZoomOut.onclick = () => this.stageManager.zoomOut();

    const btnZoomReset = document.getElementById('btn-zoom-reset');
    if (btnZoomReset) btnZoomReset.onclick = () => this.stageManager.fitToScreen();
  }

  bindModeSwitcher() {
    const modeBtns = document.querySelectorAll('.mode-toggle-btn');
    modeBtns.forEach(btn => {
      btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        this.core.setMode(mode);
      };
    });
  }

  handleModeChanged(newMode) {
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
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

      if (newMode === 'answer-key') {
        this.showToast('🔑 Cevap Anahtarı: Kaynak nesneye ve ardından hedefe tıklayarak eşleştirin.', 'info', 4000);
      }
    }
  }

  bindProjectTitle() {
    const titleInput = document.getElementById('project-title-input');
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

    const stage = document.getElementById('stage');
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
    }, true);
  }

  startInlineEditing(objId) {
    const obj = this.objectManager.getObject(objId);
    if (!obj || obj.locked || obj.type === 'line') return;

    // Zaten bu nesne düzenleniyorsa tekrar başlatma
    if (this.isEditingText && this.activeEditingObjId === objId) return;
    if (this.isEditingText) {
      this.finishInlineEditing();
    }

    const objEl = document.querySelector(`.stage-object[data-id="${objId}"]`);
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

    const objEl = document.querySelector(`.stage-object[data-id="${objId}"]`);
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
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
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
