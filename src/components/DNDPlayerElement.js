/**
 * <dnd-player> Web Component (Custom Element)
 * 
 * Herhangi bir framework (React, Vue, Svelte, Angular veya düz HTML) içinde
 * standart bir HTML etiketi gibi çalışan bağımsız etkinlik oynatıcı bileşeni.
 * 
 * Kullanım Örneği:
 * <dnd-player src="/samples/2_hayvanlar_eslestirme.json" sound="true"></dnd-player>
 */

import { ActivityPlayer } from '../ActivityPlayer.js';

export class DNDPlayerElement extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'sound'];
  }

  constructor() {
    super();
    this._player = null;
    this._data = null;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this._player) {
      this._player.destroy();
      this._player = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;

    if (name === 'src' && newValue) {
      this.initPlayer();
    } else if (name === 'sound' && this._player) {
      this._player.setSound(newValue !== 'false');
    }
  }

  /**
   * Doğrudan JavaScript nesnesi olarak etkinlik verisi atanabilir:
   * element.data = { ... }
   */
  get data() {
    return this._data;
  }

  set data(val) {
    this._data = val;
    this.initPlayer();
  }

  get player() {
    return this._player;
  }

  render() {
    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.width = '100%';
    this.style.height = this.style.height || '100%';
    this.style.minHeight = this.style.minHeight || '500px';

    this.initPlayer();
  }

  initPlayer() {
    if (this._player) {
      this._player.destroy();
      this._player = null;
    }

    const src = this.getAttribute('src');
    const soundAttr = this.getAttribute('sound');
    const sound = soundAttr !== 'false';

    if (!src && !this._data) return;

    this._player = new ActivityPlayer({
      target: this,
      src: src || undefined,
      data: this._data || undefined,
      sound: sound,
      onComplete: (stats) => {
        this.dispatchEvent(new CustomEvent('dnd:complete', { detail: stats, bubbles: true }));
      },
      onStep: (state) => {
        this.dispatchEvent(new CustomEvent('dnd:step', { detail: state, bubbles: true }));
      },
      onDrop: (dropInfo) => {
        this.dispatchEvent(new CustomEvent('dnd:drop', { detail: dropInfo, bubbles: true }));
      },
      onReset: (state) => {
        this.dispatchEvent(new CustomEvent('dnd:reset', { detail: state, bubbles: true }));
      },
      onReady: (p) => {
        this.dispatchEvent(new CustomEvent('dnd:ready', { detail: { player: p }, bubbles: true }));
      }
    });
  }

  /**
   * Etkinliği sıfırlama metodu
   */
  reset() {
    if (this._player) this._player.reset();
  }

  /**
   * Durum sorgulama metodu
   */
  getState() {
    return this._player ? this._player.getState() : null;
  }
}

// Custom element kaydı
if (typeof customElements !== 'undefined' && !customElements.get('dnd-player')) {
  customElements.define('dnd-player', DNDPlayerElement);
}
