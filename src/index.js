/**
 * DND Interactive Activity Library (Full Bundle Entrypoint)
 * 
 * Hem oynatıcıyı (ActivityPlayer / DNDPlayerElement) hem de
 * görsel düzenleyici bileşenlerini dışa aktarır.
 */

export { ActivityPlayer } from './ActivityPlayer.js';
export { DNDPlayerElement } from './components/DNDPlayerElement.js';

// Global window.DND altındaki motor sınıfları
export const getDND = () => (typeof window !== 'undefined' ? window.DND : {});
