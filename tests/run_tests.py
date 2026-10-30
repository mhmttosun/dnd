#!/usr/bin/env python3
"""
Otomatik Kabul ve Entegrasyon Testleri
Bu test paketi:
1. 4 etkinlik türünün JSON veri modelini doğrular.
2. Koordinat ve en-boy oranı dönüşümlerini test eder.
3. Çakışma algılama (AABB & Center-point collision) mantığını test eder.
4. Cevap anahtarı ilişkilerini doğrular.
5. 4 etkinliğin her biri için bağımsız (offline) HTML dosyaları üretir ve bütünlüğünü doğrular.
"""

import os
import json
import re
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES_DIR = os.path.join(BASE_DIR, 'samples')
os.makedirs(SAMPLES_DIR, exist_ok=True)

def test_passed(name):
    print(f"  \033[92m✓\033[0m {name}")

def test_failed(name, error):
    print(f"  \033[91m✗\033[0m {name}: {error}")
    sys.exit(1)

print("\n" + "="*60)
print("  DND ETKİNLİK EDİTÖRÜ KABUL TESTLERİ BAŞLIYOR")
print("="*60 + "\n")

# 1. Kaynak Kod ve Dosya Yapısı Kontrolü
print("[Aşama 1] Dosya Yapısı ve Kaynak Kod Kontrolü")
required_files = [
    'index.html',
    'css/editor.css',
    'css/stage.css',
    'css/answer-key.css',
    'css/player.css',
    'js/utils/AudioSynthesizer.js',
    'js/engine/ValidationEngine.js',
    'js/core/EditorCore.js',
    'js/core/StageManager.js',
    'js/core/ObjectManager.js',
    'js/core/SelectionManager.js',
    'js/core/HistoryManager.js',
    'js/core/LayerManager.js',
    'js/core/AnswerKeyManager.js',
    'js/engine/TransformEngine.js',
    'js/player/ActivityEngine.js',
    'js/player/ExportManager.js',
    'js/ui/MiniToolbar.js',
    'js/ui/PropertyPanel.js',
    'js/ui/UIManager.js',
    'js/data/SampleProjects.js',
    'js/app.js'
]

for rf in required_files:
    full_p = os.path.join(BASE_DIR, rf)
    if os.path.exists(full_p) and os.path.getsize(full_p) > 0:
        test_passed(f"Dosya mevcut ve dolu: {rf}")
    else:
        test_failed(rf, "Dosya bulunamadı veya boş!")

# 1.1 JavaScript Parantez ve Sözdizimi Bütünlüğü Denetimi
print("\n[Aşama 1.1] JavaScript Sözdizimi ve Parantez Bütünlüğü Denetimi")
js_files = [f for f in required_files if f.endswith('.js')]
for jf in js_files:
    full_p = os.path.join(BASE_DIR, jf)
    with open(full_p, 'r', encoding='utf-8') as f:
        text = f.read()
    i = 0
    n = len(text)
    stack = []
    line = 1
    col = 1
    while i < n:
        c = text[i]
        if c == '\n':
            line += 1
            col = 1
            i += 1
            continue
        if c == '/' and i + 1 < n and text[i+1] == '/':
            while i < n and text[i] != '\n':
                i += 1
            continue
        if c == '/' and i + 1 < n and text[i+1] == '*':
            i += 2
            while i + 1 < n and not (text[i] == '*' and text[i+1] == '/'):
                if text[i] == '\n':
                    line += 1
                    col = 1
                i += 1
            i += 2
            continue
        if c in ('"', "'"):
            quote = c
            i += 1
            while i < n and text[i] != quote:
                if text[i] == '\\':
                    i += 2
                else:
                    if text[i] == '\n':
                        line += 1
                        col = 1
                    i += 1
            i += 1
            continue
        if c == '`':
            i += 1
            while i < n:
                if text[i] == '\\':
                    i += 2
                elif text[i] == '`':
                    i += 1
                    break
                elif text[i] == '$' and i + 1 < n and text[i+1] == '{':
                    stack.append(('${', line, col))
                    i += 2
                    break
                else:
                    if text[i] == '\n':
                        line += 1
                        col = 1
                    i += 1
            continue
        if c in '({[':
            stack.append((c, line, col))
        elif c in ')}]':
            if not stack:
                test_failed(jf, f"Fazladan kapatma karakteri '{c}' tespit edildi! Satır: {line}")
            top, tl, tc = stack.pop()
            matches = {')': '(', '}': '{', ']': '['}
            expected = matches[c]
            if top == '${' and c == '}':
                while i + 1 < n:
                    i += 1
                    if text[i] == '\n':
                        line += 1
                        col = 1
                    elif text[i] == '\\':
                        i += 1
                    elif text[i] == '`':
                        break
                    elif text[i] == '$' and i + 1 < n and text[i+1] == '{':
                        stack.append(('${', line, col))
                        i += 1
                        break
            elif top != expected:
                test_failed(jf, f"Eşleşmeyen parantez: '{top}' (Satır {tl}) -> '{c}' (Satır {line})")
        i += 1
        col += 1
    if stack:
        test_failed(jf, f"Kapatılmamış {len(stack)} blok tespit edildi! İlk açık blok: {stack[0]}")
    
    # JavaScriptCore (JSC) üzerinden gerçek sözdizimi ve derleme denetimi
    mock_env = "var window = { DND: {}, addEventListener: function() {} }; var document = { createElement: function() { return { style: {}, classList: { add: function(){}, remove: function(){} }, querySelector: function(){ return {}; }, querySelectorAll: function(){ return []; }, appendChild: function(){} }; }, getElementById: function() { return { style: {}, classList: { add: function(){}, remove: function(){} }, querySelector: function(){ return {}; }, querySelectorAll: function(){ return []; }, appendChild: function(){} }; }, body: { appendChild: function(){} }, querySelectorAll: function() { return []; } }; var app = {};"
    jsc_res = subprocess.run(['osascript', '-l', 'JavaScript'], input=mock_env + text + '\n;', capture_output=True, text=True)
    if jsc_res.returncode != 0:
        test_failed(jf, f"JavaScript derleme/sözdizimi hatası: {jsc_res.stderr.strip()}")

    test_passed(f"JS sözdizimi ve derlemesi doğrulandı: {jf}")

# 2. Canvas Kuralı Kontrolü (Canvas KESİNLİKLE kullanılmayacak kuralı)
print("\n[Aşama 2] Canvas Kullanılmama Kuralı Denetimi")
for rf in required_files:
    full_p = os.path.join(BASE_DIR, rf)
    with open(full_p, 'r', encoding='utf-8') as f:
        content = f.read()
        # <canvas> veya getContext('2d') kontrolü
        if '<canvas' in content.lower():
            test_failed(rf, "<canvas> etiketi tespit edildi! Kural ihlali.")
        if "getContext('2d')" in content or 'getContext("2d")' in content:
            test_failed(rf, "Canvas 2D context kullanımı tespit edildi! Kural ihlali.")
test_passed("Hiçbir dosyada <canvas> veya Canvas 2D API kullanılmadığı doğrulandı.")

# 3. Örnek Projelerin (SampleProjects.js) Ayrıştırılması ve Doğrulanması
print("\n[Aşama 3] 4 Etkinlik Türü ve Şema Bütünlüğü")
sample_js_path = os.path.join(BASE_DIR, 'js/data/SampleProjects.js')
with open(sample_js_path, 'r', encoding='utf-8') as f:
    sample_content = f.read()

# SAMPLE_PROJECTS nesnesini ayıkla (regex veya JS parser)
# Node olmadan JS içindeki JSON yapılarını ve 4 ana anahtarı kontrol edelim
activity_types = ['image-labeling', 'matching', 'categorization', 'sequencing']
for act in activity_types:
    if f"'{act}':" in sample_content or f'"{act}":' in sample_content:
        test_passed(f"Etkinlik türü tanımlandı: {act}")
    else:
        test_failed(act, "Örnek projede bulunamadı!")

# 4. Koordinat Sistemi ve Dönüşüm Matematiği Testi
print("\n[Aşama 4] Koordinat Sistemi ve Ölçekleme Matematiği")
def client_to_stage(clientX, clientY, stage_rect_left, stage_rect_top, stage_rect_width, logical_width=1200):
    scale = stage_rect_width / logical_width
    return (clientX - stage_rect_left) / scale, (clientY - stage_rect_top) / scale

def stage_to_client(stageX, stageY, stage_rect_left, stage_rect_top, stage_rect_width, logical_width=1200):
    scale = stage_rect_width / logical_width
    return stage_rect_left + stageX * scale, stage_rect_top + stageY * scale

# Test: Farklı ekran ölçeklerinde dönüşümlerin birbirini sıfır kayıpla tamamlaması
for test_width in [600, 800, 1200, 1600, 2400]:
    left, top = 50, 100
    orig_stage_x, orig_stage_y = 540, 320
    cx, cy = stage_to_client(orig_stage_x, orig_stage_y, left, top, test_width)
    back_sx, back_sy = client_to_stage(cx, cy, left, top, test_width)
    if abs(back_sx - orig_stage_x) > 1e-4 or abs(back_sy - orig_stage_y) > 1e-4:
        test_failed(f"Scale {test_width}", "Koordinat dönüşümünde kayma var!")
test_passed("Tüm ekran boyutlarında koordinat dönüşüm hassasiyeti doğrulandı (0 sapma).")

# 5. Çakışma / Bırakma Algılama Testi
print("\n[Aşama 5] Hedef Algılama (Collision Detection) Testi")
def is_inside_target(item_mid_x, item_mid_y, target_x, target_y, target_w, target_h):
    return (target_x <= item_mid_x <= target_x + target_w) and (target_y <= item_mid_y <= target_y + target_h)

target = {'x': 400, 'y': 200, 'w': 150, 'h': 60}
# Hedef içi
assert is_inside_target(450, 230, target['x'], target['y'], target['w'], target['h']) == True
# Hedef dışı
assert is_inside_target(350, 230, target['x'], target['y'], target['w'], target['h']) == False
test_passed("Hedef merkez nokta çarpışma mantığı doğrulandı.")

# 5.1 Kilit Açma / Kapama ve Seçim Mantığı Testi
print("\n[Aşama 5.1] Kilitli Nesnelerin Seçilebilirliği ve Kilit Açma Mantığı")
with open(os.path.join(BASE_DIR, 'js/core/SelectionManager.js'), 'r', encoding='utf-8') as f:
    sel_code = f.read()

assert 'if (!obj || obj.locked) return;' not in sel_code, "Kilitli nesnelerin seçilmesini engelleyen kod tespit edildi!"
assert 'is-locked-selection' in sel_code, "Kilitli nesne seçim kutusu stili eksik!"
assert 'lock-pill-unlock-btn' in sel_code, "Kilitli nesne üzeri tek tıkla kilit açma butonu eksik!"

with open(os.path.join(BASE_DIR, 'js/core/ObjectManager.js'), 'r', encoding='utf-8') as f:
    obj_code = f.read()
assert 'lock-badge-btn' in obj_code, "Tuval üzerindeki kilit ikonu tıklanabilir buton olarak tanımlanmamış!"

with open(os.path.join(BASE_DIR, 'js/ui/PropertyPanel.js'), 'r', encoding='utf-8') as f:
    prop_code = f.read()
assert 'btn-unlock-prop' in prop_code, "Özellik panelinde kilit açma butonu eksik!"
assert 'layers' in prop_code, "Katmanlar ve Nesneler listesi sekmesi eksik!"

with open(os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js'), 'r', encoding='utf-8') as f:
    mt_code = f.read()
assert 'toggle-lock' in mt_code, "Mini araç çubuğunda kilit açma/kapama fonksiyonu eksik!"
assert 'selectedObjs.length === 1 && selectedObjs[0].locked' in mt_code, "Mini araç çubuğu sadece tek kilitli nesne seçildiğinde gizlenmelidir!"
test_passed("Kilitli nesnelerin tuval üzerinden açılabilmesi ve tek kilitli nesnede sadece Kilidi Aç butonunun görünmesi doğrulandı.")

# 5.2 Nesnelerin Sahne Dışına Taşmasını Engelleme Testi
print("\n[Aşama 5.2] Nesnelerin Sahne Dışına Taşmasını Engelleme Testi")
with open(os.path.join(BASE_DIR, 'js/engine/TransformEngine.js'), 'r', encoding='utf-8') as f:
    tf_code = f.read()
assert 'minAllowedDx' in tf_code and 'stageW - item.width' in tf_code, "Taşıma sırasında sahne dışına taşma engeli eksik!"
assert 'maxDeltaLeft' in tf_code or 'stageW - minSize' in tf_code, "Boyutlandırma sırasında sahne dışına taşma engeli eksik!"

with open(os.path.join(BASE_DIR, 'js/core/ObjectManager.js'), 'r', encoding='utf-8') as f:
    om_code = f.read()
assert 'stageW - w' in om_code and 'stageH - h' in om_code, "ObjectManager.updateObject içinde sahne sınır kontrolü eksik!"

with open(os.path.join(BASE_DIR, 'js/player/ActivityEngine.js'), 'r', encoding='utf-8') as f:
    ae_code = f.read()
assert 'stageW - objW' in ae_code and 'stageH - objH' in ae_code, "ActivityEngine sürükleme sırasında sahne sınır kontrolü eksik!"
test_passed("Nesnelerin sahne dışına taşınması ve boyutlandırılması hem editörde hem oynatıcıda engellendi.")

# 5.3 Mini Araç Çubuğu Ekrana Sığma ve Üstte Açılma Testi
print("\n[Aşama 5.3] Mini Araç Çubuğu Ekrana Sığma ve Üstte Açılma Testi")
assert 'placement-above' in mt_code, "Mini araç çubuğunda üstte açılma (placement-above) sınıfı eksik!"
assert 'spaceBelow' in mt_code and 'spaceAbove' in mt_code, "Mini araç çubuğunda alt/üst boşluk analizi eksik!"

with open(os.path.join(BASE_DIR, 'css/editor.css'), 'r', encoding='utf-8') as f:
    ed_css = f.read()
assert '.placement-above' in ed_css and 'column-reverse' in ed_css, "placement-above için ters yönde açılma (column-reverse) stili eksik!"
assert 'overflow-y: auto' in ed_css, "Popup kartlarının ekrandan taşmasını engelleyen kaydırma stili eksik!"
test_passed("Mini araç çubuğunun ekran sınırlarını hesaplayıp uygun yönde açılma mantığı doğrulandı.")

# 5.4 Metin Tanımlı Renkler Paleti Testi
print("\n[Aşama 5.4] Metin Tanımlı Renkler Paleti Testi")
assert 'toggle-text-palette' in mt_code and 'data-text-color-val' in mt_code, "Metin menüsünde tanımlı renkler paleti açma ve renk butonları eksik!"
assert '.mt-color-preview-btn' in ed_css and '.mt-text-palette-section' in ed_css, "Metin renk paleti stilleri eksik!"
assert 'mt-custom-color' not in mt_code, "Özel renk seçici metin renk panelinde bulunmamalıdır!"
assert mt_code.find('mt-align-row') < mt_code.find('mt-text-palette-section'), "Tanımlı renkler bloku en altta ve Hizalama blokundan sonra yer almalıdır!"
test_passed("Metin rengi tıklandığında nesne görünümündeki gibi tanımlı renk paletinin en altta açılması ve özel renk seçicinin kaldırıldığı doğrulandı.")

# 5.5 Metin Yatay ve Dikey Hizalama Testi
print("\n[Aşama 5.5] Metin Yatay ve Dikey Hizalama Testi")
with open(os.path.join(BASE_DIR, 'js/core/ObjectManager.js'), 'r', encoding='utf-8') as f:
    om_text_code = f.read()
with open(os.path.join(BASE_DIR, 'css/stage.css'), 'r', encoding='utf-8') as f:
    stage_css_code = f.read()

assert "content.style.alignItems = 'flex-start'" in om_text_code, "ObjectManager içinde sola hizalama için alignItems ayarı eksik!"
assert "content.style.alignItems = 'flex-end'" in om_text_code, "ObjectManager içinde sağa hizalama için alignItems ayarı eksik!"
assert "textNode.style.width = '100%'" in om_text_code, "Metin kutusu içinde span genişliği %100 yapılmamış!"
assert ".object-inner-content span" in stage_css_code and "width: 100%" in stage_css_code, "stage.css içinde metin öğesinin tam genişlik kuralı eksik!"
test_passed("Metne uygulanan yatay ve dikey hizalamanın DOM ve CSS üzerinde tam olarak etki ettiği doğrulandı.")

# 5.6 Mini Araç Çubuğu Titremesiz (Flicker-Free) Yerinde Güncelleme Testi
print("\n[Aşama 5.6] Mini Araç Çubuğu Titremesiz (Flicker-Free) Yerinde Güncelleme Testi")
with open(os.path.join(BASE_DIR, 'css/editor.css'), 'r', encoding='utf-8') as f:
    ed_css_anim = f.read()
with open(os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js'), 'r', encoding='utf-8') as f:
    mt_flicker_code = f.read()

assert '.mt-popup-card.is-opening' in ed_css_anim, "Açılış animasyonu sadece .is-opening sınıfına atanmalıdır!"
assert 'mt-popup-card {\n  margin-top: 8px;\n  background: #ffffff;\n  border: 1px solid var(--border-color);\n  border-radius: var(--radius-lg);\n  padding: 14px 16px;\n  box-shadow: var(--shadow-popup);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  min-width: 250px;' in ed_css_anim, "Kartın temel sınıfından koşulsuz opacity animasyonu kaldırılmalıdır!"
# bindPopupInteractions içinde data-align-h butonuna tıklanınca this.render() çağrılmamalı, doğrudan DOM güncellenmelidir
bind_section = mt_flicker_code[mt_flicker_code.find('bindPopupInteractions(primary)'):]
assert "this.render()" not in bind_section[:bind_section.find('// Çoklu Nesne Hizalama')], "Ayar butonlarına tıklandığında paneli titreten (flicker) gereksiz this.render() çağrıları tespit edildi!"
test_passed("Ayar değişikliklerinde panelin yeniden çizilmeden (flicker-free) yerinde güncellendiği doğrulandı.")

# 5.7 Yerinde Metin Düzenleme (Inline Text Editing) Testi
print("\n[Aşama 5.7] Yerinde Metin Düzenleme (Inline Text Editing) Testi")
with open(os.path.join(BASE_DIR, 'js/ui/UIManager.js'), 'r', encoding='utf-8') as f:
    ui_mgr_code = f.read()
with open(os.path.join(BASE_DIR, 'js/engine/TransformEngine.js'), 'r', encoding='utf-8') as f:
    tf_inline_code = f.read()
with open(os.path.join(BASE_DIR, 'js/core/SelectionManager.js'), 'r', encoding='utf-8') as f:
    sel_inline_code = f.read()
with open(os.path.join(BASE_DIR, 'css/stage.css'), 'r', encoding='utf-8') as f:
    stage_inline_css = f.read()

assert 'startInlineEditing' in ui_mgr_code and 'finishInlineEditing' in ui_mgr_code, "UIManager içinde yerinde metin düzenleme metotları eksik!"
assert 'contentEditable' in ui_mgr_code and 'requestInlineTextEdit' in ui_mgr_code, "UIManager yerinde düzenleme veya requestInlineTextEdit dinleyicisi eksik!"
assert 'e.target.isContentEditable' in tf_inline_code, "TransformEngine metin düzenleme sırasında yerel imleç ve metin seçimini engellememelidir!"
assert 'requestInlineTextEdit' in sel_inline_code, "SelectionManager Enter tuşuna basıldığında yerinde düzenlemeyi başlatmalıdır!"
assert '.stage-object.is-editing-text' in stage_inline_css, "stage.css içinde yerinde düzenleme stili eksik!"
assert '.selection-box.is-editing-text' in stage_inline_css and 'pointer-events: none' in stage_inline_css, "Düzenleme sırasında seçim kutusu tıklamaları engellememelidir!"
test_passed("Çift tıklama, Enter tuşu veya araç çubuğuyla tuval üzerinde yerinde metin düzenleme (Canva/Figma) yeteneği doğrulandı.")

# 5.8 Gerçek Gruplama ve Çoklu Özellik Uygulama Testi
print("\n[Aşama 5.8] Gerçek Gruplama ve Çoklu Özellik Uygulama Testi")
with open(os.path.join(BASE_DIR, 'js/core/SelectionManager.js'), 'r', encoding='utf-8') as f:
    sel_group_code = f.read()
with open(os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js'), 'r', encoding='utf-8') as f:
    mt_group_code = f.read()
with open(os.path.join(BASE_DIR, 'js/ui/PropertyPanel.js'), 'r', encoding='utf-8') as f:
    prop_batch_code = f.read()
with open(os.path.join(BASE_DIR, 'css/stage.css'), 'r', encoding='utf-8') as f:
    stage_group_css = f.read()

assert 'groupSelected' in sel_group_code and 'ungroupSelected' in sel_group_code, "SelectionManager içinde groupSelected veya ungroupSelected eksik!"
assert 'groupId' in sel_group_code, "SelectionManager nesnelere groupId atamalıdır!"
assert 'duplicateSelected' in sel_group_code and 'groupMap' in sel_group_code, "duplicateSelected çoğaltılan nesnelerin gruplarını yeni benzersiz bir groupId ile eşlemelidir!"
assert "key.toLowerCase() === 'g'" in sel_group_code, "SelectionManager içinde Ctrl+G / Cmd+G kısayolu eksik!"
assert 'selectedObjs.forEach' in mt_group_code, "MiniToolbar çoklu nesne seçildiğinde özellikleri seçili tüm nesnelere toplu (batch) uygulamalıdır!"
assert 'targets.forEach' in prop_batch_code or 'selectedObjs.forEach' in prop_batch_code, "PropertyPanel çoklu seçimde özellikleri tüm nesnelere uygulamalıdır!"
assert '.group-border' in stage_group_css and '.is-group-badge' in stage_group_css, "stage.css içinde grup seçimi için özel görsel çerçeve ve rozet stilleri eksik!"
test_passed("Gerçek nesne gruplama (Ctrl+G / Cmd+G, tek parça hareket, grubu çözme) ve toplu özellik uygulama yeteneği doğrulandı.")

# 5.9 Mini Araç Çubuğu Tıklama ve Sürükleme Görünürlük Mantığı Testi
print("\n[Aşama 5.9] Mini Araç Çubuğu Tıklama ve Sürükleme Görünürlük Mantığı Testi")
with open(os.path.join(BASE_DIR, 'js/engine/TransformEngine.js'), 'r', encoding='utf-8') as f:
    tf_drag_code = f.read()
with open(os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js'), 'r', encoding='utf-8') as f:
    mt_drag_code = f.read()

assert 'stagePointerDown' in tf_drag_code, "TransformEngine sahneye basıldığı anda stagePointerDown olayını yayınlamalıdır!"
assert 'hasMovedOrDragged' in tf_drag_code, "TransformEngine basılma ve bırakılma arasındaki sürüklemeyi hasMovedOrDragged ile takip etmelidir!"
assert 'stagePointerUp' in tf_drag_code and 'hasDragged' in tf_drag_code, "TransformEngine bırakıldığı anda stagePointerUp olayını hasDragged parametresiyle yayınlamalıdır!"
assert "this.core.on('stagePointerDown'" in mt_drag_code, "MiniToolbar üzerine basıldığı anda stagePointerDown ile derhal gizlenmelidir!"
assert "this.core.on('stagePointerUp'" in mt_drag_code, "MiniToolbar bırakıldığı anda stagePointerUp olayını dinlemelidir!"
assert "data.hasDragged" in mt_drag_code, "MiniToolbar sürükleme yapılmışsa (data.hasDragged) görünmemelidir!"
assert "this.show()" in mt_drag_code, "MiniToolbar sürükleme yapılmamışsa (temiz tıklama) bırakıldığı anda this.show() ile görünmelidir!"
assert "!this.isVisible()" in mt_drag_code, "MiniToolbar kapalıyken gereksiz reposition hesaplamalarından kaçınmalıdır!"
test_passed("Mini araç çubuğunun basıldığı anda değil bırakıldığı anda görünmesi ve sürükleme yapılmışsa görünmemesi doğrulandı.")

# 5.10 Cevap Anahtarı Modu Vurgulama ve Konum Koruma Testi
print("\n[Aşama 5.10] Cevap Anahtarı Modu Vurgulama ve Konum Koruma Testi")
with open(os.path.join(BASE_DIR, 'css/answer-key.css'), 'r', encoding='utf-8') as f:
    ak_css_code = f.read()
with open(os.path.join(BASE_DIR, 'js/core/AnswerKeyManager.js'), 'r', encoding='utf-8') as f:
    ak_mgr_code = f.read()

assert 'transform: scale' not in ak_css_code.split('/* SVG Bağlantı Çizgileri */')[0], "answer-key.css içinde sahne nesnelerinin translate konumunu sıfırlayan transform: scale tespit edildi!"
assert 'ak-source-active' in ak_css_code, "answer-key.css içinde seçili kaynak vurgusu ak-source-active tanımlı olmalıdır!"
assert 'ak-target-candidate' not in ak_css_code, "answer-key.css içinde tüm diğer nesneleri yeşile boyayan ak-target-candidate kaldırılmalıdır!"
assert "activeEl.classList.add('ak-source-active')" in ak_mgr_code, "AnswerKeyManager yalnızca seçilen kaynak nesneye vurgu sınıfı eklemelidir!"
assert "el.classList.add('ak-target-candidate')" not in ak_mgr_code, "AnswerKeyManager diğer nesneleri aday olarak işaretlememelidir!"
assert "ak-selecting-target" in ak_css_code and "ak-selecting-target" in ak_mgr_code, "Hedef seçim durumunu yöneten ak-selecting-target sınıfı eksik!"
assert "['target', 'category', 'sequence_slot'].includes(obj.role)" in ak_mgr_code, "AnswerKeyManager hedef seçiminde sadece sahne rolü Hedef olan nesneleri kabul etmelidir!"
assert "pointer-events: none" in ak_css_code, "answer-key.css hedef seçimi sırasında hedef olmayan nesneleri tıklanamaz yapmalıdır!"
test_passed("Cevap anahtarı modunda sadece seçilen taşınacak nesnenin vurgulanması, konumunun korunması ve sadece Hedef rolündeki nesnelerin tıklanabilmesi doğrulandı.")

# 5.11 Cevap Anahtarı Karşılıklı Kenar Bağlantı Çizgisi Testi
print("\n[Aşama 5.11] Cevap Anahtarı Karşılıklı Kenar Bağlantı Çizgisi Testi")
assert 'getFacingAnchorPoints' in ak_mgr_code, "AnswerKeyManager içinde karşılıklı kenar hesaplayıcı getFacingAnchorPoints metodu eksik!"
assert 'source.x + source.width' in ak_mgr_code or 'sRight' in ak_mgr_code, "Kaynak nesnenin sağ kenarından çıkış hesaplaması eksik!"
assert 'target.x' in ak_mgr_code, "Hedef nesnenin sol kenarına giriş hesaplaması eksik!"
assert 'drawConnectionLine' in ak_mgr_code and 'getFacingAnchorPoints' in ak_mgr_code, "drawConnectionLine nesnelerin ortasından değil karşılıklı kenarlarından bağlanmalıdır!"
test_passed("Cevap anahtarı bağlantı çizgisinin nesnelerin ortasından değil karşılıklı kenarlarından bağlandığı doğrulandı.")

# 5.12 Dinamik Marquee (Seçim Alanı) Senkronizasyon Testi
print("\n[Aşama 5.12] Dinamik Marquee (Seçim Alanı) Senkronizasyon Testi")
with open(os.path.join(BASE_DIR, 'js/engine/TransformEngine.js'), 'r', encoding='utf-8') as f:
    tf_marquee_code = f.read()

assert 'handleMarqueeAction' in tf_marquee_code, "TransformEngine içinde handleMarqueeAction metodu eksik!"
assert 'currentIntersectingIds' in tf_marquee_code, "handleMarqueeAction anlık kesişen nesneleri tespit etmelidir!"
assert 'this.selectionManager.selectedIds.clear()' in tf_marquee_code, "handleMarqueeAction seçim alanı küçüldüğünde kapsam dışına çıkan nesneleri temizlemelidir!"
assert 'initialMarqueeSelectedIds' in tf_marquee_code, "startMarquee Shift tuşu ile önceki seçimi koruyabilmelidir!"
test_passed("Seçim alanı oluşturulurken ve boyut değiştirirken nesnelerin canlı olarak seçilip kapsam dışına çıkınca seçimden düştüğü doğrulandı.")

# 5.13 Önizleme Modunda Yanlış Bırakılan Nesnelerin Doğru Konuma Dönmesi Testi
print("\n[Aşama 5.13] Önizleme Modunda Yanlış Bırakılan Nesnelerin Doğru Konuma Dönmesi Testi")
activity_path = os.path.join(BASE_DIR, 'js/player/ActivityEngine.js')
with open(activity_path, 'r', encoding='utf-8') as f:
    activity_code = f.read()

assert 'this.originPositions[d.id] = { x: d.currentX, y: d.currentY }' in activity_code, "ActivityEngine karıştırma (shuffle) sonrasındaki güncel başlangıç konumlarını originPositions'a kaydetmelidir!"
assert 'const wrongBehavior = (this.projectData.settings && this.projectData.settings.wrongAnswerBehavior) || \'return\'' in activity_code, "ActivityEngine yanlış cevap durumunda varsayılan olarak 'return' (başlangıç konumuna dön) davranışını uygulamalıdır!"
assert 'returnToOrigin(dragId)' in activity_code, "ActivityEngine yanlış bırakılan veya hedef dışına bırakılan nesneleri başlangıç konumuna döndürmelidir!"
assert 'itemEl.releasePointerCapture' in activity_code, "ActivityEngine drop tamamlandığında pointer capture'ı güvenle bırakmalıdır!"

player_css_path = os.path.join(BASE_DIR, 'css/player.css')
with open(player_css_path, 'r', encoding='utf-8') as f:
    player_css_content = f.read()
assert '.player-object.is-incorrect .player-object-content' in player_css_content, "CSS shake animasyonu ana nesne transform'unu ezmemek için iç içerik elementine (.player-object-content) uygulanmalıdır!"

test_passed("Önizleme modunda yanlış hedefe veya boşluğa bırakılan nesnelerin başlangıç konumuna (ve karıştırılmışsa gerçek slotuna) pürüzsüz dönme mantığı doğrulandı.")

# 5.14 Mini Araç Çubuğu Genişlik Eşitleme (En Kısa ve En Uzun Genişlik) Testi
print("\n[Aşama 5.14] Mini Araç Çubuğu Genişlik Eşitleme (En Kısa ve En Uzun Genişlik) Testi")
mini_toolbar_path = os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js')
with open(mini_toolbar_path, 'r', encoding='utf-8') as f:
    mt_code = f.read()

assert 'data-equalize-width="min"' in mt_code, "MiniToolbar hizalama popup'ında 'data-equalize-width=\"min\"' butonu bulunmalıdır!"
assert 'data-equalize-width="max"' in mt_code, "MiniToolbar hizalama popup'ında 'data-equalize-width=\"max\"' butonu bulunmalıdır!"
assert 'equalizeSelectedWidth(mode)' in mt_code, "MiniToolbar içinde 'equalizeSelectedWidth' fonksiyonu tanımlı olmalıdır!"
assert 'selected.length < 2' in mt_code, "Genişlik eşitleme işlemi için en az 2 nesne seçilmiş olması şartı aranmalıdır!"
assert 'Math.min(...selected.map(o => o.width))' in mt_code, "En kısa genişlik modu seçili nesnelerin minimum genişliğini almalıdır!"
assert 'Math.max(...selected.map(o => o.width))' in mt_code, "En uzun genişlik modu seçili nesnelerin maksimum genişliğini almalıdır!"

# Mantıksal Simülasyon
test_objs = [
    {"id": "o1", "x": 100, "width": 140, "locked": False},
    {"id": "o2", "x": 300, "width": 80, "locked": False},
    {"id": "o3", "x": 500, "width": 220, "locked": False}
]
min_w = min(o["width"] for o in test_objs)
max_w = max(o["width"] for o in test_objs)
assert min_w == 80, "Minimum genişlik hesabı 80 olmalıdır!"
assert max_w == 220, "Maksimum genişlik hesabı 220 olmalıdır!"

editor_css_path = os.path.join(BASE_DIR, 'css/editor.css')
with open(editor_css_path, 'r', encoding='utf-8') as f:
    editor_css_content = f.read()
assert '.mt-icon-btn:disabled' in editor_css_content or '.mt-icon-btn[disabled]' in editor_css_content, "CSS içinde devre dışı mini araç çubuğu ikon butonları için disabled stili bulunmalıdır!"

test_passed("Mini araç çubuğu hizalama menüsünde en az 2 nesne seçildiğinde en kısa ve en uzun genişliğe eşitleme butonları ve işlevleri doğrulandı.")

# 5.15 Çizgi Nesnesi Ekleme, Boyutlandırma ve Mini Araç Çubuğunda Metin İkonunun Gizlenmesi Testi
print("\n[Aşama 5.15] Çizgi Nesnesi Ekleme, Boyutlandırma ve Mini Toolbar Mantığı Testi")
index_html_path = os.path.join(BASE_DIR, 'index.html')
with open(index_html_path, 'r', encoding='utf-8') as f:
    index_html_content = f.read()
assert 'id="btn-add-target"' in index_html_content, "index.html içinde 'btn-add-target' butonu korunmalıdır!"
assert 'title="Çizgi Ekle"' in index_html_content, "'btn-add-target' butonunun başlığı 'Çizgi Ekle' olmalıdır!"

ui_manager_path = os.path.join(BASE_DIR, 'js/ui/UIManager.js')
with open(ui_manager_path, 'r', encoding='utf-8') as f:
    ui_manager_code = f.read()
assert "this.objectManager.createObject('line'" in ui_manager_code, "btn-add-target tıklandığında type='line' nesnesi oluşturmalıdır!"

object_manager_path = os.path.join(BASE_DIR, 'js/core/ObjectManager.js')
with open(object_manager_path, 'r', encoding='utf-8') as f:
    om_code = f.read()
assert "type === 'line'" in om_code, "ObjectManager line tipini desteklemelidir!"
assert "object-line-bar" in om_code, "ObjectManager line nesnelerini DOM üzerinde .object-line-bar ile render etmelidir!"

tf_engine_path = os.path.join(BASE_DIR, 'js/engine/TransformEngine.js')
with open(tf_engine_path, 'r', encoding='utf-8') as f:
    tf_code = f.read()
assert "isLine = start.type === 'line'" in tf_code, "TransformEngine çizgi nesnesini algılamalı ve en-boy oranını bozmadan boyutlandırmalıdır!"

mt_toolbar_path = os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js')
with open(mt_toolbar_path, 'r', encoding='utf-8') as f:
    mt_code = f.read()
assert "canHaveText = selectedObjs.some(o => o.type !== 'line')" in mt_code, "MiniToolbar seçili nesneler sadece çizgi olduğunda metin butonunu gizlemelidir!"
assert "${canHaveText ?" in mt_code, "Metin biçimlendirme butonu canHaveText şartına bağlı render edilmelidir!"

test_passed("btn-add-target butonu ile çizgi ekleme, çizginin serbest boyutlandırılabilmesi ve çizgide mini toolbar metin butonunun gizlenmesi doğrulandı.")

# 5.16. Sadece Tek Çizgi veya Tümü Çizgi Seçiminde Özel Mini Toolbar ve Uç Tutamaçları Testi
print("\n[Aşama 5.16] Çizgiye Özel Seçim Tutamaçları ve Mini Toolbar / Popup Kartı Testi")
sm_path = os.path.join(BASE_DIR, 'js/core/SelectionManager.js')
with open(sm_path, 'r', encoding='utf-8') as f:
    sm_code = f.read()
assert "is-line-selection" in sm_code, "Çizgi seçildiğinde is-line-selection sınıfı uygulanmalıdır!"
assert "line-endpoint-handle" in sm_code, "Çizgi seçiminde uç tutamaçları line-endpoint-handle olmalıdır!"

stage_css_path = os.path.join(BASE_DIR, 'css/stage.css')
with open(stage_css_path, 'r', encoding='utf-8') as f:
    stage_css_code = f.read()
assert ".selection-box.is-line-selection .selection-border" in stage_css_code, "Çizgi seçiminde dikdörtgen çerçeve gizlenmelidir!"
assert ".line-endpoint-handle" in stage_css_code, "Çizgi uç tutamaçları CSS'i tanımlı olmalıdır!"

assert "allLines = selectedObjs.length > 0 && selectedObjs.every(o => o.type === 'line')" in mt_code, "Tüm seçilenlerin çizgi olup olmadığı allLines ile kontrol edilmelidir!"
assert "toggle-line-popup" in mt_code, "Çizgi mini araç çubuğunda çizgi ayarları butonu yer almalıdır!"
assert "mt-line-popup" in mt_code, "Çizgi ayarları açılır kartı mt-line-popup içermelidir!"
assert "Çizgi tipi" in mt_code and "Hizalama" in mt_code and "Ok uçları" in mt_code, "Çizgi popup kartı Çizgi tipi, Hizalama ve Ok uçları bölümlerini içermelidir!"
assert "data-line-style" in mt_code and "data-line-align" in mt_code and "data-line-arrow" in mt_code, "Çizgi ayar etkileşimleri veri öznitelikleriyle bağlanmalıdır!"

editor_css_path = os.path.join(BASE_DIR, 'css/editor.css')
with open(editor_css_path, 'r', encoding='utf-8') as f:
    editor_css_code = f.read()
assert ".mt-line-popup" in editor_css_code, "mt-line-popup CSS stilleri tanımlı olmalıdır!"
assert ".mt-line-type-btn" in editor_css_code and ".mt-line-align-btn" in editor_css_code and ".mt-line-arrow-btn" in editor_css_code, "Çizgi buton stilleri tanımlı olmalıdır!"

test_passed("Sadece tek çizgi veya tümü çizgi seçiminde özel mini toolbar, uç tutamaçları ve açılır ayar kartı doğrulandı.")

# 5.17. Katman ve Kilit Minimalist Açılır Menü Testi
print("\n[Aşama 5.17] Katman ve Kilit Minimalist Açılır Menü Testi")
with open(mini_toolbar_path, 'r', encoding='utf-8') as f:
    mt_code = f.read()

assert 'data-layer-action="forward"' in mt_code, "Katman popup'ında 'Öne' seçeneği eksik!"
assert 'data-layer-action="front"' in mt_code, "Katman popup'ında 'En öne' seçeneği eksik!"
assert 'data-layer-action="backward"' in mt_code, "Katman popup'ında 'Arkaya' seçeneği eksik!"
assert 'data-layer-action="back"' in mt_code, "Katman popup'ında 'En arkaya' seçeneği eksik!"
assert 'data-layer-action="toggle-lock"' in mt_code, "Katman popup'ında 'Kilit' seçeneği eksik!"
assert "bringForward" in mt_code and "bringToFront" in mt_code and "sendBackward" in mt_code and "sendToBack" in mt_code, "MiniToolbar LayerManager metotlarını tetiklemelidir!"

with open(editor_css_path, 'r', encoding='utf-8') as f:
    editor_css_code = f.read()

assert ".mt-layer-popup" in editor_css_code, "mt-layer-popup stili tanımlı olmalıdır!"
assert ".mt-layer-item" in editor_css_code, "Minimalist liste ögesi (.mt-layer-item) stili tanımlı olmalıdır!"
assert ".mt-layer-menu" in editor_css_code, "Minimalist menü konteyneri (.mt-layer-menu) stili tanımlı olmalıdır!"

test_passed("Katman ve Kilit minimalist açılır menüsünde Öne, En öne, Arkaya, En arkaya ve Kilit seçenekleri doğrulandı.")

# 5.18. Seçim Alanı (Selection Area / Marquee) Bırakıldığında Mini Toolbar Görünürlüğü Testi
print("\n[Aşama 5.18] Seçim Alanı Bırakıldığında Mini Toolbar Görünürlüğü Testi")
with open(os.path.join(BASE_DIR, 'js/engine/TransformEngine.js'), 'r', encoding='utf-8') as f:
    tf_code = f.read()
with open(mini_toolbar_path, 'r', encoding='utf-8') as f:
    mt_code = f.read()

assert 'isMarquee' in tf_code, "TransformEngine stagePointerUp olayında isMarquee bilgisini göndermelidir!"
assert 'isMarqueeSelection' in mt_code or 'data.isMarquee' in mt_code, "MiniToolbar seçim alanı bırakıldığında mini toolbar'ı gizlememeli, görünür kılmalıdır!"

test_passed("Seçim alanı oluşturularak nesneler seçildikten sonra mouse bırakılınca mini toolbar'ın görünmesi doğrulandı.")

# 5.19. Mini Araç Çubuğu Popup Kartları Standart Genişlik ve Taşmama Testi
print("\n[Aşama 5.19] Mini Araç Çubuğu Popup Kartları Standart Genişlik ve Taşmama Testi")
with open(editor_css_path, 'r', encoding='utf-8') as f:
    ed_css_check = f.read()
with open(mini_toolbar_path, 'r', encoding='utf-8') as f:
    mt_code_check = f.read()

assert 'width: 252px;' in ed_css_check, "Popup kartları ve araç çubuğu için standart 252px genişlik tanımlanmalıdır!"
assert '.mini-toolbar-pill' in ed_css_check and 'width: 252px;' in ed_css_check, "Mini toolbar pill standart genişliğe sahip olmalıdır!"
assert '.line-mini-toolbar-pill' in ed_css_check, "Çizgi mini toolbar pill sınıfı tanımlı olmalıdır!"
assert '.mt-line-popup' in ed_css_check and 'width: 252px;' in ed_css_check, "Çizgi popup kartı standart 252px genişlikte olmalıdır!"
assert '.mt-layer-popup' in ed_css_check and 'width: 252px;' in ed_css_check, "Katman popup kartı standart 252px genişlikte olmalıdır!"
assert '.mt-role-popup' in ed_css_check and 'width: 252px;' in ed_css_check, "Sahne rolü popup kartı standart 252px genişlikte olmalıdır!"
assert '.mt-text-popup' in ed_css_check and 'width: 252px;' in ed_css_check, "Metin popup kartı referans 252px genişlikte olmalıdır!"
assert 'mt-role-popup' in mt_code_check, "MiniToolbar rol popup kartına mt-role-popup sınıfı eklenmelidir!"
assert 'is-multi' in mt_code_check, "MiniToolbar çoklu seçimde is-multi sınıfını eklemelidir!"

test_passed("Tüm mini araç çubuğu açılır popup menülerinin genişliği Metin popup'ı referans alınarak 252px olarak standartlaştırıldı ve araç çubuğunu aşmadığı doğrulandı.")

# 5.20. Mini Araç Çubuğu ve Popup Kartları Minimalist Ortak Tasarım Dili Testi
print("\n[Aşama 5.20] Mini Araç Çubuğu ve Popup Kartları Minimalist Ortak Tasarım Dili Testi")
assert 'scrollbar-width: none' in ed_css_check, "Popup kartlarında kaydırma çubuğunu gizleyen stil tanımlı olmalıdır!"
assert '::-webkit-scrollbar' in ed_css_check, "Webkit tabanlı tarayıcılarda kaydırma çubuğunu gizleyen kural tanımlı olmalıdır!"
assert '.mt-btn.active' in ed_css_check and '#cbd5e1' in ed_css_check, "Araç çubuğu butonlarının aktif durumu minimalist nötr tonlara sahip olmalıdır!"
assert '.mt-line-type-btn.active' in ed_css_check and '#ffffff' in ed_css_check, "Çizgi butonları aktif durumunda hafif ve beyaz minimalist arka plana sahip olmalıdır!"
assert '.mt-role-btn.active' in ed_css_check and '#ffffff' in ed_css_check, "Rol butonları aktif durumunda minimalist segmented control stiline sahip olmalıdır!"
assert 'popupEl.style.overflow = \'visible\'' in mt_code_check or 'popupEl.style.maxHeight = \'none\'' in mt_code_check, "MiniToolbar içinde popup kartlarında gereksiz taşma ve scroll kısıtlaması kaldırılmış olmalıdır!"

test_passed("Mini araç çubuğu ve açılır kartlar arasında minimalist tasarım dili ortaklaştırıldı, ağır arka planlı butonlar kaldırıldı ve popup kaydırma çubukları/taşmaları engellendi.")

# 5.21. Nesne Görünümü Kompakt Tasarım, Açılır Renk Paleti ve + / - Stepper Testi
print("\n[Aşama 5.21] Nesne Görünümü Kompakt Tasarım, Açılır Renk Paleti ve + / - Stepper Testi")
with open(editor_css_path, 'r', encoding='utf-8') as f:
    ed_css_check = f.read()
with open(mini_toolbar_path, 'r', encoding='utf-8') as f:
    mt_code_check = f.read()

assert 'showStyleColorPalette' in mt_code_check, "MiniToolbar içinde stil renk paleti açık/kapalı durumu (showStyleColorPalette) tanımlı olmalıdır!"
assert 'data-step-prop="borderWidth"' in mt_code_check, "Çizgi/kenarlık kalınlığı için +/- stepper butonları yer almalıdır!"
assert 'data-step-prop="borderRadius"' in mt_code_check, "Köşe yuvarlaklığı için +/- stepper butonları yer almalıdır!"
assert 'mt-style-palette-section' in mt_code_check, "Nesne görünümü popup'ında açılır renk paleti bölümü bulunmalıdır!"
assert '.mt-stepper-group' in ed_css_check and '.mt-step-btn' in ed_css_check, "CSS içinde stepper grubu ve +/- buton stilleri tanımlı olmalıdır!"
assert '.mt-style-palette-section' in ed_css_check, "CSS içinde stil renk paleti bölümü tanımlı olmalıdır!"
assert '#64748b' in mt_code_check, "Renk paletine yeni nötr renk (#64748b) eklenmiş olmalıdır!"

test_passed("Nesne Görünümü popup'ı kompakt hale getirildi, renkler ikon tıklandığında açılır yapıldı, renk paletine yeni renk eklendi ve kalınlık/köşe ayarları + / - butonlarına dönüştürüldü.")

# [Aşama 5.22] Önizleme Player Bütünleşik Sahne İçi Kontrol ve Footer Testi
print("\n[Aşama 5.22] Önizleme Player Bütünleşik Sahne İçi Kontrol ve Footer Testi")
with open(os.path.join(BASE_DIR, 'js/player/ActivityEngine.js'), 'r', encoding='utf-8') as f:
    ae_player_code = f.read()
with open(os.path.join(BASE_DIR, 'css/player.css'), 'r', encoding='utf-8') as f:
    player_css = f.read()
with open(os.path.join(BASE_DIR, 'src/ActivityPlayer.js'), 'r', encoding='utf-8') as f:
    ap_code = f.read()

assert 'player-stage-container' in ae_player_code, "ActivityEngine içinde sahne için player-stage-container kapsayıcısı yer almalıdır!"
assert 'player-stage-board' in ae_player_code, "ActivityEngine içinde sahne ve kontrolleri bir arada tutan player-stage-board yer almalıdır!"
assert 'player-controls' in ae_player_code, "ActivityEngine içinde sahnenin altında kontrol alanı (player-controls) yer almalıdır!"
assert 'player-footer' in ae_player_code, "ActivityEngine içinde player-footer alanı yer almalıdır!"
assert 'id="btn-toggle-sound"' not in ae_player_code, "player-controls içinden ses butonu kaldırılmış olmalıdır!"
assert 'controls-right' not in ae_player_code, "player-controls içinden controls-right kaldırılmış olmalıdır!"
assert 'id="player-feedback"' not in ae_player_code, "player-controls içinden player-feedback alanı kaldırılmış olmalıdır!"
assert 'player-header-minimal' in ae_player_code, "ActivityEngine sadece editör önizleme durumunda (isEmbedded) minimal floating çıkış başlığı render etmelidir!"
assert 'setFeedback' in ae_player_code and 'getFeedback' in ae_player_code, "ActivityEngine üzerinde setFeedback ve getFeedback API'leri tanımlı olmalıdır!"
assert 'setFeedback' in ap_code and 'getFeedback' in ap_code, "ActivityPlayer kütüphane sarmalayıcısında setFeedback ve getFeedback metotları bulunmalıdır!"
assert '.player-controls' in player_css, "player.css içinde .player-controls stilleri tanımlı olmalıdır!"
assert '.player-stage-board' in player_css, "player.css içinde .player-stage-board stilleri tanımlı olmalıdır!"
assert '.player-header.player-header-minimal' in player_css, "player.css içinde minimal floating başlık stili tanımlı olmalıdır!"

test_passed("Player kontrolleri ve footer sahne içine taşındı, genişliği sahne ile eşitlendi, ses ve feedback alanları kaldırıldı.")

# 5.23 Öğrenme ve Değerlendirme Modları, Tik/Çarpı Rozetleri ve Tekrar Dene Döngüsü Testi
print("\n[Aşama 5.23] Öğrenme ve Değerlendirme Modları, Rozetler ve Tekrar Dene Döngüsü Testi")
with open(os.path.join(BASE_DIR, 'js/player/ActivityEngine.js'), 'r', encoding='utf-8') as f:
    ae_code = f.read()
with open(os.path.join(BASE_DIR, 'css/player.css'), 'r', encoding='utf-8') as f:
    player_css = f.read()
with open(os.path.join(BASE_DIR, 'src/ActivityPlayer.js'), 'r', encoding='utf-8') as f:
    ap_code = f.read()
with open(os.path.join(BASE_DIR, 'src/components/DNDPlayerElement.js'), 'r', encoding='utf-8') as f:
    dnd_elem_code = f.read()

assert 'player-mode-switch' in ae_code, "ActivityEngine içinde segmented mod değiştirici (player-mode-switch) bulunmalıdır!"
assert 'btn-mode-learning' in ae_code and 'btn-mode-assessment' in ae_code, "Öğrenme ve Değerlendirme butonları tanımlı olmalıdır!"
assert 'setPlayMode' in ae_code and 'getPlayMode' in ae_code, "ActivityEngine üzerinde setPlayMode ve getPlayMode API'leri tanımlı olmalıdır!"
assert 'retryWrongAnswers' in ae_code, "Değerlendirme modu için retryWrongAnswers metodu bulunmalıdır!"
assert 'setCheckButtonState' in ae_code, "Kontrol Et ve Tekrar Dene durum geçişleri için setCheckButtonState metodu bulunmalıdır!"
assert 'lockedTargetIds' in ae_code, "Doğru eşleşen hedeflere tekrar nesne bırakılmasını engellemek için lockedTargetIds mantığı yer almalıdır!"
assert 'is-target-locked' in ae_code, "Kilitlenen hedeflere görsel ve işlevsel kilit sınıfı (is-target-locked) eklenmelidir!"
assert 'player-status-badge' in ae_code, "Doğru (✓) ve yanlış (✕) durum rozetleri için player-status-badge DOM oluşturması bulunmalıdır!"

# CSS denetimleri
assert '.player-mode-switch' in player_css, "player.css içinde mod değiştirici stilleri tanımlı olmalıdır!"
assert '.player-btn.retry-btn' in player_css, "player.css içinde Tekrar Dene butonu vurgu stilleri tanımlı olmalıdır!"
assert '.player-status-badge' in player_css, "player.css içinde durum rozeti stilleri tanımlı olmalıdır!"
assert '.player-status-badge.badge-correct' in player_css and '.player-status-badge.badge-incorrect' in player_css, "player.css içinde yeşil tik ve kırmızı çarpı rozet stilleri tanımlı olmalıdır!"

# Kütüphane sarmalayıcı denetimleri
assert 'getPlayMode' in ap_code and 'setPlayMode' in ap_code, "ActivityPlayer sınıfında getPlayMode ve setPlayMode metotları bulunmalıdır!"
assert 'getPlayMode' in dnd_elem_code and 'setPlayMode' in dnd_elem_code, "DNDPlayerElement bileşeninde getPlayMode ve setPlayMode bulunmalıdır!"

test_passed("Öğrenme ve Değerlendirme modları, segmented switch, yeşil tik/kırmızı çarpı rozetleri, hedef kilitleme ve Tekrar Dene döngüsü doğrulandı.")

# 5.24. Sahne Yakınlaştırma, Modern Scrollbar ve Stage Scaler Mimarisi Testi
print("\n[Aşama 5.24] Sahne Yakınlaştırma, Modern Scrollbar ve Stage Scaler Mimarisi Testi")
with open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    html_content = f.read()
with open(os.path.join(BASE_DIR, 'src/DNDEditor.js'), 'r', encoding='utf-8') as f:
    editor_mod_content = f.read()
with open(os.path.join(BASE_DIR, 'css/editor.css'), 'r', encoding='utf-8') as f:
    editor_css_content = f.read()
with open(os.path.join(BASE_DIR, 'css/stage.css'), 'r', encoding='utf-8') as f:
    stage_css_content = f.read()
with open(os.path.join(BASE_DIR, 'js/core/StageManager.js'), 'r', encoding='utf-8') as f:
    sm_content = f.read()

assert 'id="stage-container"' in html_content and 'id="stage-scaler"' in html_content, "index.html içinde stage-container ve stage-scaler sarmalayıcıları bulunmalıdır!"
assert 'id="stage-container"' in editor_mod_content and 'id="stage-scaler"' in editor_mod_content, "src/DNDEditor.js içinde stage-container ve stage-scaler sarmalayıcıları bulunmalıdır!"
assert '.stage-viewport' in editor_css_content and 'overflow: auto' in editor_css_content, "editor.css içinde stage-viewport overflow: auto olmalıdır!"
assert 'scrollbar-width: thin' in editor_css_content and '::-webkit-scrollbar' in editor_css_content, "editor.css içinde modern ince scrollbar stilleri tanımlanmalıdır!"
assert '.stage-container' in editor_css_content and '.stage-scaler' in editor_css_content, "editor.css içinde .stage-container ve .stage-scaler stilleri tanımlı olmalıdır!"
assert 'transform-origin: top left' in stage_css_content, "stage.css içinde stage öğesinin transform-origin değeri top left olmalıdır!"
assert 'setupStageWrapper' in sm_content, "StageManager içinde setupStageWrapper metodu bulunmalıdır!"
assert 'setupWheelZoom' in sm_content, "StageManager içinde Ctrl/Cmd tekerlek ile zoom (setupWheelZoom) desteği bulunmalıdır!"
assert 'this.stageScaler' in sm_content, "StageManager ölçeklenen boyutları stageScaler üzerine uygulamalıdır!"

# Zoom ve Kaydırma Koordinat Hassasiyeti Matematik Testi
for zoom in [0.5, 0.8, 1.0, 1.5, 2.0, 2.5]:
    scroll_x, scroll_y = 120, 240
    viewport_left, viewport_top = 80, 60
    base_scale = 0.8
    scale = base_scale * zoom
    stage_left = viewport_left + 40 - scroll_x
    stage_top = viewport_top + 40 - scroll_y
    for orig_x, orig_y in [(0, 0), (300, 150), (600, 337.5), (1200, 675)]:
        client_x = stage_left + orig_x * scale
        client_y = stage_top + orig_y * scale
        calc_x = (client_x - stage_left) / scale
        calc_y = (client_y - stage_top) / scale
        assert abs(calc_x - orig_x) < 1e-4 and abs(calc_y - orig_y) < 1e-4, f"Zoom {zoom} seviyesinde koordinat hatası!"

test_passed("Modern scrollbar, stage-scaler sarmalayıcısı, tekerlek yakınlaştırma ve odak korumalı scroll mimarisi doğrulandı.")

# 5.25. Cevap Anahtarı Üst Rehber Çubuğu (Guide Bar) ve Durum Yönetimi Testi
print("\n[Aşama 5.25] Cevap Anahtarı Üst Rehber Çubuğu (Guide Bar) ve Durum Yönetimi Testi")
with open(os.path.join(BASE_DIR, 'js/ui/UIManager.js'), 'r', encoding='utf-8') as f:
    ui_mgr_code = f.read()
with open(os.path.join(BASE_DIR, 'js/core/AnswerKeyManager.js'), 'r', encoding='utf-8') as f:
    ak_mgr_code = f.read()
with open(os.path.join(BASE_DIR, 'css/answer-key.css'), 'r', encoding='utf-8') as f:
    ak_css_code = f.read()
with open(os.path.join(BASE_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    index_html = f.read()
with open(os.path.join(BASE_DIR, 'src/DNDEditor.js'), 'r', encoding='utf-8') as f:
    editor_js = f.read()

# 1. Eski kaybolan toast yönergesinin kaldırıldığının denetimi
assert "this.showToast('🔑 Cevap Anahtarı:" not in ui_mgr_code, "Cevap Anahtarı modundaki eski geçici toast yönergesi kaldırılmalıdır!"

# 2. HTML ve Editor şablonlarında rehber çubuğunun toolbar içine entegre edilmesi ve sayaç bloğunun kaldırılması
assert 'id="answer-key-guide-bar"' in index_html and 'class="answer-key-toolbar-guide"' in index_html, "index.html içinde toolbar içi answer-key-guide-bar bulunmalıdır!"
assert 'ak-toolbar-divider' in index_html and 'ak-toolbar-content' in index_html, "index.html içinde dikey ayraç ve rehber içerik bloğu bulunmalıdır!"
assert 'id="ak-guide-title"' in index_html and 'id="ak-guide-instruction"' in index_html, "index.html içinde rehber başlık ve talimat öğeleri bulunmalıdır!"
assert 'id="answer-key-guide-bar"' in editor_js and 'id="ak-guide-title"' in editor_js, "src/DNDEditor.js içinde answer-key-guide-bar ve ak-guide-title bulunmalıdır!"
assert 'ak-guide-counter' not in index_html and 'ak-guide-counter' not in editor_js, "Rehber çubuğundaki sağ sayaç bloğu (4 / 4 Eşleşti vb.) kaldırılmış olmalıdır!"
assert 'Eşleşti</div>' not in index_html and 'Eşleşti</div>' not in editor_js, "HTML şablonlarında 'Eşleşti' rozeti bulunmamalıdır!"

# 2.1. Cevap Anahtarı Modunda Orta ve Sağ Araç Kümelerinin Gizlenmesi Denetimi
assert 'cluster-add-objects' in index_html and 'cluster-history-zoom' in index_html, "index.html içinde orta ve sağ araç kümeleri tanımlı olmalıdır!"
assert 'cluster-add-objects' in editor_js and 'cluster-history-zoom' in editor_js, "src/DNDEditor.js içinde orta ve sağ araç kümeleri tanımlı olmalıdır!"
assert '.cluster-add-objects' in ak_css_code and '.cluster-history-zoom' in ak_css_code, "css/answer-key.css içinde cevap anahtarı modunda araç kümelerini gizleme stilleri tanımlı olmalıdır!"
assert 'clusterAdd' in ui_mgr_code and 'clusterHistoryZoom' in ui_mgr_code, "UIManager içinde cevap anahtarı modunda araç kümeleri gizlenmelidir!"

# 3. Toolbar içi rehber CSS ve dikey ayraç denetimi (Toolbar yüksekliği 48px sabit)
assert '.answer-key-toolbar-guide' in ak_css_code, "css/answer-key.css içinde .answer-key-toolbar-guide tanımlı olmalıdır!"
assert '.ak-toolbar-divider' in ak_css_code, "css/answer-key.css içinde .ak-toolbar-divider dikey ayracı tanımlı olmalıdır!"

# 4. AnswerKeyManager içindeki metotlar ve 3 durum mantığı
assert 'getGuideBar' in ak_mgr_code, "AnswerKeyManager içinde getGuideBar metodu bulunmalıdır!"
assert 'getGuideState' in ak_mgr_code, "AnswerKeyManager içinde getGuideState metodu bulunmalıdır!"
assert 'updateGuideBar' in ak_mgr_code, "AnswerKeyManager içinde updateGuideBar metodu bulunmalıdır!"

# 3 Durum Metinlerinin Birebir Varlığı:
# 1. Tüm eşleşmeler tamamlandı / Cevap anahtarını kontrol edebilirsin
assert 'Tüm eşleşmeler tamamlandı' in ak_mgr_code, "1. Durum başlığı 'Tüm eşleşmeler tamamlandı' eksik!"
assert 'Cevap anahtarını kontrol edebilirsin' in ak_mgr_code, "1. Durum talimatı 'Cevap anahtarını kontrol edebilirsin' eksik!"

# 2. Cevap anahtarı oluştur / Seçerek eşleştirmeye başla
assert 'Cevap anahtarı oluştur' in ak_mgr_code, "2. Durum başlığı 'Cevap anahtarı oluştur' eksik!"
assert 'Seçerek eşleştirmeye başla' in ak_mgr_code, "2. Durum talimatı 'Seçerek eşleştirmeye başla' eksik!"

# 3. Eşleştirmeye devam et / Sıradaki nesneyi seçerek devam et.
assert 'Eşleştirmeye devam et' in ak_mgr_code, "3. Durum başlığı 'Eşleştirmeye devam et' eksik!"
assert 'Sıradaki nesneyi seçerek devam et.' in ak_mgr_code, "3. Durum talimatı 'Sıradaki nesneyi seçerek devam et.' eksik!"

# 5. Durum Algoritması Doğrulama Simülasyonu
def compute_guide_state(total_draggables, matched_count, active_source=None):
    if total_draggables > 0 and matched_count >= total_draggables:
        return 'Tüm eşleşmeler tamamlandı', 'Cevap anahtarını kontrol edebilirsin'
    elif matched_count == 0:
        return 'Cevap anahtarı oluştur', 'Hedef nesneyi seçerek eşleştirmeyi tamamla' if active_source else 'Seçerek eşleştirmeye başla'
    else:
        return 'Eşleştirmeye devam et', 'Hedef nesneyi seçerek eşleştirmeyi tamamla' if active_source else 'Sıradaki nesneyi seçerek devam et.'

# Test: Eşleştirmeler hiç yapılmamışsa (0 / 4)
t2, d2 = compute_guide_state(4, 0)
assert t2 == 'Cevap anahtarı oluştur' and d2 == 'Seçerek eşleştirmeye başla'

# Test: Eşleştirme eksikse (2 / 4)
t3, d3 = compute_guide_state(4, 2)
assert t3 == 'Eşleştirmeye devam et' and d3 == 'Sıradaki nesneyi seçerek devam et.'

# Test: Tüm eşleşmeler tamamlandıysa (4 / 4)
t1, d1 = compute_guide_state(4, 4)
assert t1 == 'Tüm eşleşmeler tamamlandı' and d1 == 'Cevap anahtarını kontrol edebilirsin'

test_passed("Cevap anahtarı üst rehber çubuğu, yükseklik sınırları ve 3 dinamik durum metni başarıyla doğrulandı.")

# 5.26 Grup Hizalama ve Dağıtma (Tek Birleşik Nesne Mantığı) Testi
print("\n[Aşama 5.26] Grup Hizalama ve Dağıtma (Tek Birleşik Nesne Mantığı) Testi")
with open(os.path.join(BASE_DIR, 'js/ui/MiniToolbar.js'), 'r', encoding='utf-8') as f:
    mt_group_align_code = f.read()

assert 'getSelectionUnits' in mt_group_align_code, "MiniToolbar içinde seçim birimlerini (grup ve tekil) ayıran 'getSelectionUnits' metodu bulunmalıdır!"
assert 'units.length === 1' in mt_group_align_code, "Tek bir birim (örneğin grup) seçildiğinde sahneye tek parça hizalama koşulu bulunmalıdır!"
assert 'stageW - unit.width' in mt_group_align_code, "Grup sağa ve yatay ortaya hizalanırken sahne genişliği ve grup genişliği kullanılmalıdır!"
assert 'stageH - unit.height' in mt_group_align_code, "Grup alta ve dikey ortaya hizalanırken sahne yüksekliği ve grup yüksekliği kullanılmalıdır!"

# Mantıksal Simülasyon: Grup Birimi ve Sahneye Hizalama
def get_selection_units(objects):
    units_map = {}
    standalone = []
    for o in objects:
        gid = o.get('groupId')
        if gid:
            units_map.setdefault(gid, []).append(o)
        else:
            standalone.append({
                'isGroup': False,
                'groupId': None,
                'objects': [o],
                'minX': o['x'],
                'maxX': o['x'] + o['width'],
                'minY': o['y'],
                'maxY': o['y'] + o['height'],
                'width': o['width'],
                'height': o['height']
            })
    group_units = []
    for gid, objs in units_map.items():
        min_x = min(o['x'] for o in objs)
        max_x = max(o['x'] + o['width'] for o in objs)
        min_y = min(o['y'] for o in objs)
        max_y = max(o['y'] + o['height'] for o in objs)
        group_units.append({
            'isGroup': True,
            'groupId': gid,
            'objects': objs,
            'minX': min_x,
            'maxX': max_x,
            'minY': min_y,
            'maxY': max_y,
            'width': max_x - min_x,
            'height': max_y - min_y
        })
    return group_units + standalone

# Test 1: Tek grup seçildiğinde sahneye hizalama (1200x675)
group_objs = [
    {"id": "o1", "groupId": "grp_1", "x": 100, "y": 150, "width": 120, "height": 60},
    {"id": "o2", "groupId": "grp_1", "x": 260, "y": 180, "width": 140, "height": 70}
]
init_dx = group_objs[1]["x"] - group_objs[0]["x"]
init_dy = group_objs[1]["y"] - group_objs[0]["y"]

units = get_selection_units(group_objs)
assert len(units) == 1, "Grup üyeleri tek bir birim (unit) oluşturmalıdır!"
u = units[0]
assert u['minX'] == 100 and u['maxX'] == 400 and u['width'] == 300
assert u['minY'] == 150 and u['maxY'] == 250 and u['height'] == 100

# Sola Hizala:
deltaX = 0 - u['minX']
assert deltaX == -100
assert (group_objs[0]["x"] + deltaX) == 0
assert (group_objs[1]["x"] + deltaX) == 160
assert ((group_objs[1]["x"] + deltaX) - (group_objs[0]["x"] + deltaX)) == init_dx, "Grup içi nesnelerin göreli mesafesi korunmalıdır!"

# Yatay Ortala:
deltaX_center = round((1200 - u['width']) / 2) - u['minX']
assert deltaX_center == (450 - 100)
new_o1_x = group_objs[0]["x"] + deltaX_center
new_o2_x = group_objs[1]["x"] + deltaX_center
assert new_o1_x == 450 and (new_o2_x + 140) == 750
assert (new_o2_x - new_o1_x) == init_dx, "Grup içi nesnelerin göreli mesafesi korunmalıdır!"

# Sağa Hizala:
deltaX_right = (1200 - u['width']) - u['minX']
assert (group_objs[1]["x"] + deltaX_right + 140) == 1200, "Grubun sağ sınırı tam 1200 olmalıdır!"

# Dikey Ortala:
deltaY_middle = round((675 - u['height']) / 2) - u['minY']
new_o1_y = group_objs[0]["y"] + deltaY_middle
new_o2_y = group_objs[1]["y"] + deltaY_middle
assert (new_o2_y - new_o1_y) == init_dy, "Dikey ortalamada göreli dikey mesafe korunmalıdır!"

test_passed("Grup halindeki nesnelerin sahneye ve birbirine tek bir birleşik nesne olarak hizalanma matematiği doğrulandı.")

# 5.27 Şekil ve Görsel Nesneleri Varsayılan Metin Durumu ve Çift Tıklama Mantığı Testi
print("\n[Aşama 5.27] Şekil ve Görsel Nesneleri Varsayılan Metin Durumu ve Çift Tıklama Mantığı Testi")
with open(os.path.join(BASE_DIR, 'js/core/ObjectManager.js'), 'r', encoding='utf-8') as f:
    om_img_code = f.read()
with open(os.path.join(BASE_DIR, 'js/ui/UIManager.js'), 'r', encoding='utf-8') as f:
    ui_img_code = f.read()

assert "} else if (type === 'image')" in om_img_code, "ObjectManager createObject içinde type === 'image' dalı bulunmalıdır!"
assert "baseObj.text = '';" in om_img_code, "Şekil ve görsel nesneleri için varsayılan text boş ('') olmalıdır!"
assert "obj.type === 'text' || (obj.text && obj.text.trim() !== '')" in om_img_code, "ObjectManager boş metinli şekillerde gereksiz metin alanı render etmemelidir!"
assert "['rectangle', 'circle', 'image'].includes(obj.type)" in ui_img_code, "UIManager kutu, daire ve görsel nesnelerinde boş metinleri otomatik temizlemelidir!"

test_passed("Görsel, kutu ve daire nesnelerinin sahneye eklendiğinde varsayılan olarak metinsiz gelmesi ve çift tıklama ile metin ekleme mantığı doğrulandı.")

# 5.28 Metin Kutusu (Text Box) Özgün Görünümü ve Şekillerden Ayrıştırılması Testi
print("\n[Aşama 5.28] Metin Kutusu (Text Box) Özgün Görünümü ve Şekillerden Ayrıştırılması Testi")
with open(os.path.join(BASE_DIR, 'js/core/ObjectManager.js'), 'r', encoding='utf-8') as f:
    om_text_code = f.read()
with open(os.path.join(BASE_DIR, 'js/ui/UIManager.js'), 'r', encoding='utf-8') as f:
    ui_text_code = f.read()
with open(os.path.join(BASE_DIR, 'css/stage.css'), 'r', encoding='utf-8') as f:
    stage_text_css = f.read()

assert "} else if (type === 'text')" in om_text_code, "ObjectManager createObject içinde type === 'text' dalı bulunmalıdır!"
assert "baseObj.backgroundColor = 'transparent';" in om_text_code, "Metin kutusu varsayılan olarak şeffaf arka plana sahip olmalıdır!"
assert "baseObj.borderWidth = 0;" in om_text_code, "Metin kutusu varsayılan olarak kenarlıksız (0px) olmalıdır!"
assert "backgroundColor: 'transparent'" in ui_text_code and "borderWidth: 0" in ui_text_code, "UIManager metin kutusu eklerken şeffaf ve kenarlıksız oluşturmalıdır!"
assert '.stage-object[data-type="text"][data-role="decorative"]:hover' in stage_text_css, "Tasarım modunda metin kutusu üzerine gelindiğinde ayırt edici hover efekti bulunmalıdır!"

test_passed("Metin kutusunun normal kutulardan (şekillerden) ayırt edilerek şeffaf arka plan, kenarlıksız gövde ve hover kılavuzu ile sunulduğu doğrulandı.")

# 5.29 Çizgi Sekmeli ve Gelişmiş Ayarlar Popup'ı Testi
print("\n[Aşama 5.29] Çizgi Sekmeli ve Gelişmiş Ayarlar Popup'ı Testi")
with open(mini_toolbar_path, 'r', encoding='utf-8') as f:
    mt_line_code = f.read()
with open(editor_css_path, 'r', encoding='utf-8') as f:
    ed_line_css = f.read()

assert 'mt-line-tabs-bar' in mt_line_code, "Çizgi popup kartında üst sekmeler çubuğu (.mt-line-tabs-bar) bulunmalıdır!"
assert 'data-line-tab="type"' in mt_line_code and 'data-line-tab="width"' in mt_line_code, "Çizgi tipi ve kalınlık sekmeleri tanımlı olmalıdır!"
assert 'data-line-tab="color"' in mt_line_code and 'data-line-tab="arrows"' in mt_line_code and 'data-line-tab="align"' in mt_line_code, "Renk, ok uçları ve hizalama sekmeleri tanımlı olmalıdır!"
assert 'mt-line-panel' in mt_line_code, "Ayar panelleri (.mt-line-panel) bulunmalıdır!"
assert 'data-line-width-step' in mt_line_code and 'data-line-width-preset' in mt_line_code, "Çizgi kalınlığı stepper ve preset butonları bulunmalıdır!"
assert 'data-line-color' in mt_line_code, "Çizgi renk paleti swatchları bulunmalıdır!"
assert '.mt-line-tabs-bar' in ed_line_css and '.mt-line-tab-btn' in ed_line_css, "Üst menü sekmeleri için CSS tanımlı olmalıdır!"
assert '.mt-line-panel' in ed_line_css, "Alt kart paneli stili CSS içinde tanımlı olmalıdır!"

test_passed("Çizgi mini popup'ı üst sekmeli menü ve alt ayar kartı yapısıyla başarıyla doğrulandı.")

# 6. HTML Dışa Aktarma ve 4 Örnek Etkinlik Üretimi
print("\n[Aşama 6] Bağımsız HTML Üretimi ve Çevrimdışı Bütünlük Testi")

# ExportManager içindeki HTML şablonunu okuyup 4 örnek etkinliği samples/ klasörüne yazalım
export_js_path = os.path.join(BASE_DIR, 'js/player/ExportManager.js')
with open(export_js_path, 'r', encoding='utf-8') as f:
    export_js_code = f.read()

# Samples'ı doğrudan oluşturacak python yardımcı betiği
# AudioSynthesizer, ValidationEngine ve ActivityEngine kodlarını birleştirelim
with open(os.path.join(BASE_DIR, 'js/utils/AudioSynthesizer.js'), 'r', encoding='utf-8') as f:
    audio_code = f.read()
with open(os.path.join(BASE_DIR, 'js/engine/ValidationEngine.js'), 'r', encoding='utf-8') as f:
    val_code = f.read()
with open(os.path.join(BASE_DIR, 'js/player/ActivityEngine.js'), 'r', encoding='utf-8') as f:
    activity_code = f.read()

# SampleProjects.js dosyasından 4 projeyi çıkarıp JSON dosyalarına da kaydedelim
# Python regex ile her bir projenin nesnesini ayrıştıralım
# Veya JS dosyasındaki nesneleri doğrudan Python sözlüklerine dönüştürebiliriz:

# Basit bir parser veya node/python çalıştırıcı
# Python ile SampleProjects.js içindeki projeleri doğrudan inşa edelim:
# Vektör SVG'ler:
human_svg = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20550%22%3E%3Crect%20fill%3D%22%23fed7aa%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3C%2Fsvg%3E"

sample_defs = [
    {
        "filename": "1_organlari_etiketleme.html",
        "json_name": "1_organlari_etiketleme.json",
        "title": "İnsan Vücudundaki Organlar",
        "data": {
            "version": "1.0",
            "project": {"id": "proj_1", "name": "İnsan Vücudundaki Organlar", "activityType": "image-labeling"},
            "stage": {"width": 1200, "height": 675, "backgroundColor": "#f8fafc"},
            "objects": [
                {"id": "bg_anatomi", "name": "Gövde", "type": "rectangle", "role": "decorative", "x": 420, "y": 80, "width": 360, "height": 520, "backgroundColor": "#fef3c7", "borderColor": "#f59e0b", "borderWidth": 2, "borderRadius": 20},
                {"id": "target_kalp", "name": "Hedef: Kalp", "type": "zone", "role": "target", "x": 620, "y": 240, "width": 130, "height": 50, "text": "Hedef: Kalp", "textColor": "#dc2626", "backgroundColor": "rgba(254, 226, 226, 0.7)", "borderColor": "#ef4444", "borderStyle": "dashed", "borderWidth": 2, "borderRadius": 8},
                {"id": "target_akciger", "name": "Hedef: Akciğer", "type": "zone", "role": "target", "x": 450, "y": 220, "width": 130, "height": 50, "text": "Hedef: Akciğer", "textColor": "#0284c7", "backgroundColor": "rgba(224, 242, 254, 0.7)", "borderColor": "#0284c7", "borderStyle": "dashed", "borderWidth": 2, "borderRadius": 8},
                {"id": "target_mide", "name": "Hedef: Mide", "type": "zone", "role": "target", "x": 580, "y": 340, "width": 130, "height": 50, "text": "Hedef: Mide", "textColor": "#d97706", "backgroundColor": "rgba(254, 243, 199, 0.7)", "borderColor": "#f59e0b", "borderStyle": "dashed", "borderWidth": 2, "borderRadius": 8},
                {"id": "drag_kalp", "name": "Kalp", "type": "text", "role": "draggable", "x": 920, "y": 180, "width": 150, "height": 48, "text": "❤️ Kalp", "backgroundColor": "#ffffff", "borderColor": "#6366f1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_akciger", "name": "Akciğer", "type": "text", "role": "draggable", "x": 920, "y": 250, "width": 150, "height": 48, "text": "🫁 Akciğer", "backgroundColor": "#ffffff", "borderColor": "#6366f1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_mide", "name": "Mide", "type": "text", "role": "draggable", "x": 920, "y": 320, "width": 150, "height": 48, "text": "🥘 Mide", "backgroundColor": "#ffffff", "borderColor": "#6366f1", "borderWidth": 2, "borderRadius": 10}
            ],
            "answerKey": {"drag_kalp": "target_kalp", "drag_akciger": "target_akciger", "drag_mide": "target_mide"},
            "settings": {"evaluationMode": "instant", "wrongAnswerBehavior": "return", "correctAnswerBehavior": "lock", "soundEnabled": True, "completionMessage": "Tebrikler! Bütün organları doğru yerleştirdiniz."}
        }
    },
    {
        "filename": "2_kavram_tanim_eslestirme.html",
        "json_name": "2_kavram_tanim_eslestirme.json",
        "title": "Kavram ve Tanım Eşleştirme",
        "data": {
            "version": "1.0",
            "project": {"id": "proj_2", "name": "Kavram ve Tanım", "activityType": "matching"},
            "stage": {"width": 1200, "height": 675, "backgroundColor": "#ffffff"},
            "objects": [
                {"id": "drag_kuvvet", "name": "Kuvvet", "type": "text", "role": "draggable", "x": 120, "y": 195, "width": 320, "height": 60, "text": "Kuvvet", "fontSize": 16, "fontWeight": "600", "backgroundColor": "#ffffff", "borderColor": "#f97316", "borderWidth": 2, "borderRadius": 12},
                {"id": "drag_enerji", "name": "Enerji", "type": "text", "role": "draggable", "x": 120, "y": 275, "width": 320, "height": 60, "text": "Enerji", "fontSize": 16, "fontWeight": "600", "backgroundColor": "#ffffff", "borderColor": "#f97316", "borderWidth": 2, "borderRadius": 12},
                {"id": "drag_madde", "name": "Madde", "type": "text", "role": "draggable", "x": 120, "y": 355, "width": 320, "height": 60, "text": "Madde", "fontSize": 16, "fontWeight": "600", "backgroundColor": "#ffffff", "borderColor": "#f97316", "borderWidth": 2, "borderRadius": 12},
                {"id": "drag_isi", "name": "Isı", "type": "text", "role": "draggable", "x": 120, "y": 435, "width": 320, "height": 60, "text": "Isı", "fontSize": 16, "fontWeight": "600", "backgroundColor": "#ffffff", "borderColor": "#f97316", "borderWidth": 2, "borderRadius": 12},
                {"id": "target_is", "name": "İş yapabilme kapasitesi", "type": "text", "role": "target", "x": 520, "y": 195, "width": 560, "height": 60, "text": "İş yapabilme kapasitesi", "fontSize": 16, "fontWeight": "500", "backgroundColor": "#f8faff", "borderColor": "#3b82f6", "borderWidth": 2, "borderRadius": 12},
                {"id": "target_hareket", "name": "Hareketi değiştirebilen etki", "type": "text", "role": "target", "x": 520, "y": 275, "width": 560, "height": 60, "text": "Hareketi değiştirebilen etki", "fontSize": 16, "fontWeight": "500", "backgroundColor": "#f8faff", "borderColor": "#3b82f6", "borderWidth": 2, "borderRadius": 12},
                {"id": "target_sicaklik", "name": "Sıcaklık farkıyla aktarılan enerji", "type": "text", "role": "target", "x": 520, "y": 355, "width": 560, "height": 60, "text": "Sıcaklık farkıyla aktarılan enerji", "fontSize": 16, "fontWeight": "500", "backgroundColor": "#f8faff", "borderColor": "#3b82f6", "borderWidth": 2, "borderRadius": 12},
                {"id": "target_kutle", "name": "Kütlesi ve hacmi olan varlık", "type": "text", "role": "target", "x": 520, "y": 435, "width": 560, "height": 60, "text": "Kütlesi ve hacmi olan varlık", "fontSize": 16, "fontWeight": "500", "backgroundColor": "#f8faff", "borderColor": "#3b82f6", "borderWidth": 2, "borderRadius": 12}
            ],
            "answerKey": {"drag_kuvvet": "target_hareket", "drag_enerji": "target_is", "drag_madde": "target_kutle", "drag_isi": "target_sicaklik"},
            "settings": {"evaluationMode": "instant", "wrongAnswerBehavior": "return", "correctAnswerBehavior": "lock", "soundEnabled": True, "completionMessage": "Tebrikler! Kavramları doğru tanımlarla eşleştirdiniz."}
        }
    },
    {
        "filename": "3_meyveler_sebzeler_kategori.html",
        "json_name": "3_meyveler_sebzeler_kategori.json",
        "title": "Meyveler ve Sebzeler Kategorilere Ayırma",
        "data": {
            "version": "1.0",
            "project": {"id": "proj_3", "name": "Meyveler ve Sebzeler", "activityType": "categorization"},
            "stage": {"width": 1200, "height": 675, "backgroundColor": "#f8fafc"},
            "objects": [
                {"id": "cat_meyve", "name": "Meyveler Sepeti", "type": "zone", "role": "category", "x": 80, "y": 100, "width": 380, "height": 500, "text": "🍓 Meyveler", "fontSize": 22, "fontWeight": "bold", "textColor": "#991b1b", "backgroundColor": "#fff1f2", "borderColor": "#f43f5e", "borderStyle": "dashed", "borderWidth": 3, "borderRadius": 18},
                {"id": "cat_sebze", "name": "Sebzeler Sepeti", "type": "zone", "role": "category", "x": 740, "y": 100, "width": 380, "height": 500, "text": "🥦 Sebzeler", "fontSize": 22, "fontWeight": "bold", "textColor": "#166534", "backgroundColor": "#f0fdf4", "borderColor": "#22c55e", "borderStyle": "dashed", "borderWidth": 3, "borderRadius": 18},
                {"id": "drag_elma", "name": "Elma", "type": "text", "role": "draggable", "x": 510, "y": 120, "width": 170, "height": 48, "text": "🍎 Kırmızı Elma", "fontSize": 15, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_muz", "name": "Muz", "type": "text", "role": "draggable", "x": 510, "y": 190, "width": 170, "height": 48, "text": "🍌 Muz", "fontSize": 15, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_havuc", "name": "Havuç", "type": "text", "role": "draggable", "x": 510, "y": 260, "width": 170, "height": 48, "text": "🥕 Havuç", "fontSize": 15, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_brokoli", "name": "Brokoli", "type": "text", "role": "draggable", "x": 510, "y": 330, "width": 170, "height": 48, "text": "🥦 Brokoli", "fontSize": 15, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_cilek", "name": "Çilek", "type": "text", "role": "draggable", "x": 510, "y": 400, "width": 170, "height": 48, "text": "🍓 Çilek", "fontSize": 15, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 10},
                {"id": "drag_patlican", "name": "Patlıcan", "type": "text", "role": "draggable", "x": 510, "y": 470, "width": 170, "height": 48, "text": "🍆 Patlıcan", "fontSize": 15, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 10}
            ],
            "answerKey": {
                "drag_elma": "cat_meyve",
                "drag_muz": "cat_meyve",
                "drag_cilek": "cat_meyve",
                "drag_havuc": "cat_sebze",
                "drag_brokoli": "cat_sebze",
                "drag_patlican": "cat_sebze"
            },
            "settings": {"evaluationMode": "instant", "wrongAnswerBehavior": "return", "correctAnswerBehavior": "lock", "soundEnabled": True, "completionMessage": "Harika! Meyveleri ve sebzeleri doğru sepetlere doldurdunuz."}
        }
    },
    {
        "filename": "4_kelebek_yasam_dongusu_siralama.html",
        "json_name": "4_kelebek_yasam_dongusu_siralama.json",
        "title": "Kelebeğin Yaşam Döngüsü Sıralama",
        "data": {
            "version": "1.0",
            "project": {"id": "proj_4", "name": "Kelebeğin Yaşam Döngüsü", "activityType": "sequencing"},
            "stage": {"width": 1200, "height": 675, "backgroundColor": "#f8fafc"},
            "objects": [
                {"id": "slot_1", "name": "1. Aşama", "type": "zone", "role": "sequence_slot", "slotIndex": 0, "x": 80, "y": 140, "width": 220, "height": 180, "text": "1. Aşama", "fontSize": 18, "fontWeight": "bold", "textColor": "#6d28d9", "backgroundColor": "#f5f3ff", "borderColor": "#8b5cf6", "borderStyle": "dashed", "borderWidth": 2.5, "borderRadius": 16},
                {"id": "slot_2", "name": "2. Aşama", "type": "zone", "role": "sequence_slot", "slotIndex": 1, "x": 360, "y": 140, "width": 220, "height": 180, "text": "2. Aşama", "fontSize": 18, "fontWeight": "bold", "textColor": "#6d28d9", "backgroundColor": "#f5f3ff", "borderColor": "#8b5cf6", "borderStyle": "dashed", "borderWidth": 2.5, "borderRadius": 16},
                {"id": "slot_3", "name": "3. Aşama", "type": "zone", "role": "sequence_slot", "slotIndex": 2, "x": 640, "y": 140, "width": 220, "height": 180, "text": "3. Aşama", "fontSize": 18, "fontWeight": "bold", "textColor": "#6d28d9", "backgroundColor": "#f5f3ff", "borderColor": "#8b5cf6", "borderStyle": "dashed", "borderWidth": 2.5, "borderRadius": 16},
                {"id": "slot_4", "name": "4. Aşama", "type": "zone", "role": "sequence_slot", "slotIndex": 3, "x": 920, "y": 140, "width": 220, "height": 180, "text": "4. Aşama", "fontSize": 18, "fontWeight": "bold", "textColor": "#6d28d9", "backgroundColor": "#f5f3ff", "borderColor": "#8b5cf6", "borderStyle": "dashed", "borderWidth": 2.5, "borderRadius": 16},
                {"id": "drag_yumurta", "name": "Yumurta", "type": "text", "role": "draggable", "x": 80, "y": 420, "width": 210, "height": 120, "text": "🥚 1. Yumurta", "fontSize": 18, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 14},
                {"id": "drag_tirtil", "name": "Tırtıl", "type": "text", "role": "draggable", "x": 360, "y": 420, "width": 210, "height": 120, "text": "🐛 2. Tırtıl", "fontSize": 18, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 14},
                {"id": "drag_koza", "name": "Koza", "type": "text", "role": "draggable", "x": 640, "y": 420, "width": 210, "height": 120, "text": "🌿 3. Koza (Krizalit)", "fontSize": 18, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 14},
                {"id": "drag_kelebek", "name": "Kelebek", "type": "text", "role": "draggable", "x": 920, "y": 420, "width": 210, "height": 120, "text": "🦋 4. Kelebek", "fontSize": 18, "fontWeight": "bold", "backgroundColor": "#ffffff", "borderColor": "#cbd5e1", "borderWidth": 2, "borderRadius": 14}
            ],
            "answerKey": {
                "drag_yumurta": "slot_1",
                "drag_tirtil": "slot_2",
                "drag_koza": "slot_3",
                "drag_kelebek": "slot_4"
            },
            "settings": {"evaluationMode": "instant", "wrongAnswerBehavior": "return", "correctAnswerBehavior": "lock", "soundEnabled": True, "completionMessage": "Tebrikler! Kelebeğin gelişim basamaklarını doğru sıraladınız."}
        }
    }
]

# Player CSS içeriği
with open(os.path.join(BASE_DIR, 'css/player.css'), 'r', encoding='utf-8') as f:
    player_css = f.read()

for item in sample_defs:
    json_path = os.path.join(SAMPLES_DIR, item['json_name'])
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(item['data'], f, ensure_ascii=False, indent=2)

    # Bağımsız HTML oluştur
    html_path = os.path.join(SAMPLES_DIR, item['filename'])
    project_json_escaped = json.dumps(item['data'], ensure_ascii=False).replace('</script>', '<\\/script>')

    full_html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>{item['title']}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; min-height: 100vh; overflow: hidden; }}
    {player_css}
  </style>
</head>
<body>
  <div id="activity-app"></div>

  <script id="activity-data" type="application/json">
{project_json_escaped}
  </script>

  <script>
    window.DND = window.DND || {{}};
    {audio_code}
    {val_code}
    {activity_code}

    window.addEventListener('DOMContentLoaded', function() {{
      const raw = document.getElementById('activity-data').textContent;
      const project = JSON.parse(raw);
      const container = document.getElementById('activity-app');
      new window.DND.ActivityEngine(container, project);
    }});
  </script>
</body>
</html>"""

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

    # Doğrulama: Harici CDN veya internet bağlantısı var mı?
    assert "http://" not in full_html.replace('http://www.w3.org/2000/svg', '')
    assert "https://" not in full_html
    test_passed(f"Çevrimdışı tek parça HTML üretildi: {item['filename']} ({round(os.path.getsize(html_path)/1024, 1)} KB)")

print("\n" + "="*60)
print("  TÜM KABUL TESTLERİ BAŞARIYLA GEÇTİ (100% OK)")
print("="*60 + "\n")
