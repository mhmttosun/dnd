/**
 * ExportManager - Etkinliği tek bir bağımsız, çevrimdışı çalışabilen
 * ve sıfır harici bağımlılığı olan HTML dosyası olarak dışa aktarır.
 */
class ExportManager {
  constructor(core) {
    this.core = core;
  }

  /**
   * Projeyi tek bir HTML dosyası olarak derler ve indirir
   */
  exportStandaloneHTML() {
    const projectData = this.core.getProjectData();

    // Doğrulama kontrolü
    const playability = window.DND.ValidationEngine.validatePlayability(projectData);
    if (!playability.ready) {
      const confirmContinue = confirm(
        'Dikkat: Etkinlikte bazı eksiklikler tespit edildi:\n\n• ' +
        playability.issues.join('\n• ') +
        '\n\nYine de dışa aktarmak istiyor musunuz?'
      );
      if (!confirmContinue) return false;
    }

    const htmlContent = this.generateStandaloneHTMLString(projectData);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const safeTitle = (projectData.project.name || 'etkinlik')
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_etkinlik.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  }

  generateStandaloneHTMLString(projectData) {
    const title = window.DND.ValidationEngine.sanitizeText(projectData.project.name || 'Sürükle Bırak Etkinliği');
    const projectJsonEscaped = JSON.stringify(projectData).replace(/<\/script>/gi, '<\\/script>');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <style>
    /* RESET & TEMEL STILLER */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }

    /* OYNATICI ÇERÇEVESİ */
    .player-wrapper {
      width: 100vw;
      height: 100vh;
      max-width: 100%;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .player-header {
      height: 60px;
      min-height: 52px;
      flex-shrink: 0;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 100;
    }

    .player-header.player-header-minimal {
      position: absolute;
      top: 14px;
      right: 18px;
      height: auto;
      min-height: unset;
      padding: 0;
      background: transparent;
      border-bottom: none;
      backdrop-filter: none;
      z-index: 500;
      pointer-events: auto;
    }

    .player-header.player-header-minimal .exit-btn {
      background: rgba(239, 68, 68, 0.18);
      border: 1px solid rgba(239, 68, 68, 0.45);
      color: #fca5a5;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      border-radius: 9999px;
      padding: 7px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .player-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }

    .player-badge {
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 3px 8px;
      border-radius: 9999px;
    }

    .player-stats {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .stat-pill .stat-value {
      color: #38bdf8;
    }

    .player-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .player-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      transform: translateY(-1px);
    }

    .player-btn:active {
      transform: translateY(0);
    }

    .primary-btn,
    .check-answers-btn {
      background: #4f46e5;
      border-color: #6366f1;
      color: #ffffff;
    }

    .primary-btn:hover,
    .check-answers-btn:hover {
      background: #4338ca;
    }

    .player-btn.retry-btn {
      background: #f59e0b;
      border-color: #fbbf24;
      color: #0f172a;
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35);
    }

    .player-btn.retry-btn:hover {
      background: #d97706;
      color: #ffffff;
    }

    /* OYUN ALANI VE SAHNE */
    .player-viewport,
    .player-stage-viewport {
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: radial-gradient(circle at 50% 35%, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.98) 100%);
      touch-action: none;
    }

    .player-stage-container {
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      width: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }

    .player-stage-board {
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      border-radius: 12px;
      overflow: hidden;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .player-stage-scaler {
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      border-radius: 12px 12px 0 0;
    }

    .player-stage {
      position: absolute;
      top: 0;
      left: 0;
      overflow: hidden;
      touch-action: none;
      transform-origin: top left;
      user-select: none;
      -webkit-user-select: none;
      flex-shrink: 0;
    }

    .player-targets-layer,
    .player-draggables-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .player-object {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      pointer-events: auto;
      user-select: none;
    }

    .player-object.is-draggable {
      cursor: grab;
      touch-action: none;
      transition: box-shadow 0.2s ease, filter 0.2s ease;
    }

    .player-object.is-draggable:hover {
      filter: brightness(1.05);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important;
    }

    .player-object.is-dragging {
      cursor: grabbing !important;
      opacity: 0.92;
      filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.35));
    }

    .player-object.is-locked {
      cursor: default !important;
      opacity: 0.95;
      pointer-events: none;
    }

    .player-object.is-correct {
      border-color: #10b981 !important;
      background-color: #ecfdf5 !important;
      color: #065f46 !important;
    }

    .player-object.is-incorrect {
      border-color: #ef4444 !important;
      background-color: #fef2f2 !important;
    }

    .player-object.is-incorrect .player-object-content {
      animation: shake 0.4s ease-in-out;
    }

    .player-object.hover-active {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.35) !important;
    }

    .player-object.keyboard-active {
      outline: 4px solid #f59e0b;
      outline-offset: 4px;
      animation: pulse 1s infinite alternate;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }

    @keyframes pulse {
      from { box-shadow: 0 0 0 2px #f59e0b; }
      to { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.4); }
    }

    /* DOĞRU / YANLIŞ İKON ROZETLERİ (✓ / ✕) */
    .player-status-badge {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      z-index: 100;
      animation: badgePop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    }

    .player-status-badge.badge-correct {
      background: #10b981;
      color: #ffffff;
      border: 2px solid #ffffff;
    }

    .player-status-badge.badge-incorrect {
      background: #ef4444;
      color: #ffffff;
      border: 2px solid #ffffff;
    }

    @keyframes badgePop {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .player-object.is-target.is-target-locked {
      pointer-events: none !important;
      opacity: 0.9;
      border-color: #10b981 !important;
    }

    .player-object-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      word-break: break-word;
      white-space: pre-wrap;
    }

    /* Çizgi Nesnesi Oynatıcı Stilleri */
    .player-object[data-type="line"] {
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    .player-line-bar {
      width: 100%;
      height: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .player-object-content span,
    .player-object-content .player-text-span {
      width: 100%;
      display: block;
      text-align: inherit;
      box-sizing: border-box;
    }

    .player-object-content img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      pointer-events: none;
    }

    .image-caption {
      margin-top: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .cat-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 8px;
    }

    .slot-badge {
      font-size: 1.4rem;
      font-weight: 800;
      color: #6d28d9;
    }

    .slot-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
    }

    /* İKİNCİ KONTROL ALANI (Sahne genişliğinde) */
    .player-controls {
      flex-shrink: 0;
      min-height: 48px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      background: rgba(15, 23, 42, 0.92);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      box-sizing: border-box;
      width: 100%;
    }

    /* MOD DEĞİŞTİRİCİ (Segmented Switch) */
    .player-mode-switch {
      display: inline-flex;
      align-items: center;
      background: rgba(2, 6, 23, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    .player-mode-switch .mode-btn {
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      user-select: none;
    }

    .player-mode-switch .mode-btn:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.08);
    }

    .player-mode-switch .mode-btn.active {
      background: #3b82f6;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
    }

    /* ALT BİLGİ VE İPUCU (Sahne genişliğinde) */
    .player-footer {
      height: 36px;
      min-height: 32px;
      flex-shrink: 0;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      background: rgba(10, 15, 30, 0.96);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: #64748b;
      font-size: 0.8rem;
      box-sizing: border-box;
      width: 100%;
    }

    .player-hint {
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* MODAL VE KUTLAMA */
    .player-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .player-modal-card {
      background: #ffffff;
      border-radius: 20px;
      padding: 36px 40px;
      text-align: center;
      max-width: 440px;
      width: 90%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
      animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: hidden;
    }

    @keyframes popIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-star-banner {
      font-size: 2.2rem;
      margin-bottom: 12px;
    }

    .modal-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .modal-desc {
      font-size: 1rem;
      color: #64748b;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .modal-score-summary {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 24px;
    }

    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .summary-num {
      font-size: 1.6rem;
      font-weight: 800;
      color: #4f46e5;
    }

    .summary-lbl {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .modal-btn {
      width: 100%;
      padding: 14px 24px;
      font-size: 1.05rem;
      font-weight: 700;
      border-radius: 12px;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-btn:hover {
      background: #4338ca;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);
    }
  </style>
</head>
<body>
  <div id="activity-app"></div>

  <!-- Gömülü Proje Verisi -->
  <script id="activity-data" type="application/json">
${projectJsonEscaped}
  <\/script>

  <script>
    ${this.getBundledRuntimeScript()}
  <\/script>
</body>
</html>`;
  }

  getBundledRuntimeScript() {
    // Sadece oynatıcı için gereken sınıflar: AudioSynthesizer, ValidationEngine (sanitizeText) ve ActivityEngine
    return `
// Namespace
window.DND = window.DND || {};

// 1. AudioSynthesizer
${AudioSynthesizer.toString()}
window.DND.AudioSynthesizer = AudioSynthesizer;

// 2. ValidationEngine (Sanitize)
window.DND.ValidationEngine = {
  sanitizeText: function(str) {
    if (str === null || str === undefined) return '';
    const temp = document.createElement('div');
    temp.textContent = String(str);
    return temp.innerHTML;
  }
};

// 3. ActivityEngine
${ActivityEngine.toString()}
window.DND.ActivityEngine = ActivityEngine;

// 4. Otomatik Başlatma
window.addEventListener('DOMContentLoaded', function() {
  try {
    const rawData = document.getElementById('activity-data').textContent;
    const project = JSON.parse(rawData);
    const container = document.getElementById('activity-app');
    window.gameInstance = new window.DND.ActivityEngine(container, project);
  } catch (err) {
    console.error('Etkinlik başlatma hatası:', err);
    document.body.innerHTML = '<div style="color:white;padding:40px;font-family:sans-serif;">Etkinlik yüklenirken bir hata oluştu: ' + err.message + '</div>';
  }
});
`;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.ExportManager = ExportManager;
