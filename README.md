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
