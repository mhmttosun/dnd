/**
 * app.js - Uygulama Başlatıcı (Bootstrapper).
 * Bütün modülleri temiz bir bağımlılık sırasıyla birbirine bağlar ve çalıştırır.
 * Yan paneller kaldırılmış, bağlamsal MiniToolbar entegre edilmiştir.
 */
window.addEventListener('DOMContentLoaded', () => {
  try {
    const stageViewport = document.getElementById('stage-viewport');
    const stageEl = document.getElementById('stage');

    // 1. Çekirdek Sistem
    const core = new window.DND.EditorCore();

    // 2. Sahne ve Koordinat Yönetimi
    const stageManager = new window.DND.StageManager(core, stageViewport, stageEl);

    // 3. Nesne Yönetimi
    const objectManager = new window.DND.ObjectManager(core, stageEl);

    // 4. Seçim ve Dönüşüm Yönetimi
    const selectionManager = new window.DND.SelectionManager(core, stageManager, objectManager, stageEl);
    const historyManager = new window.DND.HistoryManager(core);
    const layerManager = new window.DND.LayerManager(core, objectManager);

    // 5. Cevap Anahtarı ve Dönüşüm Motorları
    const answerKeyManager = new window.DND.AnswerKeyManager(core, stageManager, objectManager, stageEl);
    const transformEngine = new window.DND.TransformEngine(core, stageManager, objectManager, selectionManager, historyManager, stageEl);

    // 6. Dışa Aktarma, MiniToolbar ve Arayüz
    const exportManager = new window.DND.ExportManager(core);
    const miniToolbar = new window.DND.MiniToolbar(core, objectManager, selectionManager, layerManager, stageManager);
    const uiManager = new window.DND.UIManager(core, stageManager, objectManager, selectionManager, historyManager, exportManager);

    // Global erişim (hata ayıklama veya konsoldan inceleme için)
    window.app = {
      core,
      stageManager,
      objectManager,
      selectionManager,
      historyManager,
      layerManager,
      answerKeyManager,
      transformEngine,
      exportManager,
      miniToolbar,
      uiManager
    };

    // Başlangıç Projesi: Ekteki görseldeki "Kavram ve Tanım" eşleştirme projesi
    const defaultSample = window.DND.SAMPLE_PROJECTS['matching'] || window.DND.SAMPLE_PROJECTS['image-labeling'];
    core.loadProject(defaultSample);
    uiManager.updateSaveStatus(true);

  } catch (err) {
    console.error('Uygulama başlatılırken kritik hata:', err);
    alert('Uygulama başlatılamadı: ' + err.message);
  }
});
