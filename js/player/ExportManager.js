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
      background: #0f172a;
      border: 1px solid #0f172a;
      color: #ffffff;
      border-radius: 9999px;
      padding: 8px 20px;
      font-size: 0.875rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.15s ease;
    }

    .primary-btn:hover,
    .check-answers-btn:hover {
      background: #1e293b;
      border-color: #1e293b;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }

    .player-btn.secondary-btn,
    .player-btn.reset-btn {
      background: transparent;
      border: none;
      color: #475569;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      box-shadow: none;
    }

    .player-btn.secondary-btn:hover,
    .player-btn.reset-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
      transform: none;
    }

    .player-btn.reset-btn .btn-icon {
      font-size: 1.05rem;
      line-height: 1;
    }

    .player-btn.retry-btn {
      background: #d97706;
      border: 1px solid #d97706;
      color: #ffffff;
      border-radius: 9999px;
      padding: 8px 20px;
      font-size: 0.875rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);
      transition: all 0.15s ease;
    }

    .player-btn.retry-btn:hover {
      background: #b45309;
      border-color: #b45309;
      transform: translateY(-1px);
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
      background: #f8fafc;
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
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05);
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .player-stage-scaler {
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      border-radius: 16px 16px 0 0;
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

    /* KONTROL ALANI (Açık Zemin, Hiyerarşik Butonlar) */
    .player-controls {
      flex-shrink: 0;
      min-height: 54px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      box-sizing: border-box;
      width: 100%;
    }

    .player-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }

    /* MOD DEĞİŞTİRİCİ (Segmented Switch) */
    .player-mode-switch {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }

    .player-mode-switch .mode-btn {
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      user-select: none;
    }

    .player-mode-switch .mode-btn:hover {
      color: #0f172a;
    }

    .player-mode-switch .mode-btn.active {
      background: #ffffff;
      color: #0f172a;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    /* YARDIMCI İPUCU METNİ (Koyu panel değil, sade yardımcı metin) */
    .player-footer {
      height: auto;
      min-height: 28px;
      flex-shrink: 0;
      padding: 8px 16px 2px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 0.82rem;
      box-sizing: border-box;
      width: 100%;
    }

    .player-hint {
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* TAMAMLANMA SONUÇ KARTI */
    .completion-result-card {
      min-height: 74px;
      margin-top: 16px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
      box-sizing: border-box;
      border: 1px solid #dcece2;
      border-radius: 14px;
      background: #f3f9f5;
      animation: completionResultIn 0.3s ease-out;
    }

    .completion-result-card[hidden],
    .player-controls[hidden],
    .player-footer[hidden] {
      display: none !important;
    }

    .completion-result-message {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .completion-result-icon {
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 12px;
      background: #e0f2e6;
      color: #29885a;
    }

    .completion-result-title {
      margin: 0;
      color: #253b30;
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .completion-replay-btn {
      min-height: 40px;
      padding: 8px 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      flex-shrink: 0;
      border: 1px solid #d3e2d8;
      border-radius: 9px;
      background: #ffffff;
      color: #365747;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    .completion-replay-btn:hover {
      background: #f8fbf9;
      border-color: #bcd5c5;
      color: #253b30;
    }

    .completion-replay-btn:focus-visible {
      outline: 2px solid #29885a;
      outline-offset: 2px;
    }

    @keyframes completionResultIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .completion-result-card {
        min-height: 68px;
        margin-top: 12px;
        padding: 12px;
        gap: 12px;
        flex-wrap: wrap;
      }

      .completion-result-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
      }

      .completion-result-title {
        font-size: 1rem;
      }

      .completion-replay-btn {
        margin-left: auto;
      }
    }

    @media (max-width: 480px) {
      .completion-result-card {
        align-items: stretch;
        flex-direction: column;
      }

      .completion-replay-btn {
        width: 100%;
        margin-left: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .completion-result-card {
        animation: none;
      }
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
