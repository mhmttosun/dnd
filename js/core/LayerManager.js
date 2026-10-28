/**
 * LayerManager - Sahnedeki nesnelerin katman sırasını (z-index) ve
 * öne/arkaya getirme işlemlerini yönetir.
 */
class LayerManager {
  constructor(core, objectManager) {
    this.core = core;
    this.objectManager = objectManager;
  }

  getSortedObjects() {
    return [...this.core.data.objects].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
  }

  normalizeLayers() {
    const sorted = this.getSortedObjects();
    sorted.forEach((obj, idx) => {
      obj.zIndex = idx + 1;
      this.objectManager.updateObjectDOM(obj);
    });
  }

  bringToFront(id) {
    const obj = this.objectManager.getObject(id);
    if (!obj) return;

    this.normalizeLayers();
    const sorted = this.getSortedObjects();
    const maxZ = sorted[sorted.length - 1]?.zIndex || 1;
    obj.zIndex = maxZ + 1;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: obj });
    this.core.emit('dataChanged', { source: 'layer' });
  }

  sendToBack(id) {
    const obj = this.objectManager.getObject(id);
    if (!obj) return;

    this.normalizeLayers();
    obj.zIndex = 0;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: obj });
    this.core.emit('dataChanged', { source: 'layer' });
  }

  bringForward(id) {
    this.normalizeLayers();
    const sorted = this.getSortedObjects();
    const idx = sorted.findIndex(o => o.id === id);
    if (idx === -1 || idx === sorted.length - 1) return;

    // Bir üsttekiyle yer değiştir
    const nextObj = sorted[idx + 1];
    const tempZ = sorted[idx].zIndex;
    sorted[idx].zIndex = nextObj.zIndex;
    nextObj.zIndex = tempZ;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: sorted[idx] });
    this.core.emit('dataChanged', { source: 'layer' });
  }

  sendBackward(id) {
    this.normalizeLayers();
    const sorted = this.getSortedObjects();
    const idx = sorted.findIndex(o => o.id === id);
    if (idx <= 0) return;

    // Bir alttakiyle yer değiştir
    const prevObj = sorted[idx - 1];
    const tempZ = sorted[idx].zIndex;
    sorted[idx].zIndex = prevObj.zIndex;
    prevObj.zIndex = tempZ;

    this.normalizeLayers();
    this.core.emit('layerChanged', { object: sorted[idx] });
    this.core.emit('dataChanged', { source: 'layer' });
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.LayerManager = LayerManager;
