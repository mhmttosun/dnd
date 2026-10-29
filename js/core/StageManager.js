/**
 * StageManager - Mantıksal koordinat sistemi (1200x675), yakınlaştırma,
 * responsive ölçeklendirme, ızgara (grid) ve hizalama kılavuzlarını yönetir.
 */
class StageManager {
  constructor(core, containerEl, stageEl, options = {}) {
    this.core = core;
    this.container = containerEl;
    this.stage = stageEl;
    this.stageScaler = null;
    this.stageContainer = null;
    this.svgOverlay = stageEl ? stageEl.querySelector('.stage-svg-overlay') : null;
    this.signal = options.signal;

    this.logicalWidth = 1200;
    this.logicalHeight = 675;

    this.zoomLevel = 1.0; // 0.4 - 2.5
    this.currentScale = 1.0;
    this.showGrid = true;
    this.snapToGrid = false;
    this.gridSize = 20;

    this.guidelines = []; // Aktif hizalama çizgileri

    this.init();
  }

  init() {
    this.setupStageWrapper();
    this.setupWheelZoom();
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

  setupStageWrapper() {
    if (!this.stage) return;
    let scaler = this.stage.closest ? this.stage.closest('.stage-scaler') : null;
    if (!scaler && this.stage.parentElement && this.stage.parentElement.classList.contains('stage-scaler')) {
      scaler = this.stage.parentElement;
    }
    if (!scaler) {
      let container = this.container ? this.container.querySelector('.stage-container') : null;
      if (!container) {
        container = document.createElement('div');
        container.className = 'stage-container';
        container.id = 'stage-container';
        if (this.container && this.stage.parentNode) {
          this.stage.parentNode.insertBefore(container, this.stage);
        }
      }
      scaler = document.createElement('div');
      scaler.className = 'stage-scaler';
      scaler.id = 'stage-scaler';
      scaler.appendChild(this.stage);
      if (container) {
        container.appendChild(scaler);
      }
    }
    this.stageScaler = scaler;
    this.stageContainer = scaler ? scaler.parentElement : null;
  }

  setupWheelZoom() {
    if (!this.container) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const step = Math.sign(delta) * 0.1;
        this.setZoom(Math.round((this.zoomLevel + step) * 100) / 100);
      }
    };
    const opts = this.signal ? { passive: false, signal: this.signal } : { passive: false };
    this.container.addEventListener('wheel', onWheel, opts);
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
    if (!this.container || !this.stage) return;
    if (!this.stageScaler) {
      this.setupStageWrapper();
    }

    const containerRect = this.container.getBoundingClientRect();
    const padding = 80;
    const availableW = Math.max(containerRect.width - padding, 200);
    const availableH = Math.max(containerRect.height - padding, 200);

    const baseScale = Math.min(
      availableW / this.logicalWidth,
      availableH / this.logicalHeight
    );

    const hasScroll = this.container.scrollWidth > this.container.clientWidth || this.container.scrollHeight > this.container.clientHeight;
    let focusRatioX = 0.5;
    let focusRatioY = 0.5;
    if (hasScroll && this.container.scrollWidth > 0 && this.container.scrollHeight > 0) {
      focusRatioX = (this.container.scrollLeft + this.container.clientWidth / 2) / this.container.scrollWidth;
      focusRatioY = (this.container.scrollTop + this.container.clientHeight / 2) / this.container.scrollHeight;
    }

    this.currentScale = baseScale * this.zoomLevel;

    const scaledW = Math.round(this.logicalWidth * this.currentScale);
    const scaledH = Math.round(this.logicalHeight * this.currentScale);

    if (this.stageScaler) {
      this.stageScaler.style.width = `${scaledW}px`;
      this.stageScaler.style.height = `${scaledH}px`;
    }

    this.stage.style.width = `${this.logicalWidth}px`;
    this.stage.style.height = `${this.logicalHeight}px`;
    this.stage.style.transform = `scale(${this.currentScale})`;
    this.stage.style.transformOrigin = 'top left';

    if (this.zoomLevel > 1.0) {
      if (hasScroll) {
        requestAnimationFrame(() => {
          if (this.container) {
            this.container.scrollLeft = Math.max(0, focusRatioX * this.container.scrollWidth - this.container.clientWidth / 2);
            this.container.scrollTop = Math.max(0, focusRatioY * this.container.scrollHeight - this.container.clientHeight / 2);
          }
        });
      }
    } else {
      this.container.scrollLeft = 0;
      this.container.scrollTop = 0;
    }

    this.core.emit('stageScaleChanged', {
      scale: this.currentScale,
      zoom: this.zoomLevel
    });
  }

  setZoom(zoom) {
    this.zoomLevel = Math.max(0.4, Math.min(2.5, Math.round(zoom * 100) / 100));
    this.updateScale();
  }

  zoomIn() {
    this.setZoom(this.zoomLevel + 0.15);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel - 0.15);
  }

  resetZoom() {
    this.fitToScreen();
  }

  fitToScreen() {
    this.zoomLevel = 1.0;
    this.updateScale();
    if (this.container) {
      this.container.scrollLeft = 0;
      this.container.scrollTop = 0;
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
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
