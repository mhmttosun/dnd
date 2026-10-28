/**
 * AudioSynthesizer - Tarayıcı Web Audio API kullanarak harici ses dosyalarına
 * ihtiyaç duymadan temiz, profesyonel ses efektleri üretir.
 * Tamamen çevrimdışı çalışır.
 */
class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const startTime = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainLevel, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Ses hatası sessizce geçilir
    }
  }

  // Doğru cevap sesi: Neşeli, yükselen majör akor (C5, E5, G5)
  playCorrect() {
    if (!this.enabled) return;
    this.playTone(523.25, 'triangle', 0.12, 0, 0.18);      // C5
    this.playTone(659.25, 'triangle', 0.14, 0.08, 0.18);   // E5
    this.playTone(783.99, 'triangle', 0.25, 0.16, 0.22);   // G5
  }

  // Yanlış cevap sesi: Yumuşak alçalan uyarı tonu
  playWrong() {
    if (!this.enabled) return;
    this.playTone(320, 'sine', 0.12, 0, 0.15);
    this.playTone(260, 'sine', 0.22, 0.09, 0.15);
  }

  // Nesneyi eline alma / tıklama çıt sesi
  playPickup() {
    if (!this.enabled) return;
    this.playTone(480, 'sine', 0.05, 0, 0.08);
  }

  // Nesneyi bırakma sesi
  playDrop() {
    if (!this.enabled) return;
    this.playTone(360, 'sine', 0.07, 0, 0.1);
  }

  // Etkinlik tamamlandığında kutlama fanfarı
  playComplete() {
    if (!this.enabled) return;
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },       // C5
      { f: 659.25, d: 0.12, t: 0.1 },     // E5
      { f: 783.99, d: 0.14, t: 0.2 },     // G5
      { f: 1046.50, d: 0.45, t: 0.32 }    // C6
    ];
    notes.forEach(n => {
      this.playTone(n.f, 'triangle', n.d, n.t, 0.2);
    });
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.AudioSynthesizer = AudioSynthesizer;
