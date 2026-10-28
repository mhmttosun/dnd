/**
 * DND ActivityPlayer - Modern JavaScript / TypeScript Kütüphane Sarmalayıcısı.
 * 
 * Herhangi bir JS projesine (React, Vue, Angular, Svelte, Vanilla JS)
 * tek satırla entegre olabilen yaşam döngüsü (lifecycle) yönetimli etkinlik oynatıcısı.
 */

// Global veya import edilmiş ActivityEngine referansı
const getActivityEngine = () => {
  if (typeof window !== 'undefined' && window.DND && window.DND.ActivityEngine) {
    return window.DND.ActivityEngine;
  }
  return null;
};

export class ActivityPlayer {
  /**
   * @param {Object|string} options Veya doğrudan hedef DOM elementi / seçicisi
   * @param {HTMLElement|string} [options.target] Hedef container elementi veya CSS seçicisi ('#quiz')
   * @param {Object} [options.data] Etkinlik JSON veri modeli
   * @param {string} [options.src] Etkinlik JSON dosyasının URL adresi
   * @param {boolean} [options.sound=true] Ses efektleri açık mı
   * @param {Function} [options.onComplete] Etkinlik tamamlandığında çağrılacak callback
   * @param {Function} [options.onStep] Her adımda (drop) çağrılacak callback
   * @param {Function} [options.onDrop] Her bırakma işleminde çağrılacak callback
   * @param {Function} [options.onReset] Yeniden başlatıldığında çağrılacak callback
   * @param {Function} [options.onReady] Oynatıcı hazır olduğunda çağrılacak callback
   */
  constructor(options = {}) {
    this.options = Object.assign({
      sound: true,
      onComplete: null,
      onStep: null,
      onDrop: null,
      onReset: null,
      onReady: null
    }, options);

    this.container = null;
    this.engine = null;
    this.isDestroyed = false;

    // Hedef elementi çözümle
    if (this.options.target) {
      this.resolveContainer(this.options.target);
    }

    // Veri başlatma (Doğrudan veri veya URL üzerinden yükleme)
    if (this.options.data) {
      this.mount(this.options.data);
    } else if (this.options.src) {
      this.loadFromUrl(this.options.src);
    }
  }

  resolveContainer(target) {
    if (typeof target === 'string') {
      this.container = document.querySelector(target);
    } else if (target instanceof HTMLElement) {
      this.container = target;
    }
    if (!this.container) {
      throw new Error(`[ActivityPlayer] Hedef container elementi bulunamadı: ${target}`);
    }
  }

  /**
   * JSON dosya URL'sinden veriyi asenkron çekip oynatıcıyı başlatır
   * @param {string} url 
   */
  async loadFromUrl(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Hata: ${response.status} (${response.statusText})`);
      }
      const data = await response.json();
      this.mount(data);
    } catch (err) {
      console.error(`[ActivityPlayer] Veri yüklenemedi:`, err);
      if (this.container) {
        this.container.innerHTML = `
          <div style="padding: 24px; text-align: center; color: #ef4444; font-family: sans-serif;">
            ⚠️ Etkinlik verisi yüklenemedi: ${err.message}
          </div>
        `;
      }
      throw err;
    }
  }

  /**
   * Oynatıcıyı container içine monte eder
   * @param {Object} projectData 
   */
  mount(projectData) {
    if (this.isDestroyed || !this.container) return;

    // Önceki motor varsa temizle
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }

    const EngineClass = getActivityEngine();
    if (!EngineClass) {
      throw new Error('[ActivityPlayer] ActivityEngine motoru bulunamadı! DND kütüphanesinin yüklendiğinden emin olun.');
    }

    // Seçenekleri hazırla
    const engineOptions = {
      isEmbedded: false,
      onComplete: (res) => {
        if (typeof this.options.onComplete === 'function') this.options.onComplete(res);
      },
      onStep: (state) => {
        if (typeof this.options.onStep === 'function') this.options.onStep(state);
      },
      onDrop: (dropInfo) => {
        if (typeof this.options.onDrop === 'function') this.options.onDrop(dropInfo);
      },
      onReset: (state) => {
        if (typeof this.options.onReset === 'function') this.options.onReset(state);
      }
    };

    // Ses ayarını uygula
    if (projectData.settings) {
      projectData.settings.soundEnabled = this.options.sound !== false;
    }

    this.engine = new EngineClass(this.container, projectData, engineOptions);

    if (typeof this.options.onReady === 'function') {
      this.options.onReady(this);
    }
  }

  /**
   * Olay dinleyici kaydeder ('complete', 'step', 'drop', 'reset', 'destroy')
   */
  on(event, callback) {
    if (this.engine) {
      return this.engine.on(event, callback);
    }
    return () => {};
  }

  /**
   * Olay dinleyiciyi kaldırır
   */
  off(event, callback) {
    if (this.engine) {
      this.engine.off(event, callback);
    }
  }

  /**
   * Anlık oyun durumu ve başarı puanını döner
   */
  getState() {
    return this.engine ? this.engine.getState() : null;
  }

  /**
   * Ses efektlerini açar veya kapatır
   */
  setSound(enabled) {
    if (this.engine && this.engine.audio) {
      this.engine.audio.setEnabled(!!enabled);
    }
  }

  /**
   * Etkinliği sıfırlayıp baştan başlatır
   */
  reset() {
    if (this.engine) {
      this.engine.resetGame();
    }
  }

  /**
   * Yaşam döngüsü sonlandırıcı (React useEffect cleanup, Vue onUnmounted)
   * Tüm event listener'ları ve ses kanallarını kapatır, bellek sızıntısını önler.
   */
  destroy() {
    if (this.isDestroyed) return;
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isDestroyed = true;
  }
}
