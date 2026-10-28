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
          <button class="mode-toggle-btn active" data-mode="design" type="button" title="Tasarım">✎</button>
          <button class="mode-toggle-btn" data-mode="answer-key" type="button" title="Cevap anahtarı">✓</button>
          <button class="mode-toggle-btn" data-mode="preview" type="button" title="Önizleme">▶</button>
        </div>
        <div class="template-dropdown-wrapper">
          <button id="btn-toggle-templates" class="sub-tool-btn" type="button" title="Şablonlar">▦</button>
          <div id="templates-menu" class="templates-menu" style="display:none">
            <button data-sample="matching" type="button">Eşleştirme</button>
          </div>
        </div>
        <button id="tool-select" class="sub-tool-btn active" type="button" title="Seç">↖</button>
        <button id="tool-hand" class="sub-tool-btn" type="button" title="El">✋</button>
        <span class="sub-divider"></span>
        <button id="btn-add-text" class="sub-tool-btn" type="button" title="Metin">T</button>
        <button id="btn-add-rect" class="sub-tool-btn" type="button" title="Kutu">□</button>
        <button id="btn-add-circle" class="sub-tool-btn" type="button" title="Daire">○</button>
        <button id="btn-add-image" class="sub-tool-btn" type="button" title="Görsel">▧</button>
        <input id="file-input-image" type="file" accept="image/*" hidden>
        <button id="btn-add-target" class="sub-tool-btn" type="button" title="Çizgi">╱</button>
      </div>
      <div class="sub-toolbar-cluster">
        <button id="btn-undo" class="sub-tool-btn" type="button" disabled title="Geri al">↶</button>
        <button id="btn-redo" class="sub-tool-btn" type="button" disabled title="İleri al">↷</button>
        <span class="sub-divider"></span>
        <button id="btn-zoom-out" class="sub-tool-btn" type="button">−</button>
        <button id="btn-zoom-reset" class="sub-tool-btn" type="button">Fit</button>
        <button id="btn-zoom-in" class="sub-tool-btn" type="button">＋</button>
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
