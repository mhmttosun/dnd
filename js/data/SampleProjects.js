/**
 * SampleProjects - 4 temel etkinlik türü için hazır, yüksek kaliteli ve
 * görsel olarak zengin örnek projeler.
 */

// SVG Vektör Görsel Üreteçleri (Data URL)
function createSvgDataUrl(svgString) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim());
}

// 1. İnsan Anatomisi Vektör Görseli
const humanBodySvg = createSvgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 550" width="400" height="550">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fdba74" />
    </linearGradient>
    <linearGradient id="organGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fda4af" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
    <linearGradient id="lungGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>

  <!-- Kafa ve Boyun -->
  <circle cx="200" cy="70" r="45" fill="url(#bodyGrad)" stroke="#ea580c" stroke-width="2" />
  <rect x="188" y="110" width="24" height="30" fill="url(#bodyGrad)" />

  <!-- Gövde -->
  <path d="M 140 140 C 130 180, 125 240, 135 340 C 140 390, 150 430, 200 430 C 250 430, 260 390, 265 340 C 275 240, 270 180, 260 140 Z" fill="url(#bodyGrad)" stroke="#ea580c" stroke-width="2" />

  <!-- Omuzlar ve Kollar (Kısa) -->
  <path d="M 140 140 C 100 170, 90 230, 95 300" stroke="#fed7aa" stroke-width="26" stroke-linecap="round" fill="none" />
  <path d="M 260 140 C 300 170, 310 230, 305 300" stroke="#fed7aa" stroke-width="26" stroke-linecap="round" fill="none" />

  <!-- Beyin Şematik Çizgisi -->
  <path d="M 180 65 Q 200 45 220 65 Q 210 85 190 85 Z" fill="#fbcfe8" stroke="#db2777" stroke-width="1.5" opacity="0.85" />

  <!-- Akciğerler Şematik -->
  <path d="M 160 180 C 145 200, 150 250, 175 250 C 185 240, 185 200, 175 180 Z" fill="url(#lungGrad)" stroke="#0284c7" stroke-width="1.5" opacity="0.9" />
  <path d="M 240 180 C 255 200, 250 250, 225 250 C 215 240, 215 200, 225 180 Z" fill="url(#lungGrad)" stroke="#0284c7" stroke-width="1.5" opacity="0.9" />

  <!-- Kalp Şematik -->
  <path d="M 200 215 C 190 200, 175 210, 185 230 L 200 245 L 215 230 C 225 210, 210 200, 200 215 Z" fill="url(#organGrad)" stroke="#be123c" stroke-width="1.5" />

  <!-- Karaciğer Şematik -->
  <path d="M 175 270 C 160 275, 170 305, 205 305 C 220 295, 215 270, 195 270 Z" fill="#ca8a04" stroke="#a16207" stroke-width="1.5" opacity="0.85" />

  <!-- Mide Şematik -->
  <path d="M 210 275 C 235 280, 240 320, 215 330 C 195 330, 200 295, 210 275 Z" fill="#fb923c" stroke="#c2410c" stroke-width="1.5" opacity="0.9" />
</svg>
`);

// 2. Hayvan İkonları
const lionSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#fef08a"/><circle cx="50" cy="50" r="30" fill="#f59e0b"/><circle cx="40" cy="46" r="4" fill="#1e293b"/><circle cx="60" cy="46" r="4" fill="#1e293b"/><polygon points="46,55 54,55 50,60" fill="#78350f"/><path d="M 45 64 Q 50 68 55 64" stroke="#78350f" stroke-width="2" fill="none"/><text x="50" y="88" font-size="12" font-family="sans-serif" font-weight="bold" fill="#78350f" text-anchor="middle">ASLAN</text></svg>`);
const penguinSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="32" ry="42" fill="#0f172a"/><ellipse cx="50" cy="54" rx="22" ry="30" fill="#ffffff"/><circle cx="42" cy="38" r="3.5" fill="#0f172a"/><circle cx="58" cy="38" r="3.5" fill="#0f172a"/><polygon points="46,45 54,45 50,54" fill="#f97316"/><ellipse cx="36" cy="88" rx="8" ry="4" fill="#f97316"/><ellipse cx="64" cy="88" rx="8" ry="4" fill="#f97316"/><text x="50" y="24" font-size="11" font-family="sans-serif" font-weight="bold" fill="#38bdf8" text-anchor="middle">PENGUEN</text></svg>`);
const dolphinSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 20 65 Q 40 25 75 35 Q 85 45 80 55 Q 60 55 35 70 Z" fill="#0284c7"/><polygon points="75,35 90,20 85,38" fill="#0284c7"/><polygon points="48,32 54,18 58,34" fill="#0369a1"/><circle cx="32" cy="52" r="3" fill="#ffffff"/><circle cx="31" cy="52" r="1.5" fill="#0f172a"/><text x="50" y="90" font-size="12" font-family="sans-serif" font-weight="bold" fill="#0284c7" text-anchor="middle">YUNUS</text></svg>`);
const eagleSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#78350f"/><circle cx="50" cy="40" r="26" fill="#f8fafc"/><circle cx="42" cy="38" r="3.5" fill="#ca8a04"/><polygon points="45,44 55,44 50,58" fill="#eab308"/><text x="50" y="88" font-size="12" font-family="sans-serif" font-weight="bold" fill="#fef08a" text-anchor="middle">KARTAL</text></svg>`);

// 3. Yaşam Döngüsü İkonları (Kelebek)
const eggSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="65" rx="35" ry="18" fill="#84cc16"/><ellipse cx="48" cy="48" rx="14" ry="18" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/><circle cx="48" cy="42" r="3" fill="#ffffff"/><text x="50" y="92" font-size="11" font-family="sans-serif" font-weight="bold" fill="#365314" text-anchor="middle">1. YUMURTA</text></svg>`);
const caterpillarSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="25" cy="55" r="14" fill="#22c55e"/><circle cx="45" cy="50" r="14" fill="#16a34a"/><circle cx="65" cy="55" r="14" fill="#15803d"/><circle cx="80" cy="45" r="15" fill="#84cc16"/><circle cx="76" cy="40" r="2.5" fill="#000"/><circle cx="84" cy="40" r="2.5" fill="#000"/><text x="50" y="92" font-size="11" font-family="sans-serif" font-weight="bold" fill="#14532d" text-anchor="middle">2. TIRTIL</text></svg>`);
const chrysalisSvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="46" y="10" width="8" height="25" fill="#78350f"/><path d="M 50 35 C 30 50, 35 75, 50 90 C 65 75, 70 50, 50 35 Z" fill="#84cc16" stroke="#4d7c0f" stroke-width="2"/><text x="50" y="96" font-size="11" font-family="sans-serif" font-weight="bold" fill="#365314" text-anchor="middle">3. KOZA</text></svg>`);
const butterflySvg = createSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 50 50 C 20 20, 10 50, 30 70 C 40 80, 48 65, 50 55 Z" fill="#ec4899"/><path d="M 50 50 C 80 20, 90 50, 70 70 C 60 80, 52 65, 50 55 Z" fill="#3b82f6"/><ellipse cx="50" cy="52" rx="4" ry="18" fill="#1e293b"/><text x="50" y="94" font-size="11" font-family="sans-serif" font-weight="bold" fill="#1e293b" text-anchor="middle">4. KELEBEK</text></svg>`);

const SAMPLE_PROJECTS = {
  // 1. ETKİNLİK: GÖRSEL ÜZERİNDE ETİKETLEME (ORGANLAR)
  'image-labeling': {
    version: '1.0',
    project: {
      id: 'proj_sample_labeling',
      name: 'İnsan Vücudundaki Organlar',
      activityType: 'image-labeling',
      description: 'Organ etiketlerini insan vücudu üzerindeki doğru konumlara yerleştirin.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#f8fafc',
      backgroundImage: null
    },
    objects: [
      // Başlık ve Açıklama
      {
        id: 'title_1',
        name: 'Ana Başlık',
        type: 'text',
        role: 'decorative',
        x: 40,
        y: 30,
        width: 440,
        height: 50,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'İnsan Vücudu ve Organlarımız',
        fontSize: 26,
        fontWeight: '800',
        textColor: '#0f172a',
        textAlign: 'left',
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },
      {
        id: 'desc_1',
        name: 'Açıklama',
        type: 'text',
        role: 'decorative',
        x: 40,
        y: 80,
        width: 440,
        height: 35,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Sağ taraftaki organ etiketlerini vücut üzerindeki doğru hedef kutucuklarına sürükleyin.',
        fontSize: 14,
        fontWeight: '500',
        textColor: '#64748b',
        textAlign: 'left',
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },

      // Ana Anatomi Görseli (Ortada)
      {
        id: 'bg_anatomy',
        name: 'Anatomi Çizimi',
        type: 'image',
        role: 'decorative',
        x: 410,
        y: 80,
        width: 380,
        height: 530,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        src: humanBodySvg,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
      },

      // Hedef Noktaları (Görsel Üzerinde)
      {
        id: 'target_brain',
        name: 'Hedef: Beyin',
        type: 'zone',
        role: 'target',
        x: 540,
        y: 120,
        width: 120,
        height: 44,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Baş Bölgesi',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#3b82f6',
        backgroundColor: 'rgba(239, 246, 255, 0.75)',
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        id: 'target_lungs',
        name: 'Hedef: Akciğerler',
        type: 'zone',
        role: 'target',
        x: 430,
        y: 250,
        width: 130,
        height: 48,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Göğüs',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#0284c7',
        backgroundColor: 'rgba(240, 249, 255, 0.75)',
        borderColor: '#0284c7',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        id: 'target_heart',
        name: 'Hedef: Kalp',
        type: 'zone',
        role: 'target',
        x: 640,
        y: 270,
        width: 120,
        height: 48,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Kalp',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#e11d48',
        backgroundColor: 'rgba(255, 241, 242, 0.75)',
        borderColor: '#e11d48',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        id: 'target_stomach',
        name: 'Hedef: Mide',
        type: 'zone',
        role: 'target',
        x: 610,
        y: 360,
        width: 120,
        height: 48,
        rotation: 0,
        zIndex: 3,
        locked: false,
        visible: true,
        text: 'Hedef: Karın',
        fontSize: 12,
        fontWeight: '600',
        textColor: '#ea580c',
        backgroundColor: 'rgba(255, 247, 237, 0.75)',
        borderColor: '#ea580c',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderRadius: 8
      },

      // Sürüklenebilir Etiketler (Sağ Panelde)
      {
        id: 'drag_brain',
        name: 'Etiket: Beyin',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 130,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '🧠 Beyin',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      },
      {
        id: 'drag_lungs',
        name: 'Etiket: Akciğerler',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 200,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '🫁 Akciğerler',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      },
      {
        id: 'drag_heart',
        name: 'Etiket: Kalp',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 270,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '❤️ Kalp',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      },
      {
        id: 'drag_stomach',
        name: 'Etiket: Mide',
        type: 'text',
        role: 'draggable',
        x: 930,
        y: 340,
        width: 150,
        height: 48,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: '🥘 Mide',
        fontSize: 16,
        fontWeight: '700',
        textColor: '#1e293b',
        backgroundColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
      }
    ],
    answerKey: {
      'drag_brain': 'target_brain',
      'drag_lungs': 'target_lungs',
      'drag_heart': 'target_heart',
      'drag_stomach': 'target_stomach'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      showTargetsInGame: true,
      completionMessage: 'Mükemmel! Bütün ana organları doğru yerlerine yerleştirdiniz.'
    }
  },

  // 2. ETKİNLİK: SÜRÜKLE-BIRAK EŞLEŞTİRME (KAVRAM VE TANIM)
  'matching': {
    version: '1.0',
    project: {
      id: 'proj_sample_matching',
      name: 'Kavram ve Tanım',
      activityType: 'matching',
      description: 'Kavramları doğru tanımlarla eşleştirin.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#ffffff',
      backgroundImage: null
    },
    objects: [
      // Ana Başlık
      {
        id: 'match_title',
        name: 'Başlık',
        type: 'text',
        role: 'decorative',
        x: 120,
        y: 45,
        width: 500,
        height: 42,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Kavram ve Tanım',
        fontSize: 28,
        fontWeight: '700',
        textColor: '#0f172a',
        textAlign: 'left'
      },
      // Alt Açıklama
      {
        id: 'match_subtitle',
        name: 'Açıklama',
        type: 'text',
        role: 'decorative',
        x: 120,
        y: 92,
        width: 600,
        height: 28,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Kavramları doğru tanımlarla eşleştirin.',
        fontSize: 14,
        fontWeight: '500',
        textColor: '#64748b',
        textAlign: 'left'
      },
      // Dekoratif İnce Ayırıcı Çizgi
      {
        id: 'header_divider',
        name: 'Ayırıcı Çizgi',
        type: 'rectangle',
        role: 'decorative',
        x: 120,
        y: 130,
        width: 960,
        height: 1,
        rotation: 0,
        zIndex: 1,
        locked: false,
        visible: true,
        backgroundColor: '#e2e8f0',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0
      },
      // Kolon 1 Başlığı: KAVRAMLAR
      {
        id: 'col_kavramlar',
        name: 'Sütun Başlığı: Kavramlar',
        type: 'text',
        role: 'decorative',
        x: 120,
        y: 155,
        width: 250,
        height: 24,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'KAVRAMLAR',
        fontSize: 12,
        fontWeight: '700',
        textColor: '#64748b',
        textAlign: 'left'
      },
      // Kolon 2 Başlığı: TANIMLAR
      {
        id: 'col_tanimlar',
        name: 'Sütun Başlığı: Tanımlar',
        type: 'text',
        role: 'decorative',
        x: 520,
        y: 155,
        width: 250,
        height: 24,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'TANIMLAR',
        fontSize: 12,
        fontWeight: '700',
        textColor: '#64748b',
        textAlign: 'left'
      },
      // Sol Sütun: Sürüklenebilir Kavram Kartları (Turuncu Kenarlık)
      {
        id: 'drag_kuvvet',
        name: 'Kavram: Kuvvet',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 195,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Kuvvet',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'drag_enerji',
        name: 'Kavram: Enerji',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 275,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Enerji',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'drag_madde',
        name: 'Kavram: Madde',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 355,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Madde',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'drag_isi',
        name: 'Kavram: Isı',
        type: 'text',
        role: 'draggable',
        x: 120,
        y: 435,
        width: 320,
        height: 60,
        rotation: 0,
        zIndex: 10,
        locked: false,
        visible: true,
        text: 'Isı',
        fontSize: 16,
        fontWeight: '600',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#f97316',
        borderWidth: 2,
        borderRadius: 12
      },
      // Sağ Sütun: Hedef Tanım Kutuları (Mavi Kenarlık, Açık Mavi Dolgu)
      {
        id: 'target_is',
        name: 'Tanım: İş yapabilme kapasitesi',
        type: 'text',
        role: 'target',
        x: 520,
        y: 195,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'İş yapabilme kapasitesi',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'target_hareket',
        name: 'Tanım: Hareketi değiştirebilen etki',
        type: 'text',
        role: 'target',
        x: 520,
        y: 275,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'Hareketi değiştirebilen etki',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'target_sicaklik',
        name: 'Tanım: Sıcaklık farkıyla aktarılan enerji',
        type: 'text',
        role: 'target',
        x: 520,
        y: 355,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'Sıcaklık farkıyla aktarılan enerji',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      },
      {
        id: 'target_kutle',
        name: 'Tanım: Kütlesi ve hacmi olan varlık',
        type: 'text',
        role: 'target',
        x: 520,
        y: 435,
        width: 560,
        height: 60,
        rotation: 0,
        zIndex: 2,
        locked: false,
        visible: true,
        text: 'Kütlesi ve hacmi olan varlık',
        fontSize: 16,
        fontWeight: '500',
        textColor: '#0f172a',
        textAlign: 'center',
        backgroundColor: '#f8faff',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 12
      }
    ],
    answerKey: {
      'drag_kuvvet': 'target_hareket',
      'drag_enerji': 'target_is',
      'drag_madde': 'target_kutle',
      'drag_isi': 'target_sicaklik'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      completionMessage: 'Tebrikler! Bütün kavramları doğru tanımlarla eşleştirdiniz.'
    }
  },

  // 3. ETKİNLİK: KATEGORİLERE AYIRMA (MEYVELER VE SEBZELER)
  'categorization': {
    version: '1.0',
    project: {
      id: 'proj_sample_categorization',
      name: 'Meyveler ve Sebzeler',
      activityType: 'categorization',
      description: 'Yiyecekleri Meyveler veya Sebzeler sepetlerine sürükleyerek gruplandırın.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#f8fafc',
      backgroundImage: null
    },
    objects: [
      {
        id: 'cat_title',
        name: 'Başlık',
        type: 'text',
        role: 'decorative',
        x: 60,
        y: 25,
        width: 600,
        height: 45,
        zIndex: 1,
        locked: false,
        visible: true,
        text: '🍎 Besin Grupları: Meyveler ve Sebzeler 🥦',
        fontSize: 24,
        fontWeight: '800',
        textColor: '#0f172a',
        textAlign: 'left'
      },

      // 2 Büyük Kategori Alanı (Sol ve Sağ)
      {
        id: 'cat_fruits',
        name: 'Kategori: Meyveler',
        type: 'zone',
        role: 'category',
        x: 80,
        y: 90,
        width: 380,
        height: 520,
        zIndex: 2,
        locked: false,
        visible: true,
        text: '🍓 Meyveler Sepeti',
        fontSize: 20,
        fontWeight: '800',
        textColor: '#991b1b',
        backgroundColor: '#fff1f2',
        borderColor: '#f43f5e',
        borderStyle: 'dashed',
        borderWidth: 3,
        borderRadius: 20
      },
      {
        id: 'cat_vegetables',
        name: 'Kategori: Sebzeler',
        type: 'zone',
        role: 'category',
        x: 740,
        y: 90,
        width: 380,
        height: 520,
        zIndex: 2,
        locked: false,
        visible: true,
        text: '🥕 Sebzeler Sepeti',
        fontSize: 20,
        fontWeight: '800',
        textColor: '#166534',
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        borderStyle: 'dashed',
        borderWidth: 3,
        borderRadius: 20
      },

      // Ortadaki Sürüklenebilir Öğeler (8 adet)
      { id: 'drag_apple', name: 'Elma', type: 'text', role: 'draggable', x: 510, y: 100, width: 170, height: 50, text: '🍎 Kırmızı Elma', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_carrot', name: 'Havuç', type: 'text', role: 'draggable', x: 510, y: 165, width: 170, height: 50, text: '🥕 Havuç', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_banana', name: 'Muz', type: 'text', role: 'draggable', x: 510, y: 230, width: 170, height: 50, text: '🍌 Sarı Muz', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_broccoli', name: 'Brokoli', type: 'text', role: 'draggable', x: 510, y: 295, width: 170, height: 50, text: '🥦 Taze Brokoli', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_strawberry', name: 'Çilek', type: 'text', role: 'draggable', x: 510, y: 360, width: 170, height: 50, text: '🍓 Çilek', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_eggplant', name: 'Patlıcan', type: 'text', role: 'draggable', x: 510, y: 425, width: 170, height: 50, text: '🍆 Patlıcan', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_orange', name: 'Portakal', type: 'text', role: 'draggable', x: 510, y: 490, width: 170, height: 50, text: '🍊 Sulu Portakal', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 },
      { id: 'drag_corn', name: 'Mısır', type: 'text', role: 'draggable', x: 510, y: 555, width: 170, height: 50, text: '🌽 Tatlı Mısır', fontSize: 16, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 10, zIndex: 10 }
    ],
    answerKey: {
      'drag_apple': 'cat_fruits',
      'drag_banana': 'cat_fruits',
      'drag_strawberry': 'cat_fruits',
      'drag_orange': 'cat_fruits',
      'drag_carrot': 'cat_vegetables',
      'drag_broccoli': 'cat_vegetables',
      'drag_eggplant': 'cat_vegetables',
      'drag_corn': 'cat_vegetables'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      completionMessage: 'Tebrikler! Bütün meyve ve sebzeleri doğru sepetlere ayırdınız.'
    }
  },

  // 4. ETKİNLİK: SIRALAMA (KELEBEĞİN YAŞAM DÖNGÜSÜ)
  'sequencing': {
    version: '1.0',
    project: {
      id: 'proj_sample_sequencing',
      name: 'Kelebeğin Yaşam Döngüsü',
      activityType: 'sequencing',
      description: 'Kelebeğin oluşum aşamalarını baştan sona doğru sıraya yerleştirin.'
    },
    stage: {
      width: 1200,
      height: 675,
      backgroundColor: '#f8fafc',
      backgroundImage: null
    },
    objects: [
      {
        id: 'seq_title',
        name: 'Başlık',
        type: 'text',
        role: 'decorative',
        x: 60,
        y: 40,
        width: 600,
        height: 45,
        zIndex: 1,
        locked: false,
        visible: true,
        text: '🦋 Kelebeğin Yaşam Döngüsünü Sıralayalım',
        fontSize: 26,
        fontWeight: '800',
        textColor: '#0f172a',
        textAlign: 'left'
      },
      {
        id: 'seq_desc',
        name: 'Açıklama',
        type: 'text',
        role: 'decorative',
        x: 60,
        y: 90,
        width: 600,
        height: 30,
        zIndex: 1,
        locked: false,
        visible: true,
        text: 'Aşağıdaki aşamaları 1. adımdan 4. adıma doğru sırayla kutulara yerleştirin.',
        fontSize: 15,
        fontWeight: '500',
        textColor: '#64748b',
        textAlign: 'left'
      },

      // Üst Bölüm: Sıralama Kutuları (Slots)
      { id: 'slot_1', name: '1. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 0, x: 80, y: 150, width: 220, height: 200, text: '1. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },
      { id: 'slot_2', name: '2. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 1, x: 360, y: 150, width: 220, height: 200, text: '2. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },
      { id: 'slot_3', name: '3. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 2, x: 640, y: 150, width: 220, height: 200, text: '3. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },
      { id: 'slot_4', name: '4. Adım Yuvası', type: 'zone', role: 'sequence_slot', slotIndex: 3, x: 920, y: 150, width: 220, height: 200, text: '4. Aşama', fontSize: 16, fontWeight: '700', backgroundColor: '#f5f3ff', borderColor: '#8b5cf6', borderStyle: 'dashed', borderWidth: 2.5, borderRadius: 16, zIndex: 2 },

      // Alt Bölüm: Karışık Başlayan Aşamalar
      { id: 'drag_step_egg', name: 'Aşama: Yumurta', type: 'image', role: 'draggable', x: 80, y: 410, width: 210, height: 180, src: eggSvg, text: 'Yumurta Evresi', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 },
      { id: 'drag_step_caterpillar', name: 'Aşama: Tırtıl', type: 'image', role: 'draggable', x: 360, y: 410, width: 210, height: 180, src: caterpillarSvg, text: 'Tırtıl (Larva)', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 },
      { id: 'drag_step_chrysalis', name: 'Aşama: Koza', type: 'image', role: 'draggable', x: 640, y: 410, width: 210, height: 180, src: chrysalisSvg, text: 'Krizalit (Koza)', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 },
      { id: 'drag_step_butterfly', name: 'Aşama: Kelebek', type: 'image', role: 'draggable', x: 920, y: 410, width: 210, height: 180, src: butterflySvg, text: 'Yetişkin Kelebek', fontSize: 15, fontWeight: '700', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 2, borderRadius: 14, zIndex: 10 }
    ],
    answerKey: {
      'drag_step_egg': 'slot_1',
      'drag_step_caterpillar': 'slot_2',
      'drag_step_chrysalis': 'slot_3',
      'drag_step_butterfly': 'slot_4'
    },
    settings: {
      evaluationMode: 'instant',
      wrongAnswerBehavior: 'return',
      correctAnswerBehavior: 'lock',
      showFeedback: true,
      showScore: true,
      allowRetry: true,
      shuffleDraggables: true,
      soundEnabled: true,
      completionMessage: 'Harika bir biyologsun! Kelebeğin yaşam evrelerini kusursuz sıraladın.'
    }
  }
};

// Global namespace
window.DND = window.DND || {};
window.DND.SAMPLE_PROJECTS = SAMPLE_PROJECTS;
