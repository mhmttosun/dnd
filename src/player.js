/**
 * DND Player Kütüphane Giriş Noktası (Player Only)
 * 
 * Sadece etkinlik oynatıcıyı iç projelerinde kullanmak isteyenler için hafif paket.
 */

export { ActivityPlayer } from './ActivityPlayer.js';
export { DNDPlayerElement } from './components/DNDPlayerElement.js';

// Eğer global window nesnesinde ActivityEngine varsa dışa aktar
export const ActivityEngine = (typeof window !== 'undefined' && window.DND) ? window.DND.ActivityEngine : undefined;
export const AudioSynthesizer = (typeof window !== 'undefined' && window.DND) ? window.DND.AudioSynthesizer : undefined;
export const ValidationEngine = (typeof window !== 'undefined' && window.DND) ? window.DND.ValidationEngine : undefined;
