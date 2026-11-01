/**
 * TemplateLibrary - Gömülü şablon kataloğunu doğrular, güvenli önizleme
 * elemanları üretir ve kaynak şablonu değiştirmeden yeni proje kopyası açar.
 */
class TemplateLibrary {
  constructor(catalog = null) {
    this.catalog = Array.isArray(catalog)
      ? catalog
      : (Array.isArray(window.DND.TEMPLATE_PROJECTS) ? window.DND.TEMPLATE_PROJECTS : []);
  }

  list() {
    return this.catalog.slice();
  }

  get(templateId) {
    return this.catalog.find(entry => entry && entry.id === templateId) || null;
  }

  validateProject(projectData) {
    const result = window.DND.ValidationEngine.validateProject(projectData);
    if (!result.valid) {
      throw new Error(result.errors.join(', '));
    }

    const objects = Array.isArray(projectData.objects) ? projectData.objects : [];
    const ids = new Set();
    objects.forEach((object, index) => {
      if (!object || typeof object.id !== 'string' || object.id.length === 0) {
        throw new Error(`Şablondaki ${index + 1}. nesnenin kimliği geçersiz.`);
      }
      if (ids.has(object.id)) {
        throw new Error(`Şablonda yinelenen nesne kimliği var: ${object.id}`);
      }
      ids.add(object.id);
    });

    Object.entries(projectData.answerKey || {}).forEach(([draggableId, targetId]) => {
      if (!ids.has(draggableId) || !ids.has(targetId)) {
        throw new Error('Şablon cevap anahtarı bilinmeyen bir nesneye referans veriyor.');
      }
    });
    return true;
  }

  instantiate(templateId) {
    const entry = this.get(templateId);
    if (!entry) throw new Error('Şablon bulunamadı.');
    this.validateProject(entry.project);

    const project = JSON.parse(JSON.stringify(entry.project));
    const token = this.createInstanceToken();
    const idMap = new Map();
    const groupMap = new Map();

    project.project = Object.assign({}, project.project, { id: `proj_${token}` });
    project.objects = (project.objects || []).map((object, index) => {
      const next = Object.assign({}, object);
      const prefix = object.role === 'draggable'
        ? 'drag'
        : (['target', 'category', 'sequence_slot'].includes(object.role) ? 'target' : 'obj');
      const nextId = `${prefix}_${token}_${index.toString(36)}`;
      idMap.set(object.id, nextId);
      next.id = nextId;

      if (object.groupId) {
        if (!groupMap.has(object.groupId)) {
          groupMap.set(object.groupId, `grp_${token}_${groupMap.size.toString(36)}`);
        }
        next.groupId = groupMap.get(object.groupId);
      }
      return next;
    });

    const answerKey = {};
    Object.entries(project.answerKey || {}).forEach(([draggableId, targetId]) => {
      answerKey[idMap.get(draggableId)] = idMap.get(targetId);
    });
    project.answerKey = answerKey;

    this.validateProject(project);
    return project;
  }

  createInstanceToken() {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      return cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  createPreviewElement(projectData, ownerDocument = document) {
    this.validateProject(projectData);
    const svgNs = 'http://www.w3.org/2000/svg';
    const width = this.safeNumber(projectData.stage?.width, 1200, 1, 10000);
    const height = this.safeNumber(projectData.stage?.height, 675, 1, 10000);
    const svg = ownerDocument.createElementNS(svgNs, 'svg');
    svg.classList.add('template-preview-svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const background = ownerDocument.createElementNS(svgNs, 'rect');
    background.setAttribute('width', String(width));
    background.setAttribute('height', String(height));
    background.setAttribute('fill', this.safeColor(projectData.stage?.backgroundColor, '#ffffff'));
    svg.appendChild(background);

    if (this.isSafeImageSource(projectData.stage?.backgroundImage)) {
      const image = ownerDocument.createElementNS(svgNs, 'image');
      image.setAttribute('href', projectData.stage.backgroundImage);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.appendChild(image);
    }

    const objects = (projectData.objects || [])
      .filter(object => object && object.visible !== false)
      .slice()
      .sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

    objects.forEach(object => {
      svg.appendChild(this.createObjectPreview(object, ownerDocument, svgNs));
    });
    return svg;
  }

  createObjectPreview(object, ownerDocument, svgNs) {
    const x = this.safeNumber(object.x, 0, -10000, 10000);
    const y = this.safeNumber(object.y, 0, -10000, 10000);
    const width = this.safeNumber(object.width, 1, 1, 10000);
    const height = this.safeNumber(object.height, 1, 1, 10000);
    const rotation = this.safeNumber(object.rotation, 0, -3600, 3600);
    const group = ownerDocument.createElementNS(svgNs, 'g');
    if (rotation) {
      group.setAttribute('transform', `rotate(${rotation} ${x + width / 2} ${y + height / 2})`);
    }
    group.setAttribute('opacity', String(this.safeNumber(object.opacity, 1, 0, 1)));

    if (object.type === 'line') {
      const strokeWidth = this.safeNumber(object.borderWidth, 2, 1, 40);
      const line = ownerDocument.createElementNS(svgNs, 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('y1', String(y + height / 2));
      line.setAttribute('x2', String(x + width));
      line.setAttribute('y2', String(y + height / 2));
      line.setAttribute('stroke', this.safeColor(object.borderColor, '#1e293b'));
      line.setAttribute('stroke-width', String(strokeWidth));
      line.setAttribute('stroke-linecap', 'round');
      if (object.borderStyle === 'dashed') line.setAttribute('stroke-dasharray', '8 6');
      if (object.borderStyle === 'dotted') line.setAttribute('stroke-dasharray', '2 6');
      group.appendChild(line);

      const arrowSize = Math.min(Math.max(8, strokeWidth * 3), width / 3);
      if (object.arrowStart) {
        const arrow = ownerDocument.createElementNS(svgNs, 'polygon');
        arrow.setAttribute('points', `${x},${y + height / 2} ${x + arrowSize},${y + height / 2 - arrowSize / 2} ${x + arrowSize},${y + height / 2 + arrowSize / 2}`);
        arrow.setAttribute('fill', this.safeColor(object.borderColor, '#1e293b'));
        group.appendChild(arrow);
      }
      if (object.arrowEnd) {
        const arrow = ownerDocument.createElementNS(svgNs, 'polygon');
        arrow.setAttribute('points', `${x + width},${y + height / 2} ${x + width - arrowSize},${y + height / 2 - arrowSize / 2} ${x + width - arrowSize},${y + height / 2 + arrowSize / 2}`);
        arrow.setAttribute('fill', this.safeColor(object.borderColor, '#1e293b'));
        group.appendChild(arrow);
      }
      return group;
    }

    const shape = ownerDocument.createElementNS(svgNs, object.type === 'circle' ? 'ellipse' : 'rect');
    if (object.type === 'circle') {
      shape.setAttribute('cx', String(x + width / 2));
      shape.setAttribute('cy', String(y + height / 2));
      shape.setAttribute('rx', String(width / 2));
      shape.setAttribute('ry', String(height / 2));
    } else {
      shape.setAttribute('x', String(x));
      shape.setAttribute('y', String(y));
      shape.setAttribute('width', String(width));
      shape.setAttribute('height', String(height));
      shape.setAttribute('rx', String(this.safeNumber(object.borderRadius, 0, 0, 9999)));
    }
    shape.setAttribute('fill', this.safeColor(object.backgroundColor, 'transparent'));
    shape.setAttribute('stroke', object.borderStyle === 'none'
      ? 'transparent'
      : this.safeColor(object.borderColor, 'transparent'));
    shape.setAttribute('stroke-width', String(this.safeNumber(object.borderWidth, 0, 0, 40)));
    if (object.borderStyle === 'dashed') shape.setAttribute('stroke-dasharray', '8 6');
    if (object.borderStyle === 'dotted') shape.setAttribute('stroke-dasharray', '2 6');
    group.appendChild(shape);

    if (object.type === 'image' && this.isSafeImageSource(object.src)) {
      const image = ownerDocument.createElementNS(svgNs, 'image');
      image.setAttribute('href', object.src);
      image.setAttribute('x', String(x));
      image.setAttribute('y', String(y));
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      group.appendChild(image);
    }

    if (typeof object.text === 'string' && object.text.length > 0) {
      const foreignObject = ownerDocument.createElementNS(svgNs, 'foreignObject');
      foreignObject.setAttribute('x', String(x));
      foreignObject.setAttribute('y', String(y));
      foreignObject.setAttribute('width', String(width));
      foreignObject.setAttribute('height', String(height));
      const text = ownerDocument.createElement('div');
      text.className = 'template-preview-text';
      text.textContent = object.text;
      text.style.color = this.safeColor(object.textColor, '#1e293b');
      text.style.fontSize = `${this.safeNumber(object.fontSize, 16, 6, 300)}px`;
      text.style.fontWeight = this.safeFontWeight(object.fontWeight);
      text.style.fontStyle = object.fontStyle === 'italic' ? 'italic' : 'normal';
      text.style.textDecoration = object.textDecoration === 'underline' ? 'underline' : 'none';
      text.style.textAlign = ['left', 'right', 'center'].includes(object.textAlign) ? object.textAlign : 'center';
      text.style.justifyContent = object.verticalAlign === 'top'
        ? 'flex-start'
        : (object.verticalAlign === 'bottom' ? 'flex-end' : 'center');
      text.style.alignItems = object.textAlign === 'left'
        ? 'flex-start'
        : (object.textAlign === 'right' ? 'flex-end' : 'center');
      text.style.padding = `${this.safeNumber(object.padding, 4, 0, 100)}px`;
      foreignObject.appendChild(text);
      group.appendChild(foreignObject);
    }
    return group;
  }

  safeNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  safeColor(value, fallback) {
    const color = String(value || '');
    return /^(?:transparent|#[0-9a-f]{3,8}|rgba?\([0-9\s.,%]+\))$/i.test(color) ? color : fallback;
  }

  safeFontWeight(value) {
    const weight = String(value || 'normal');
    return /^(?:normal|bold|[1-9]00)$/.test(weight) ? weight : 'normal';
  }

  isSafeImageSource(value) {
    if (typeof value !== 'string') return false;
    return /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value) || /^https:\/\//i.test(value);
  }
}

window.DND = window.DND || {};
window.DND.TemplateLibrary = TemplateLibrary;
