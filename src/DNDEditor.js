/**
 * Direct-mount editor API for SPA integrations. The build bundles the legacy
 * editor classes before this module and injects the editor CSS into EDITOR_CSS.
 */
const EDITOR_CSS = globalThis.__DND_EDITOR_CSS__ || '';

const shell = () => `
  <div class="dnd-editor-root">
    <header class="app-top-header">
      <div class="top-header-left"><div class="header-titles-box">
        <div class="app-subtitle">ETKİNLİK DÜZENLEYİCİSİ</div>
        <div class="project-title-row"><input id="project-title-input" class="project-title-input" value="Eşleştirme" aria-label="Etkinlik başlığı"></div>
        <div class="project-save-status is-saved"><span class="status-dot"></span><span id="status-text">Kaydedildi</span></div>
      </div></div>
      <div class="top-header-right">
        <button id="btn-new-project" class="top-icon-btn" type="button" title="Yeni">＋</button>
        <button id="btn-open-project" class="top-icon-btn" type="button" title="Aç">↥</button>
        <input id="file-input-project" type="file" accept=".json,application/json" hidden>
        <button id="btn-export-html" class="top-icon-btn" type="button" title="HTML indir">HTML</button>
        <button id="btn-save-project" class="top-primary-save-btn" type="button">Kaydet</button>
      </div>
    </header>
    <nav class="app-sub-toolbar">
      <div class="sub-toolbar-cluster">
        <div class="mode-pill-group">
          <button class="mode-toggle-btn active" data-mode="design" type="button" title="Tasarım Modu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="mode-toggle-btn" data-mode="answer-key" type="button" title="Cevap Anahtarı Modu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
          </button>
          <button class="mode-toggle-btn" data-mode="preview" type="button" title="Önizleme Modu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="template-dropdown-wrapper">
          <button id="btn-toggle-templates" class="sub-tool-btn" type="button" title="Örnek Etkinlik Şablonları">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          <div id="templates-menu" class="templates-menu" style="display:none">
            <div class="menu-title">Örnek Şablonlar</div>
            <button class="template-menu-item" data-sample="matching" type="button">1. Eşleştirme (Kavram ve Tanım)</button>
            <button class="template-menu-item" data-sample="image-labeling" type="button">2. Görsel Etiketleme (İnsan Anatomisi)</button>
            <button class="template-menu-item" data-sample="categorization" type="button">3. Kategorilere Ayırma (Meyve/Sebze)</button>
            <button class="template-menu-item" data-sample="sequencing" type="button">4. Sıralama (Kelebek Yaşam Döngüsü)</button>
          </div>
        </div>
      </div>
      <div class="sub-toolbar-cluster">
        <button id="tool-select" class="sub-tool-btn active" type="button" title="Seçim Aracı">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>
        </button>
        <button id="tool-hand" class="sub-tool-btn" type="button" title="Kaydırma (El) Aracı">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v7"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M6 14v-2a2 2 0 0 0-4 0v5a7 7 0 0 0 7 7h3a7 7 0 0 0 7-7v-3a2 2 0 0 0-4 0"/></svg>
        </button>
        <span class="sub-divider"></span>
        <button id="btn-add-text" class="sub-tool-btn" type="button" title="Metin Kutusu Ekle">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>
        </button>
        <button id="btn-add-rect" class="sub-tool-btn" type="button" title="Kutu / Kart Ekle">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
        </button>
        <button id="btn-add-circle" class="sub-tool-btn" type="button" title="Daire Şekli Ekle">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>
        </button>
        <button id="btn-add-image" class="sub-tool-btn" type="button" title="Bilgisayardan Görsel Yükle">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <input id="file-input-image" type="file" accept="image/*" hidden>
        <button id="btn-add-target" class="sub-tool-btn" type="button" title="Çizgi Ekle">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="20" x2="20" y2="4"/></svg>
        </button>
      </div>
      <div class="sub-toolbar-cluster">
        <button id="btn-undo" class="sub-tool-btn" type="button" disabled title="Geri Al (Ctrl+Z)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button id="btn-redo" class="sub-tool-btn" type="button" disabled title="İleri Al (Ctrl+Y)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
        </button>
        <span class="sub-divider"></span>
        <button id="btn-zoom-out" class="sub-tool-btn" type="button" title="Uzaklaştır">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <button id="btn-zoom-reset" class="sub-tool-btn" type="button" title="Ekrana Sığdır">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </button>
        <button id="btn-zoom-in" class="sub-tool-btn" type="button" title="Yakınlaştır">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
      </div>
    </nav>
    <main id="editor-layout" class="editor-workspace">
      <div id="stage-viewport" class="stage-viewport"><div id="stage" class="stage grid-visible mode-design">
        <svg class="stage-svg-overlay" id="svg-overlay"><g id="svg-connections"></g></svg>
        <div class="stage-objects" id="stage-objects"></div>
        <div class="selection-box" id="selection-overlay"></div>
      </div></div>
    </main>
    <div id="preview-container"></div>
  </div>`;

function resolveContainer(target) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(container instanceof HTMLElement)) throw new TypeError('DND editörü için geçerli bir container gerekli.');
  return container;
}

function xml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

export function createDefaultActivity(activityType = 'matching', name = 'Eşleştirme') {
  const Core = window.DND?.EditorCore;
  if (!Core) throw new Error('DND editör çekirdeği yüklenmedi.');
  return new Core().createDefaultProject(activityType, name);
}

export function renderActivityPreview(projectData) {
  const width = projectData.stage?.width || 1200;
  const height = projectData.stage?.height || 675;
  const background = projectData.stage?.backgroundColor || '#ffffff';
  const objects = [...(projectData.objects || [])].filter(item => item.visible !== false).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const body = [];
  if (projectData.stage?.backgroundImage) {
    body.push(`<image href="${xml(projectData.stage.backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`);
  }
  for (const item of objects) {
    const x = Number(item.x) || 0, y = Number(item.y) || 0;
    const w = Math.max(1, Number(item.width) || 1), h = Math.max(1, Number(item.height) || 1);
    const transform = item.rotation ? ` transform="rotate(${Number(item.rotation) || 0} ${x + w / 2} ${y + h / 2})"` : '';
    if (item.type === 'line') {
      const dash = item.borderStyle === 'dashed' ? '8 6' : item.borderStyle === 'dotted' ? '2 6' : '';
      body.push(`<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${xml(item.borderColor || '#1e293b')}" stroke-width="${Number(item.borderWidth) || 2}"${dash ? ` stroke-dasharray="${dash}"` : ''}${transform}/>`);
      continue;
    }
    const radius = item.type === 'circle' ? Math.min(w, h) / 2 : Number(item.borderRadius) || 0;
    body.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${xml(item.backgroundColor || 'transparent')}" stroke="${xml(item.borderColor || 'transparent')}" stroke-width="${Number(item.borderWidth) || 0}"${transform}/>`);
    if (item.type === 'image' && item.src) {
      body.push(`<image href="${xml(item.src)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${transform}/>`);
    }
    if (item.text) {
      body.push(`<text x="${x + w / 2}" y="${y + h / 2}" dominant-baseline="middle" text-anchor="middle" font-family="${xml(item.fontFamily || 'system-ui, sans-serif')}" font-size="${Number(item.fontSize) || 16}" font-weight="${xml(item.fontWeight || 'normal')}" fill="${xml(item.textColor || '#1e293b')}"${transform}>${xml(item.text)}</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${xml(background)}"/>${body.join('')}</svg>`;
}

export function initializeDndEditor(options = {}) {
  const container = resolveContainer(options.container || options.target);
  if (options.signal?.aborted) throw new DOMException('DND editörü açma işlemi iptal edildi.', 'AbortError');
  const lifecycle = new AbortController();
  const shadow = container.shadowRoot || container.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${EDITOR_CSS}</style>${shell()}`;
  const root = shadow;
  const host = root.querySelector('.dnd-editor-root');
  if (options.ui?.fileActions === false) host.classList.add('hide-file-actions');
  if (options.ui?.embedded === true) host.classList.add('is-embedded');

  const stageViewport = root.getElementById('stage-viewport');
  const stageEl = root.getElementById('stage');
  const core = new window.DND.EditorCore();
  const stageManager = new window.DND.StageManager(core, stageViewport, stageEl, { signal: lifecycle.signal });
  const objectManager = new window.DND.ObjectManager(core, stageEl);
  const selectionManager = new window.DND.SelectionManager(core, stageManager, objectManager, stageEl, { signal: lifecycle.signal });
  const historyManager = new window.DND.HistoryManager(core, 40, { signal: lifecycle.signal });
  const layerManager = new window.DND.LayerManager(core, objectManager);
  const answerKeyManager = new window.DND.AnswerKeyManager(core, stageManager, objectManager, stageEl);
  const transformEngine = new window.DND.TransformEngine(core, stageManager, objectManager, selectionManager, historyManager, stageEl, { signal: lifecycle.signal });
  const exportManager = new window.DND.ExportManager(core);
  const pending = new Set();
  let taskError = null;
  let destroyed = false;
  const trackTask = task => {
    pending.add(task);
    task.catch(error => { taskError = error; }).finally(() => pending.delete(task));
  };
  const miniToolbar = new window.DND.MiniToolbar(core, objectManager, selectionManager, layerManager, stageManager, root, { signal: lifecycle.signal });
  const uiManager = new window.DND.UIManager(core, stageManager, objectManager, selectionManager, historyManager, exportManager, {
    root,
    uploadImage: options.uploadImage,
    signal: lifecycle.signal,
    trackTask,
  });
  const initial = options.activity || createDefaultActivity('matching', 'Eşleştirme');
  core.loadProject(initial);
  uiManager.updateSaveStatus(true);

  if (options.signal) options.signal.addEventListener('abort', () => lifecycle.abort(), { once: true });

  const ensureAlive = () => { if (destroyed) throw new Error('DND editörü kapatılmış.'); };
  return {
    async flush() {
      ensureAlive();
      uiManager.finishInlineEditing?.();
      await Promise.all([...pending]);
      if (taskError) { const error = taskError; taskError = null; throw error; }
    },
    getActivity() { ensureAlive(); return core.getProjectData(); },
    setActivity(activity) { ensureAlive(); core.loadProject(activity); },
    getMode() { ensureAlive(); return core.getMode(); },
    setMode(mode) { ensureAlive(); core.setMode(mode); },
    async exportPreview() {
      await this.flush();
      return new Blob([renderActivityPreview(core.getProjectData())], { type: 'image/svg+xml' });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      lifecycle.abort();
      uiManager.activePlayerInstance?.destroy();
      stageManager.resizeObserver?.disconnect();
      miniToolbar.toolbarEl?.remove();
      shadow.replaceChildren();
    },
  };
}
