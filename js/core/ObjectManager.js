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
  createObject(type, role = 'decorative', extra = {}, saveHistory = true) {
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
    } else if (type === 'image') {
      baseObj.width = 300;
      baseObj.height = 200;
      baseObj.backgroundColor = 'transparent';
      baseObj.borderColor = 'transparent';
      baseObj.borderWidth = 0;
      baseObj.boxShadow = 'none';
      baseObj.text = '';
    } else if (type === 'text') {
      baseObj.width = 220;
      baseObj.height = 48;
      baseObj.backgroundColor = 'transparent';
      baseObj.borderColor = 'transparent';
      baseObj.borderWidth = 0;
      baseObj.boxShadow = 'none';
      baseObj.borderRadius = 4;
      baseObj.padding = 4;
      baseObj.text = 'Metin yazın';
      baseObj.fontSize = 18;
      baseObj.fontWeight = '600';
      baseObj.textColor = '#1e293b';
    }

    const finalObj = Object.assign({}, baseObj, extra);

    this.core.data.objects.push(finalObj);
    this.renderObjectDOM(finalObj);

    const inTx = this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction();
    const shouldSaveHistory = typeof saveHistory === 'object' ? (saveHistory.saveHistory ?? true) : !!saveHistory;
    const addSource = typeof saveHistory === 'object' && saveHistory.source ? saveHistory.source : 'createObject';

    if (inTx) {
      this.core.recordMutation({ source: addSource, description: 'Nesne Eklendi' });
      this.core.emit('objectAdded', { object: finalObj, saveHistory: false });
    } else {
      this.core.emit('objectAdded', { object: finalObj, saveHistory: shouldSaveHistory });
      this.core.emit('dataChanged', { source: addSource });
      this.core.autoSave();
    }

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

  normalizeUpdateOptions(options) {
    if (typeof options === 'boolean') {
      return {
        saveHistory: options,
        emitDataChanged: true,
        persist: true,
        autoSave: true,
        transient: false,
        source: 'updateObject'
      };
    }
    if (!options || typeof options !== 'object') {
      return {
        saveHistory: true,
        emitDataChanged: true,
        persist: true,
        autoSave: true,
        transient: false,
        source: 'updateObject'
      };
    }
    const isTransient = !!options.transient;
    return {
      saveHistory: options.saveHistory !== undefined ? options.saveHistory : !isTransient,
      emitDataChanged: options.emitDataChanged !== undefined ? options.emitDataChanged : !isTransient,
      persist: options.persist !== undefined ? options.persist : (options.autoSave !== undefined ? options.autoSave : !isTransient),
      autoSave: options.autoSave !== undefined ? options.autoSave : (options.persist !== undefined ? options.persist : !isTransient),
      transient: isTransient,
      source: options.source || 'updateObject'
    };
  }

  updateObject(id, partialProps, options = true) {
    const obj = this.getObject(id);
    if (!obj) return null;

    const opts = this.normalizeUpdateOptions(options);

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

    const inTx = this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction();

    if (inTx) {
      this.core.recordMutation({ source: opts.source, description: 'Nesne Güncellendi' });
      this.core.emit('objectUpdated', { object: obj, partialProps, saveHistory: false, options: opts });
    } else {
      this.core.emit('objectUpdated', { object: obj, partialProps, saveHistory: opts.saveHistory, options: opts });
      if (opts.emitDataChanged && !opts.transient) {
        this.core.emit('dataChanged', { source: opts.source });
      }
      if (opts.persist && !opts.transient) {
        this.core.autoSave();
      }
    }
    return obj;
  }

  deleteObject(id, saveHistory = true) {
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

    const inTx = this.core && typeof this.core.isInTransaction === 'function' && this.core.isInTransaction();
    const shouldSaveHistory = typeof saveHistory === 'object' ? (saveHistory.saveHistory ?? true) : !!saveHistory;
    const delSource = typeof saveHistory === 'object' && saveHistory.source ? saveHistory.source : 'deleteObject';

    if (inTx) {
      this.core.recordMutation({ source: delSource, description: 'Nesne Silindi' });
      this.core.emit('objectDeleted', { object: removed, saveHistory: false });
    } else {
      this.core.emit('objectDeleted', { object: removed, saveHistory: shouldSaveHistory });
      this.core.emit('dataChanged', { source: delSource });
      this.core.autoSave();
    }
  }

  duplicateObject(id, saveHistory = true) {
    const src = this.getObject(id);
    if (!src) return null;

    const copyProps = JSON.parse(JSON.stringify(src));
    delete copyProps.id;
    copyProps.name = `${src.name} (Kopya)`;
    copyProps.x = Math.min(this.core.data.stage.width - (src.width || 100), src.x + 25);
    copyProps.y = Math.min(this.core.data.stage.height - (src.height || 60), src.y + 25);
    copyProps.zIndex = this.getMaxZIndex() + 1;

    const newObj = this.createObject(src.type, src.role, copyProps, saveHistory);
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
      const shouldRenderText = obj.type === 'text' || (obj.text && obj.text.trim() !== '');
      if (shouldRenderText) {
        const textNode = document.createElement('span');
        textNode.className = 'object-text-span';
        textNode.style.width = '100%';
        textNode.style.display = 'block';
        textNode.style.textAlign = textAlign;
        textNode.textContent = obj.text || '';
        content.appendChild(textNode);
      }
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
