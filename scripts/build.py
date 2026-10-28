#!/usr/bin/env python3
"""
DND Kütüphanesi Dağıtım Dosyaları Derleyici (Build Script)
Harici ağır derleyicilere gerek kalmadan saf Python ile:
- dist/player.js (ESM)
- dist/player.umd.cjs (UMD / CommonJS)
- dist/dnd-player-element.js (Web Component bağımsız script)
- dist/dnd.js (Tüm kütüphane ESM)
- dist/player.css ve dist/editor.css
üretir.
"""

import os
import shutil
import json
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, 'dist')
os.makedirs(DIST_DIR, exist_ok=True)

def read_file(rel_path):
    with open(os.path.join(BASE_DIR, rel_path), 'r', encoding='utf-8') as f:
        return f.read()

# CSS Dosyalarını Kopyala
shutil.copy(os.path.join(BASE_DIR, 'css/player.css'), os.path.join(DIST_DIR, 'player.css'))
editor_css = '\n'.join(read_file(path) for path in [
    'css/editor.css', 'css/stage.css', 'css/answer-key.css', 'css/player.css'
])
editor_css = editor_css.replace(':root', '.dnd-editor-root')
editor_css = editor_css.replace('body.is-embedded', '.dnd-editor-root.is-embedded')
editor_css = editor_css.replace('body {', '.dnd-editor-root {')
editor_css += '''
:host { display: block; width: 100%; height: 100%; min-height: 620px; }
.dnd-editor-root { width: 100%; height: 100%; min-height: 620px; position: relative; }
.dnd-editor-root.hide-file-actions .top-header-right { display: none; }
.dnd-editor-root #preview-container { position: absolute; inset: 0; }
'''
with open(os.path.join(DIST_DIR, 'editor.css'), 'w', encoding='utf-8') as f:
    f.write(editor_css)

# 1. Kaynak dosyaları oku
audio_code = read_file('js/utils/AudioSynthesizer.js')
val_code = read_file('js/engine/ValidationEngine.js')
engine_code = read_file('js/player/ActivityEngine.js')
player_code = read_file('src/ActivityPlayer.js')
webcomp_code = read_file('src/components/DNDPlayerElement.js')
bundled_player_code = player_code.replace('export class ActivityPlayer', 'class ActivityPlayer')
bundled_webcomp_code = webcomp_code.replace('export class DNDPlayerElement', 'class DNDPlayerElement')

# Direct-mount editor bundle. Editor internals still register into window.DND,
# while the public API is a normal ESM export and renders inside Shadow DOM.
editor_sources = [
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
    'js/ui/UIManager.js',
    'js/data/SampleProjects.js',
]
editor_api = read_file('src/DNDEditor.js').replace(
    "const EDITOR_CSS = globalThis.__DND_EDITOR_CSS__ || '';",
    'const EDITOR_CSS = ' + json.dumps(editor_css) + ';'
)
editor_bundle = '''/** @mhmttosun/dnd direct-mount editor bundle */\n''' + \
    '\n'.join(read_file(path) for path in editor_sources) + '\n' + editor_api
editor_bundle = re.sub(r'[ \t]+$', '', editor_bundle, flags=re.MULTILINE)
with open(os.path.join(DIST_DIR, 'editor.js'), 'w', encoding='utf-8') as f:
    f.write(editor_bundle)

# Temizleme yardımcıları: universal export satırlarını ayıkla (iç içe çakışmayı önlemek için)
def strip_exports(code):
    return re.sub(r'\n// (?:Universal namespace export|Global namespace)[\s\S]*$', '', code)

clean_audio = strip_exports(audio_code)
clean_val = strip_exports(val_code)
clean_engine = strip_exports(engine_code)

# 2. dist/player.js (ESM Modülü) Oluştur
esm_player_content = f"""/**
 * @mhmttosun/dnd - Player Bundle (ES Module)
 * Etkinlik oynatıcı motoru, ActivityPlayer sarmalayıcısı ve <dnd-player> Web Component.
 * Lisans: MIT (c) 2026 mhmttosun
 */

// Global çevre güvencesi
const windowObj = typeof window !== 'undefined' ? window : {{}};
windowObj.DND = windowObj.DND || {{}};

{clean_audio}
windowObj.DND.AudioSynthesizer = AudioSynthesizer;

{clean_val}
windowObj.DND.ValidationEngine = ValidationEngine;

{clean_engine}
windowObj.DND.ActivityEngine = ActivityEngine;

{bundled_player_code.replace("const getActivityEngine = () => {", "const getActivityEngine = () => ActivityEngine; // internal reference\nconst _unused = () => {")}

{bundled_webcomp_code.replace("import { ActivityPlayer } from '../ActivityPlayer.js';", "// ActivityPlayer doğrudan modül içinde mevcut")}

export {{
  ActivityPlayer,
  DNDPlayerElement,
  ActivityEngine,
  AudioSynthesizer,
  ValidationEngine
}};

export default ActivityPlayer;
"""

with open(os.path.join(DIST_DIR, 'player.js'), 'w', encoding='utf-8') as f:
    f.write(esm_player_content)

# 3. dist/player.umd.cjs (UMD / CommonJS) Oluştur
umd_player_content = f"""/**
 * @mhmttosun/dnd - Player Bundle (UMD / CommonJS)
 * Lisans: MIT (c) 2026 mhmttosun
 */
(function (global, factory) {{
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.DND = global.DND || {{}}));
}})(this, (function (exports) {{
  'use strict';

  var windowObj = typeof window !== 'undefined' ? window : {{}};
  windowObj.DND = windowObj.DND || {{}};

{clean_audio}
  windowObj.DND.AudioSynthesizer = AudioSynthesizer;

{clean_val}
  windowObj.DND.ValidationEngine = ValidationEngine;

{clean_engine}
  windowObj.DND.ActivityEngine = ActivityEngine;

  var ActivityPlayer = class {{
    constructor(options) {{
      this.options = Object.assign({{
        sound: true,
        onComplete: null,
        onStep: null,
        onDrop: null,
        onReset: null,
        onReady: null
      }}, options || {{}});

      this.container = null;
      this.engine = null;
      this.isDestroyed = false;

      if (this.options.target) {{
        this.resolveContainer(this.options.target);
      }}

      if (this.options.data) {{
        this.mount(this.options.data);
      }} else if (this.options.src) {{
        this.loadFromUrl(this.options.src);
      }} else if (this.options.file) {{
        this.loadFromFile(this.options.file);
      }} else if (this.options.jsonString) {{
        this.loadFromJsonString(this.options.jsonString);
      }}
    }}

    resolveContainer(target) {{
      if (typeof target === 'string') {{
        this.container = document.querySelector(target);
      }} else if (target instanceof HTMLElement) {{
        this.container = target;
      }}
      if (!this.container) {{
        throw new Error('[ActivityPlayer] Hedef container bulunamadı: ' + target);
      }}
    }}

    async loadFromUrl(url) {{
      try {{
        var response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        this.mount(data);
      }} catch (err) {{
        console.error('[ActivityPlayer] Veri yüklenemedi:', err);
        if (this.container) {{
          this.container.innerHTML = '<div style="padding:20px;color:red;">⚠️ Veri yüklenemedi: ' + err.message + '</div>';
        }}
        throw err;
      }}
    }}

    async loadFromFile(file) {{
      if (!file) throw new Error('[ActivityPlayer] Dosya nesnesi boş olamaz.');
      try {{
        var text = '';
        if (typeof file.text === 'function') {{
          text = await file.text();
        }} else {{
          text = await new Promise((resolve, reject) => {{
            var reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'utf-8');
          }});
        }}
        this.loadFromJsonString(text);
      }} catch (err) {{
        console.error('[ActivityPlayer] Dosya okunamadı:', err);
        if (this.container) {{
          this.container.innerHTML = '<div style="padding:20px;color:red;">⚠️ Dosya okunamadı: ' + err.message + '</div>';
        }}
        throw err;
      }}
    }}

    loadFromJsonString(jsonString) {{
      try {{
        var data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        this.mount(data);
      }} catch (err) {{
        console.error('[ActivityPlayer] JSON ayrıştırma hatası:', err);
        if (this.container) {{
          this.container.innerHTML = '<div style="padding:20px;color:red;">⚠️ Geçersiz JSON: ' + err.message + '</div>';
        }}
        throw err;
      }}
    }}
    }}

    mount(projectData) {{
      if (this.isDestroyed || !this.container) return;
      if (this.engine) {{
        this.engine.destroy();
        this.engine = null;
      }}

      var engineOptions = {{
        isEmbedded: false,
        onComplete: (res) => {{
          if (typeof this.options.onComplete === 'function') this.options.onComplete(res);
        }},
        onStep: (state) => {{
          if (typeof this.options.onStep === 'function') this.options.onStep(state);
        }},
        onDrop: (dropInfo) => {{
          if (typeof this.options.onDrop === 'function') this.options.onDrop(dropInfo);
        }},
        onReset: (state) => {{
          if (typeof this.options.onReset === 'function') this.options.onReset(state);
        }}
      }};

      if (projectData.settings) {{
        projectData.settings.soundEnabled = this.options.sound !== false;
      }}

      this.engine = new ActivityEngine(this.container, projectData, engineOptions);

      if (typeof this.options.onReady === 'function') {{
        this.options.onReady(this);
      }}
    }}

    on(event, callback) {{
      return this.engine ? this.engine.on(event, callback) : function(){{}};
    }}

    off(event, callback) {{
      if (this.engine) this.engine.off(event, callback);
    }}

    getState() {{
      return this.engine ? this.engine.getState() : null;
    }}

    setSound(enabled) {{
      if (this.engine && this.engine.audio) {{
        this.engine.audio.setEnabled(!!enabled);
      }}
    }}

    reset() {{
      if (this.engine) this.engine.resetGame();
    }}

    destroy() {{
      if (this.isDestroyed) return;
      if (this.engine) {{
        this.engine.destroy();
        this.engine = null;
      }}
      if (this.container) {{
        this.container.innerHTML = '';
      }}
      this.isDestroyed = true;
    }}
  }};

  var DNDPlayerElement = class extends HTMLElement {{
    static get observedAttributes() {{ return ['src', 'sound']; }}
    constructor() {{
      super();
      this._player = null;
      this._data = null;
    }}
    connectedCallback() {{ this.render(); }}
    disconnectedCallback() {{ if (this._player) {{ this._player.destroy(); this._player = null; }} }}
    attributeChangedCallback(name, oldValue, newValue) {{
      if (oldValue === newValue || !this.isConnected) return;
      if (name === 'src' && newValue) this.initPlayer();
      else if (name === 'sound' && this._player) this._player.setSound(newValue !== 'false');
    }}
    get data() {{ return this._data; }}
    set data(val) {{ this._data = val; this.initPlayer(); }}
    get player() {{ return this._player; }}
    render() {{
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.width = '100%';
      this.style.minHeight = this.style.minHeight || '500px';
      this.initPlayer();
    }}
    initPlayer() {{
      if (this._player) {{ this._player.destroy(); this._player = null; }}
      var src = this.getAttribute('src');
      var soundAttr = this.getAttribute('sound');
      if (!src && !this._data) return;
      this._player = new ActivityPlayer({{
        target: this,
        src: src || undefined,
        data: this._data || undefined,
        sound: soundAttr !== 'false',
        onComplete: (stats) => this.dispatchEvent(new CustomEvent('dnd:complete', {{ detail: stats, bubbles: true }})),
        onStep: (state) => this.dispatchEvent(new CustomEvent('dnd:step', {{ detail: state, bubbles: true }})),
        onDrop: (dropInfo) => this.dispatchEvent(new CustomEvent('dnd:drop', {{ detail: dropInfo, bubbles: true }})),
        onReset: (state) => this.dispatchEvent(new CustomEvent('dnd:reset', {{ detail: state, bubbles: true }})),
        onReady: (p) => this.dispatchEvent(new CustomEvent('dnd:ready', {{ detail: {{ player: p }}, bubbles: true }}))
      }});
    }}
    loadFile(file) {{
      if (this._player) this._player.loadFromFile(file);
      else this._player = new ActivityPlayer({{ target: this, file: file, sound: this.getAttribute('sound') !== 'false' }});
    }}
    loadJsonString(str) {{
      if (this._player) this._player.loadFromJsonString(str);
      else this._player = new ActivityPlayer({{ target: this, jsonString: str, sound: this.getAttribute('sound') !== 'false' }});
    }}
    reset() {{ if (this._player) this._player.reset(); }}
    getState() {{ return this._player ? this._player.getState() : null; }}
  }};

  if (typeof customElements !== 'undefined' && !customElements.get('dnd-player')) {{
    customElements.define('dnd-player', DNDPlayerElement);
  }}

  exports.ActivityPlayer = ActivityPlayer;
  exports.DNDPlayerElement = DNDPlayerElement;
  exports.ActivityEngine = ActivityEngine;
  exports.AudioSynthesizer = AudioSynthesizer;
  exports.ValidationEngine = ValidationEngine;
}}));
"""

with open(os.path.join(DIST_DIR, 'player.umd.cjs'), 'w', encoding='utf-8') as f:
    f.write(umd_player_content)

# 4. dist/dnd-player-element.js (Web Component Doğrudan Script Dahili)
shutil.copy(os.path.join(DIST_DIR, 'player.umd.cjs'), os.path.join(DIST_DIR, 'dnd-player-element.js'))

# 5. dist/dnd.js (Tüm Kütüphane)
shutil.copy(os.path.join(DIST_DIR, 'player.js'), os.path.join(DIST_DIR, 'dnd.js'))

print("✓ dist/ dosyaları başarıyla üretildi:")
print("  - dist/player.js (ESM)")
print("  - dist/player.umd.cjs (UMD/CJS)")
print("  - dist/dnd-player-element.js (Web Component)")
print("  - dist/dnd.js (Full ESM)")
print("  - dist/player.css & dist/editor.css")
