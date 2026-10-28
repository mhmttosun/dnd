# HTML Tabanlı Görsel Sürükle-Bırak Etkinlik Editörü

Öğretmenlerin kod yazmadan etkileşimli eğitim etkinlikleri tasarlayabildiği, görsel cevap anahtarı oluşturabildiği, anında önizleme yapabildiği ve **tek tıkla tamamen bağımsız, çevrimdışı çalışan tek parça HTML etkinlikleri üretebildiği** profesyonel açık kaynak web platformudur.

[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-blue.svg)](LICENSE)
![Testler](https://img.shields.io/badge/Testler-27%2F27%20Ge%C3%A7ti%20(%25100)-success.svg)
![Sıfır Bağımlılık](https://img.shields.io/badge/Frameworks-Pure%20Vanilla%20JS-emerald.svg)
![Canvas Kullanımı](https://img.shields.io/badge/HTML%20Canvas-YOK%20(%25100%20DOM%2FSVG)-blue.svg)
![Çevrimdışı Çalışma](https://img.shields.io/badge/Offline-Haz%C4%B1r-orange.svg)

---

## 🌟 Temel Özellikler

* **Canva Benzeri Görsel Tasarım Deneyimi:** Nesneleri serbestçe sürükleme, 8 tutamaçla boyutlandırma, döndürme, katman sıralaması, hizalama kılavuzları ve ızgara desteği.
* **Kesinlikle HTML Canvas Kullanmaz:** Bütün nesneler DOM hiyerarşisi, CSS Transforms (`translate`, `scale`, `rotate`) ve gerektiğinde SVG ile yönetilir.
* **Kontekstüel Mini Araç Çubuğu (Mini Toolbar):**
  * Nesne seçildiğinde veya seçim alanı (marquee) bırakıldığında doğrudan nesnenin üzerinde beliren dinamik araç çubuğu.
  * **Metin Ayarları:** Yazı tipi, boyutu, kalınlık, yatay ve dikey hizalama, 14 renkli açılır palet.
  * **Nesne Görünümü:** Kompakt kart tasarımı, açılır renk seçimi, `+` ve `−` butonlarıyla hassas çizgi kalınlığı ve köşe yuvarlama (border-radius) ayarları.
  * **Katman ve Kilit Menüsü:** Minimalist tasarımda *Öne*, *En öne*, *Arkaya*, *En arkaya* ve *Kilit* seçenekleri.
  * **Kilitli Nesne Desteği:** Tuval üzerinden kilitli nesne seçildiğinde tek tıkla **"Kilidi Aç"** aksiyonu.
  * **Sahne Rolü:** *Taşınan*, *Hedef* ve *Arka Plan* rolleri arasında hızlı geçiş.
  * **Hizalama ve Boyutlandırma:** Sola, ortaya, sağa, üste, merkeze, alta hizalama ile çoklu seçimde *En Kısa* ve *En Uzun* genişliğe eşitleme.
* **Çizgi Nesnesi ve Özel Uç Tutamaçları:** Yalnızca başlangıç ve bitiş noktalarında beliren minimalist tutamaçlarla ok ve çizgi oluşturma.
* **Görsel Cevap Anahtarı Sistemi:** Kod veya ID yazmaya gerek olmadan, sürükle-bırak nesnesine ve hedef alana tıklayarak karşılıklı kenarlardan bağlanan dinamik SVG çizgileriyle eşleştirme.
* **Tek Parça Bağımsız HTML Dışa Aktarma:** Dışa aktarılan etkinlik; harici kütüphane, CDN veya internet bağlantısı gerektirmez. Dosyaya çift tıklanarak akıllı tahta, tablet veya bilgisayarlarda doğrudan çalışır.
* **Pointer Events API:** Masaüstü fare, tablet ve dokunmatik ekranlı mobil telefonlarda kusursuz sürükleme performansı.
* **Web Audio API Entegre Ses Sentezleyici:** Harici ses dosyalarına ihtiyaç duymadan, tarayıcı içinde dinamik doğru/yanlış melodileri ve kutlama fanfarı üretir.
* **Klavye ile Erişilebilirlik ve Kısayollar:** Geri Al (`Ctrl+Z`), İleri Al (`Ctrl+Y`), Kopyala/Yapıştır (`Ctrl+C`/`Ctrl+V`), Gruplama (`Ctrl+G`), Grubu Çözme (`Ctrl+Shift+G`), Çift tıklama ile yerinde metin düzenleme (inline editing).

---

## 🎯 Desteklenen 4 Etkinlik Türü

| Etkinlik Türü | Açıklama | Cevap Anahtarı Mantığı |
| :--- | :--- | :--- |
| **1. Görsel Üzerinde Etiketleme** | Ana görsel (örn: İnsan Anatomisi) üzerindeki hedef noktalara doğru etiketleri yerleştirme. | Sürüklenebilir Nesne ID ➔ Hedef ID (1'e 1) |
| **2. Sürükle-Bırak Eşleştirme** | İki sütun halindeki nesne veya kavramları (örn: Hayvanlar ve Doğal Yaşam Alanları) eşleştirme. | Kaynak Nesne ID ➔ Hedef Nesne ID (1'e 1) |
| **3. Kategorilere Ayırma** | Nesneleri (örn: Meyveler ve Sebzeler) ilgili kategori kutularına yerleştirme. | Nesne ID ➔ Kategori ID (Çoklu kabul) |
| **4. Sürükleyerek Sıralama** | Süreç adımlarını (örn: Kelebeğin Yaşam Döngüsü) doğru sıraya dizme. | Nesne ID ➔ Sıra Numarası / Slot ID |

---

## 🏗️ Modüler Yazılım Mimarisi

```
dnd/
├── index.html                 # Ana görsel etkinlik editörü
├── README.md                  # Proje dokümantasyonu ve kullanım kılavuzu
├── LICENSE                    # MIT Açık Kaynak Lisansı
├── package.json               # NPM betikleri ve paket metaverileri
├── .gitignore                 # Sürüm kontrolünden hariç tutulan dosyalar
├── css/
│   ├── editor.css             # Editör arayüzü, mini toolbar ve açılır popup kartları
│   ├── stage.css              # 1200x675 tuval, 8 boyutlandırma tutamacı, çizgi tutamaçları
│   ├── answer-key.css         # Cevap anahtarı modu SVG bağlantı çizgileri ve vurgular
│   └── player.css             # Önizleme ve dışa aktarılan etkinlik oynatıcısının stilleri
├── js/
│   ├── core/
│   │   ├── EditorCore.js      # Merkezi veri modeli (Single Source of Truth) ve durum yönetimi
│   │   ├── StageManager.js    # 1200x675 mantıksal koordinat sistemi, ölçekleme ve ızgara
│   │   ├── ObjectManager.js   # Nesne CRUD, z-index ve DOM oluşturma işlemleri
│   │   ├── SelectionManager.js# Tekli/çoklu seçim (Marquee), kopyala/yapıştır, kısayollar
│   │   ├── HistoryManager.js  # Sınırsız Geri Al (Ctrl+Z) ve İleri Al (Ctrl+Y) yığını
│   │   ├── LayerManager.js    # Katman yönetimi (Öne Getir, Arkaya Gönder)
│   │   └── AnswerKeyManager.js# Görsel SVG eşleştirme ve cevap anahtarı yönetimi
│   ├── engine/
│   │   ├── TransformEngine.js # Pointer Events ile taşıma, boyutlandırma ve döndürme
│   │   └── ValidationEngine.js# JSON şema ve oynanabilirlik doğrulaması, XSS sanitizasyonu
│   ├── player/
│   │   ├── ActivityEngine.js  # Gerçek zamanlı öğrenci oyun motoru (Preview ve Export için)
│   │   └── ExportManager.js   # Tek parça, bağımsız HTML dosyası derleyici
│   ├── utils/
│   │   └── AudioSynthesizer.js# Web Audio API ile sıfır harici dosya ses motoru
│   ├── ui/
│   │   ├── MiniToolbar.js     # Kontekstüel yüzen mini araç çubuğu ve popup kontrolleri
│   │   ├── PropertyPanel.js   # Seçili nesne ve oyun ayarları paneli
│   │   └── UIManager.js       # Araç çubukları, menüler ve kullanıcı bildirimleri
│   ├── data/
│   │   └── SampleProjects.js  # 4 etkinlik türü için zengin, hazır şablonlar
│   └── app.js                 # Uygulama başlatıcı ve modül bağlayıcı
├── samples/                   # Hazır etkinliklerin bağımsız HTML ve JSON dosyaları
│   ├── 1_organlari_etiketleme.html / .json
│   ├── 2_hayvanlar_eslestirme.html / .json
│   ├── 2_kavram_tanim_eslestirme.html / .json
│   ├── 3_meyveler_sebzeler_kategori.html / .json
│   └── 4_kelebek_yasam_dongusu_siralama.html / .json
└── tests/
    └── run_tests.py           # 27 aşamalı otomatik kabul ve entegrasyon test paketi
```

---

## 📐 Mantıksal Koordinat Sistemi ve Ölçekleme

Editör, **1200 x 675 piksel (16:9 sabit en-boy oranı)** mantıksal koordinat sistemi üzerinde çalışır:
* Tüm nesne konumları `(x, y)` ve boyutları `(width, height)` bu mantıksal sistemde saklanır.
* Ekran boyutu veya tarayıcı yakınlaştırması değiştiğinde `CSS transform: scale(...)` kullanılarak orantılı ölçekleme yapılır.
* Pointer koordinatları aşağıdaki formülle mantıksal sahne koordinatına dönüştürülür:
  $$\text{stageX} = \frac{\text{clientX} - \text{stageRect.left}}{\text{scale}}$$
  $$\text{stageY} = \frac{\text{clientY} - \text{stageRect.top}}{\text{scale}}$$
* Bu sayede mobilde veya 4K ekranda açıldığında hedefler ve nesneler milimetrik olarak aynı yerde kalır.

---

## 🚀 Kurulum ve Çalıştırma

Proje hiçbir backend, derleyici (build tool) veya harici npm paketi bağımlılığı gerektirmez.

### 1. Yöntem: Doğrudan Çift Tıklama (En Hızlı)
Herhangi bir kurulum yapmadan `index.html` dosyasına çift tıklayarak tarayıcınızda açabilirsiniz.

### 2. Yöntem: Yerel Sunucu ile (Tavsiye Edilen)
Terminalden proje klasöründe yerel bir HTTP sunucu başlatabilirsiniz:
```bash
# Python ile:
python3 -m http.server 8000

# veya NPM betiği ile:
npm start
```
Ardından tarayıcınızdan `http://localhost:8000` adresine gidin.

---

## 📦 Başka JS Projelerine Entegrasyon (Kütüphane Kullanımı)

Bu proje hem görsel bir editör hem de diğer JavaScript projelerine (React, Vue, Angular, Svelte, Next.js veya düz Vanilla JS) **kolayca eklenebilen bağımsız bir etkinlik oynatıcısı (Activity Player)** olarak tasarlanmıştır.

### Editörü doğrudan gömme

Editör iframe gerektirmeden bir DOM elemanına bağlanabilir. İç arayüz Shadow DOM
içinde tutulur; görsel yükleme, bekleyen işlerin tamamlanması ve statik SVG
önizleme üretimi host uygulamaya açık bir API üzerinden yürütülür.

```js
import { initializeDndEditor, createDefaultActivity } from '@mhmttosun/dnd/editor';

const editor = initializeDndEditor({
  container: document.querySelector('#editor'),
  activity: createDefaultActivity('matching', 'Eşleştirme'),
  uploadImage: async (file, { signal }) => {
    const url = await uploadToYourStorage(file, { signal });
    return { url };
  },
  ui: { fileActions: false },
});

await editor.flush();
const activity = editor.getActivity();
const previewSvg = await editor.exportPreview();
editor.destroy();
```

`ActivityPlayer` önceki bir denemeyi `initialState` ile geri yükleyebilir; güncel
durum `getState()` ile alınır ve gerekirse `setState()` ile değiştirilebilir.

### 1. Kurulum (NPM ile)
```bash
npm install @mhmttosun/dnd
```

---

### 2. Kullanım Senaryoları

#### A. W3C Standart Web Component (`<dnd-player>`)
Hiçbir framework bağımlılığı olmadan, HTML'e doğrudan standart etiket olarak eklenir:

```html
<!-- CSS ve Script dahil edilir -->
<link rel="stylesheet" href="node_modules/@mhmttosun/dnd/dist/player.css">
<script src="node_modules/@mhmttosun/dnd/dist/dnd-player-element.js"></script>

<!-- Standart HTML Etiketi -->
<dnd-player 
  src="/path/to/activity.json" 
  sound="true"
  style="height: 600px;">
</dnd-player>

<script>
  const playerEl = document.querySelector('dnd-player');
  playerEl.addEventListener('dnd:complete', (e) => {
    console.log('Etkinlik Bitti! Skor:', e.detail.score, 'Deneme:', e.detail.attempts);
  });
</script>
```

#### B. React Entegrasyonu (React Component & Lifecycle)
```jsx
import React, { useEffect, useRef } from 'react';
import { ActivityPlayer } from '@mhmttosun/dnd/player';
import '@mhmttosun/dnd/player.css';

export function ActivityView({ activityData, onFinished }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. Oynatıcıyı Başlat (Mount)
    const player = new ActivityPlayer({
      target: containerRef.current,
      data: activityData,
      sound: true,
      onComplete: (stats) => onFinished(stats)
    });

    // 2. Bellek Temizliği (Unmount Destroy)
    return () => player.destroy();
  }, [activityData]);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

#### C. Vue 3 (Composition API)
```vue
<template>
  <div ref="container" style="width: 100%; height: 600px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ActivityPlayer } from '@mhmttosun/dnd/player';
import '@mhmttosun/dnd/player.css';

const props = defineProps({ activityData: Object });
const emit = defineEmits(['complete']);
const container = ref(null);
let player = null;

onMounted(() => {
  player = new ActivityPlayer({
    target: container.value,
    data: props.activityData,
    onComplete: (stats) => emit('complete', stats)
  });
});

onUnmounted(() => {
  if (player) player.destroy();
});
</script>
```

#### D. Vanilla JS (Düz Web Sayfası)
```javascript
import { ActivityPlayer } from '@mhmttosun/dnd/player';
import '@mhmttosun/dnd/player.css';

const player = new ActivityPlayer({
  target: '#my-container',
  src: 'samples/2_hayvanlar_eslestirme.json',
  sound: true,
  onComplete: (stats) => alert(`Tebrikler! Puan: %${stats.score}`)
});

// İstenildiğinde:
// player.reset();
// player.destroy();
```

#### E. Editörün Başka Uygulamalara Gömülmesi (Embedded Editor) & Canlı JSON Export

Editör bir CMS, LMS (Moodle, Canvas vb.), öğretmen yönetim paneli veya React/Vue uygulamasının içerisine `<iframe>` veya bileşen olarak gömüldüğünde:
* **Üst Başlık (Header) Otomatik Gizlenir:** Sayfa bir `<iframe>` içinde açıldığında veya URL'e `?embedded=true` (veya `?header=false`) eklendiğinde editörün üst başlık çubuğu (`.app-top-header`) gizlenir ve çalışma alanı tüm ekranı kaplar.
* **Sahnenin JSON Verisini Kolayca Alma:** Host uygulama tek satırda güncel sahne JSON'ını alabilir.

```html
<!-- Host Uygulama (LMS / Portal / React) -->
<iframe id="dnd-editor" src="/dnd/index.html?embedded=true" style="width: 100%; height: 750px; border: none;"></iframe>

<script>
  const editorFrame = document.getElementById('dnd-editor');

  // 1. YÖNTEM: Doğrudan JavaScript Kısayolu (Same-Origin)
  function saveFromEditor() {
    // Tek satırda güncel sahnenin JSON nesnesi:
    const projectData = editorFrame.contentWindow.dndExport();
    console.log('Sahne JSON:', projectData);
    return projectData;
  }

  // 2. YÖNTEM: postMessage API (Cross-Origin / Güvenli İletişim)
  function requestEditorData() {
    editorFrame.contentWindow.postMessage({ type: 'DND_GET_DATA' }, '*');
  }

  // Editörden gelen yanıtları ve anlık değişiklikleri dinleme:
  window.addEventListener('message', (event) => {
    // İstek üzerine dönen JSON
    if (event.data.type === 'DND_DATA_RESPONSE') {
      console.log('Alınan Proje JSON:', event.data.data);
    }
    // Sahnede kullanıcı nesne taşıdığında / düzenlediğinde canlı fırlatılan bildirim
    if (event.data.type === 'DND_DATA_CHANGED') {
      console.log('Canlı Değişiklik:', event.data.data);
    }
  });

  // İstenirse ebeveynden yeni proje verisi yükleme:
  // editorFrame.contentWindow.postMessage({ type: 'DND_LOAD_DATA', data: newProjectJson }, '*');
</script>
```

---

## 🧪 Otomatik Testleri Çalıştırma

Proje; mimari bütünlüğü, Canvas kullanılmama kuralını, matematiksel koordinat dönüşümlerini, mini araç çubuğunun tüm popup ve stepper özelliklerini doğrulayan 27 aşamalı test paketine sahiptir.

Testleri çalıştırmak için:
```bash
python3 tests/run_tests.py
# veya
npm test
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak sunulmaktadır.
