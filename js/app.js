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

    // =========================================================================
    // 7. GÖMÜLÜ MOD (EMBEDDING) VE DIŞA AKTARMA (JSON EXPORT) API'LERİ
    // =========================================================================

    // Header görünürlüğünü dinamik olarak kontrol etme fonksiyonu
    const setHeaderVisible = (visible) => {
      const isVisible = !!visible;
      if (typeof document !== 'undefined' && document.body && document.body.classList) {
        document.body.classList.toggle('is-embedded', !isVisible);
      }
      const topHeader = typeof document !== 'undefined' ? document.querySelector('.app-top-header') : null;
      if (topHeader && topHeader.style) {
        topHeader.style.display = isVisible ? 'flex' : 'none';
      }
      setTimeout(() => {
        if (stageManager && typeof stageManager.updateScale === 'function') {
          stageManager.updateScale();
        }
      }, 30);
    };

    // Embedding Modu Tespiti:
    // URL parametresi (?embedded=true, ?header=false, ?hideHeader=true) veya iframe içi
    const searchStr = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : '';
    let isEmbeddedQuery = false;
    let headerExplicitTrue = false;
    try {
      if (typeof URLSearchParams !== 'undefined' && searchStr) {
        const urlParams = new URLSearchParams(searchStr);
        isEmbeddedQuery = urlParams.get('embedded') === 'true' || 
                          urlParams.get('embed') === 'true' || 
                          urlParams.get('header') === 'false' || 
                          urlParams.get('hideHeader') === 'true';
        headerExplicitTrue = urlParams.get('header') === 'true';
      }
    } catch (e) {}

    let isIframe = false;
    try {
      isIframe = typeof window !== 'undefined' && window.self !== window.top;
    } catch (e) {
      isIframe = true;
    }

    // iframe içindeyse (ve açıkça header=true denmemişse) veya URL'de parametre varsa header'ı gizle
    const shouldHideHeader = isEmbeddedQuery || (isIframe && !headerExplicitTrue);
    if (shouldHideHeader) {
      setHeaderVisible(false);
    }

    // JSON Dışa Aktarma Fonksiyonları (Ebeveyn uygulamanın tek çağrıyla JSON alabilmesi için)
    const exportJSON = () => core.getProjectData();
    const exportJSONString = (indent = 2) => JSON.stringify(core.getProjectData(), null, indent);
    const loadJSON = (projectData) => {
      core.loadProject(projectData);
      uiManager.updateSaveStatus(true);
    };

    // Global app nesnesi
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
      uiManager,

      // Dışa aktarma ve entegrasyon metotları
      exportJSON,
      exportJSONString,
      getProjectData: exportJSON,
      loadProject: loadJSON,
      setHeaderVisible,
      isEmbedded: () => {
        return typeof document !== 'undefined' && 
               document.body && 
               document.body.classList && 
               document.body.classList.contains('is-embedded');
      }
    };

    // Global kısayollar (window.dndExport() veya iframe.contentWindow.dndExport())
    window.dndExport = exportJSON;
    window.dndExportString = exportJSONString;
    window.dndLoad = loadJSON;
    window.dndSetHeaderVisible = setHeaderVisible;

    // PostMessage Desteği (iframe entegrasyonlarında ebeveyn uygulamanın JSON istemesi veya yüklemesi için)
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        switch (msg.type) {
          case 'DND_GET_DATA':
          case 'GET_PROJECT_DATA': {
            const data = exportJSON();
            if (event.source && typeof event.source.postMessage === 'function') {
              event.source.postMessage({
                type: 'DND_DATA_RESPONSE',
                requestId: msg.requestId,
                data: data
              }, '*');
            }
            break;
          }
          case 'DND_LOAD_DATA':
          case 'LOAD_PROJECT': {
            if (msg.data) {
              loadJSON(msg.data);
            }
            break;
          }
          case 'DND_SET_HEADER': {
            setHeaderVisible(msg.visible !== false);
            break;
          }
          case 'DND_SET_MODE': {
            if (msg.mode) {
              core.setMode(msg.mode);
            }
            break;
          }
        }
      });
    }

    // Sahne verisi her değiştiğinde ebeveyn uygulamaya canlı bildirim gönder (iframe içindeyse)
    core.on('dataChanged', (e) => {
      if (isIframe && typeof window !== 'undefined' && window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({
            type: 'DND_DATA_CHANGED',
            source: e.source,
            data: exportJSON()
          }, '*');
        } catch (err) {}
      }
    });

    // Başlangıç Projesi: Ekteki görseldeki "Kavram ve Tanım" eşleştirme projesi
    const defaultSample = window.DND.SAMPLE_PROJECTS['matching'] || window.DND.SAMPLE_PROJECTS['image-labeling'];
    core.loadProject(defaultSample);
    uiManager.updateSaveStatus(true);

  } catch (err) {
    console.error('Uygulama başlatılırken kritik hata:', err);
    alert('Uygulama başlatılamadı: ' + err.message);
  }
});
