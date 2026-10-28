/**
 * ValidationEngine - Proje JSON verisi, cevap anahtarı ve nesne tutarlılığı
 * doğrulamalarını gerçekleştirir. Hatalı ve eksik durumları tespit eder.
 */
class ValidationEngine {
  static get VALID_ACTIVITY_TYPES() {
    return ['image-labeling', 'matching', 'categorization', 'sequencing'];
  }

  static get VALID_ROLES() {
    return ['decorative', 'draggable', 'target', 'category', 'sequence_slot'];
  }

  /**
   * Bir projenin şemasını doğrular
   * @param {Object} projectData
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validateProject(projectData) {
    const errors = [];
    const warnings = [];

    if (!projectData || typeof projectData !== 'object') {
      return { valid: false, errors: ['Proje verisi geçerli bir JSON nesnesi değil.'], warnings };
    }

    // Sürüm kontrolü
    if (!projectData.version) {
      warnings.push('Proje sürüm bilgisi bulunamadı, varsayılan sürüm (1.0) kabul edildi.');
    }

    // Proje başlığı ve türü
    if (!projectData.project || typeof projectData.project !== 'object') {
      errors.push('Proje meta verisi (project alanı) eksik.');
    } else {
      if (!projectData.project.name || typeof projectData.project.name !== 'string') {
        warnings.push('Proje adı belirtilmemiş.');
      }
      if (!this.VALID_ACTIVITY_TYPES.includes(projectData.project.activityType)) {
        errors.push(`Geçersiz etkinlik türü: ${projectData.project.activityType}. Desteklenenler: ${this.VALID_ACTIVITY_TYPES.join(', ')}`);
      }
    }

    // Sahne (Stage) kontrolleri
    if (!projectData.stage || typeof projectData.stage !== 'object') {
      errors.push('Sahne ayarları (stage alanı) eksik.');
    } else {
      if (typeof projectData.stage.width !== 'number' || projectData.stage.width <= 0) {
        errors.push('Sahne genişliği pozitif bir sayı olmalıdır.');
      }
      if (typeof projectData.stage.height !== 'number' || projectData.stage.height <= 0) {
        errors.push('Sahne yüksekliği pozitif bir sayı olmalıdır.');
      }
    }

    // Nesneler (Objects) kontrolleri
    if (!Array.isArray(projectData.objects)) {
      errors.push('Nesneler listesi (objects alanı) bir dizi olmalıdır.');
    } else {
      const idSet = new Set();
      let draggablesCount = 0;
      let targetsCount = 0;

      projectData.objects.forEach((obj, idx) => {
        if (!obj.id) {
          errors.push(`Nesne #${idx + 1} için 'id' alanı eksik.`);
        } else if (idSet.has(obj.id)) {
          errors.push(`Mükerrer nesne ID'si tespit edildi: '${obj.id}'.`);
        } else {
          idSet.add(obj.id);
        }

        if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
          errors.push(`'${obj.id || idx}' nesnesinin X ve Y koordinatları sayı olmalıdır.`);
        }

        if (obj.role === 'draggable') draggablesCount++;
        if (['target', 'category', 'sequence_slot'].includes(obj.role)) targetsCount++;
      });

      if (draggablesCount === 0) {
        warnings.push('Etkinlikte henüz hiç sürüklenebilir nesne bulunmuyor.');
      }
      if (targetsCount === 0) {
        warnings.push('Etkinlikte henüz hiç hedef alan bulunmuyor.');
      }

      // Cevap anahtarı kontrolü
      const answerKey = projectData.answerKey || {};
      for (const [dragId, targetId] of Object.entries(answerKey)) {
        if (!idSet.has(dragId)) {
          warnings.push(`Cevap anahtarındaki '${dragId}' ID'li sürüklenebilir nesne sahnede bulunamadı.`);
        }
        if (projectData.project && projectData.project.activityType !== 'sequencing') {
          if (!idSet.has(targetId)) {
            warnings.push(`Cevap anahtarındaki '${targetId}' ID'li hedef nesne sahnede bulunamadı.`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * HTML dışa aktarmadan önce cevap anahtarının oynanabilirlik durumunu kontrol eder
   */
  static validatePlayability(projectData) {
    const issues = [];
    const objects = projectData.objects || [];
    const answerKey = projectData.answerKey || {};
    const draggables = objects.filter(o => o.role === 'draggable');

    if (draggables.length === 0) {
      issues.push('En az bir adet sürüklenebilir nesne eklemelisiniz.');
    }

    const unassignedDraggables = draggables.filter(d => !answerKey[d.id]);
    if (unassignedDraggables.length > 0) {
      const names = unassignedDraggables.map(d => d.name || d.text || d.id).join(', ');
      issues.push(`Şu sürüklenebilir nesnelerin cevap anahtarında hedefi belirlenmemiş: ${names}`);
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * XSS ve zararlı HTML girişlerini engellemek için metin temizleme
   */
  static sanitizeText(str) {
    if (str === null || str === undefined) return '';
    const temp = document.createElement('div');
    temp.textContent = String(str);
    return temp.innerHTML;
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.ValidationEngine = ValidationEngine;
