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
      playMode: 'learning',
      onComplete: null,
      onStep: null,
      onDrop: null,
      onReset: null,
      onReady: null,
      initialState: null
    }, options);

    this.container = null;
    this.engine = null;
    this.isDestroyed = false;

    // Hedef elementi çözümle
    if (this.options.target) {
      this.resolveContainer(this.options.target);
    }

    // Veri başlatma (Doğrudan veri, URL, File veya JSON metni)
    if (this.options.data) {
      this.mount(this.options.data);
    } else if (this.options.src) {
      this.loadFromUrl(this.options.src);
    } else if (this.options.file) {
      this.loadFromFile(this.options.file);
    } else if (this.options.jsonString) {
      this.loadFromJsonString(this.options.jsonString);
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
   * JSON dosya URL'sinden veya yolundan veriyi asenkron çekip oynatıcıyı başlatır
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
   * Bir File veya Blob nesnesini (örneğin <input type="file"> ile seçilen yerel dosyayı)
   * doğrudan okuyup etkinliği başlatır
   * @param {File|Blob} file 
   */
  async loadFromFile(file) {
    if (!file) throw new Error('[ActivityPlayer] Dosya nesnesi boş olamaz.');
    try {
      let text = '';
      if (typeof file.text === 'function') {
        text = await file.text();
      } else {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file, 'utf-8');
        });
      }
      this.loadFromJsonString(text);
    } catch (err) {
      console.error('[ActivityPlayer] Dosya okunamadı:', err);
      if (this.container) {
        this.container.innerHTML = `
          <div style="padding: 24px; text-align: center; color: #ef4444; font-family: sans-serif;">
            ⚠️ Dosya okunamadı: ${err.message}
          </div>
        `;
      }
      throw err;
    }
  }

  /**
   * Ham JSON metnini (JSON String) ayrıştırıp etkinliği başlatır
   * @param {string} jsonString 
   */
  loadFromJsonString(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      this.mount(data);
    } catch (err) {
      console.error('[ActivityPlayer] JSON ayrıştırma hatası:', err);
      if (this.container) {
        this.container.innerHTML = `
          <div style="padding: 24px; text-align: center; color: #ef4444; font-family: sans-serif;">
            ⚠️ Geçersiz JSON formatı: ${err.message}
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
      playMode: this.options.playMode,
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
    const mountedData = JSON.parse(JSON.stringify(projectData));
    mountedData.settings = Object.assign({}, mountedData.settings, {
      soundEnabled: this.options.sound !== false
    });

    this.engine = new EngineClass(this.container, mountedData, engineOptions);
    if (this.options.initialState) this.engine.setState(this.options.initialState);

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

  setState(state) {
    if (!this.engine) throw new Error('[ActivityPlayer] Oynatıcı henüz başlatılmadı.');
    return this.engine.setState(state);
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
   * Kontrol alanındaki geri bildirim mesajını günceller
   * @param {string} message 
   * @param {'info'|'success'|'error'|'warning'} [type='info'] 
   * @param {number} [duration=0] 
   */
  setFeedback(message, type = 'info', duration = 0) {
    if (this.engine && typeof this.engine.setFeedback === 'function') {
      this.engine.setFeedback(message, type, duration);
    }
  }

  /**
   * Anlık geri bildirim durumunu döner
   */
  getFeedback() {
    return (this.engine && typeof this.engine.getFeedback === 'function')
      ? this.engine.getFeedback()
      : null;
  }

  /**
   * Aktif oyun modunu döner ('learning' veya 'assessment')
   */
  getPlayMode() {
    return (this.engine && typeof this.engine.getPlayMode === 'function')
      ? this.engine.getPlayMode()
      : this.options.playMode || 'learning';
  }

  /**
   * Oyun modunu değiştirir ('learning' veya 'assessment')
   * @param {'learning'|'assessment'} mode
   */
  setPlayMode(mode) {
    if (this.engine && typeof this.engine.setPlayMode === 'function') {
      this.engine.setPlayMode(mode);
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
