/**
 * StageManager - Mantıksal koordinat sistemi (1200x675), yakınlaştırma,
 * responsive ölçeklendirme, ızgara (grid) ve hizalama kılavuzlarını yönetir.
 */
class StageManager {
  constructor(core, containerEl, stageEl, options = {}) {
    this.core = core;
    this.container = containerEl;
    this.stage = stageEl;
    this.svgOverlay = stageEl.querySelector('.stage-svg-overlay');
    this.signal = options.signal;

    this.logicalWidth = 1200;
    this.logicalHeight = 675;

    this.zoomLevel = 1.0; // 0.4 - 2.0
    this.currentScale = 1.0;
    this.showGrid = true;
    this.snapToGrid = false;
    this.gridSize = 20;

    this.guidelines = []; // Aktif hizalama çizgileri

    this.init();
  }

  init() {
    this.setupResizeObserver();
    this.renderGrid();
    this.updateDimensions();

    this.core.on('stageChanged', () => this.applyStageStyles());
    this.core.on('projectLoaded', (p) => {
      this.logicalWidth = p.project.stage.width || 1200;
      this.logicalHeight = p.project.stage.height || 675;
      this.applyStageStyles();
      this.fitToScreen();
    });
  }

  setupResizeObserver() {
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScale();
      });
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', () => this.updateScale(), this.signal ? { signal: this.signal } : undefined);
    }
  }

  updateDimensions() {
    this.stage.style.width = `${this.logicalWidth}px`;
    this.stage.style.height = `${this.logicalHeight}px`;
    if (this.svgOverlay) {
      this.svgOverlay.setAttribute('viewBox', `0 0 ${this.logicalWidth} ${this.logicalHeight}`);
      this.svgOverlay.setAttribute('width', this.logicalWidth);
      this.svgOverlay.setAttribute('height', this.logicalHeight);
    }
    this.applyStageStyles();
    this.updateScale();
  }

  applyStageStyles() {
    const stageData = this.core.data.stage;
    this.stage.style.backgroundColor = stageData.backgroundColor || '#ffffff';
    if (stageData.backgroundImage) {
      this.stage.style.backgroundImage = `url("${stageData.backgroundImage}")`;
      this.stage.style.backgroundSize = 'contain';
      this.stage.style.backgroundPosition = 'center';
      this.stage.style.backgroundRepeat = 'no-repeat';
    } else {
      this.stage.style.backgroundImage = 'none';
    }
  }

  updateScale() {
    const containerRect = this.container.getBoundingClientRect();
    const padding = 40;
    const availableW = Math.max(containerRect.width - padding, 200);
    const availableH = Math.max(containerRect.height - padding, 200);

    const baseScale = Math.min(
      availableW / this.logicalWidth,
      availableH / this.logicalHeight
    );

    this.currentScale = baseScale * this.zoomLevel;
    this.stage.style.transform = `scale(${this.currentScale})`;
    this.stage.style.transformOrigin = 'center center';

    this.core.emit('stageScaleChanged', {
      scale: this.currentScale,
      zoom: this.zoomLevel
    });
  }

  setZoom(zoom) {
    this.zoomLevel = Math.max(0.4, Math.min(2.5, zoom));
    this.updateScale();
  }

  zoomIn() {
    this.setZoom(this.zoomLevel + 0.15);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel - 0.15);
  }

  resetZoom() {
    this.setZoom(1.0);
  }

  fitToScreen() {
    this.zoomLevel = 1.0;
    this.updateScale();
  }

  // Koordinat Dönüşümleri
  clientToStage(clientX, clientY) {
    const rect = this.stage.getBoundingClientRect();
    const scale = rect.width / this.logicalWidth;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  stageToClient(stageX, stageY) {
    const rect = this.stage.getBoundingClientRect();
    const scale = rect.width / this.logicalWidth;
    return {
      clientX: rect.left + stageX * scale,
      clientY: rect.top + stageY * scale
    };
  }

  // Izgaraya yapışma hesabı
  snap(val) {
    if (!this.snapToGrid) return Math.round(val);
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  toggleGrid(forcedState) {
    this.showGrid = forcedState !== undefined ? forcedState : !this.showGrid;
    if (this.showGrid) {
      this.stage.classList.add('grid-visible');
    } else {
      this.stage.classList.remove('grid-visible');
    }
    return this.showGrid;
  }

  toggleSnap(forcedState) {
    this.snapToGrid = forcedState !== undefined ? forcedState : !this.snapToGrid;
    return this.snapToGrid;
  }

  renderGrid() {
    if (this.showGrid) {
      this.stage.classList.add('grid-visible');
    }
  }

  // Akıllı Kılavuz Çizgileri (Hizalama Rehberi)
  showGuidelines(hLines = [], vLines = []) {
    let guideLayer = this.stage.querySelector('.stage-guidelines');
    if (!guideLayer) {
      guideLayer = document.createElement('div');
      guideLayer.className = 'stage-guidelines';
      this.stage.appendChild(guideLayer);
    }
    guideLayer.innerHTML = '';

    hLines.forEach(y => {
      const line = document.createElement('div');
      line.className = 'guideline guideline-h';
      line.style.top = `${y}px`;
      guideLayer.appendChild(line);
    });

    vLines.forEach(x => {
      const line = document.createElement('div');
      line.className = 'guideline guideline-v';
      line.style.left = `${x}px`;
      guideLayer.appendChild(line);
    });
  }

  clearGuidelines() {
    const guideLayer = this.stage.querySelector('.stage-guidelines');
    if (guideLayer) {
      guideLayer.innerHTML = '';
    }
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.StageManager = StageManager;
