/**
 * InteractionUtils - Document ve Shadow DOM içindeki etkileşimleri aynı şekilde
 * değerlendirmek için ortak event path, focus ve kısayol yardımcıları.
 */
class InteractionUtils {
  static getEventPath(event) {
    if (event && typeof event.composedPath === 'function') {
      const composedPath = event.composedPath();
      if (Array.isArray(composedPath) && composedPath.length > 0) {
        return composedPath;
      }
    }

    const path = [];
    let node = event ? event.target : null;
    while (node) {
      path.push(node);
      node = node.parentNode || node.host || null;
    }
    if (typeof window !== 'undefined' && !path.includes(window)) {
      path.push(window);
    }
    return path;
  }

  static pathContains(event, target) {
    if (!target) return false;
    return this.getEventPath(event).includes(target);
  }

  static pathMatches(event, selector) {
    if (!selector) return false;
    return this.getEventPath(event).some(node => {
      return !!node && typeof node.matches === 'function' && node.matches(selector);
    });
  }

  static getDeepActiveElement(root = null) {
    const fallbackDocument = typeof document !== 'undefined' ? document : null;
    const focusRoot = root || fallbackDocument;
    let active = focusRoot && 'activeElement' in focusRoot
      ? focusRoot.activeElement
      : (fallbackDocument ? fallbackDocument.activeElement : null);

    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active;
  }

  static isInteractiveElement(element) {
    if (!element) return false;
    if (element.isContentEditable) return true;

    const contentEditable = typeof element.getAttribute === 'function'
      ? element.getAttribute('contenteditable')
      : null;
    if (contentEditable !== null && contentEditable !== 'false') return true;

    const tagName = String(element.tagName || '').toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON', 'A'].includes(tagName)) {
      return true;
    }

    if (typeof element.matches === 'function') {
      return element.matches('[role="textbox"], [role="button"], [role="menuitem"], [role="tab"], [role="slider"], [role="spinbutton"], [data-editor-shortcuts="ignore"]');
    }
    return false;
  }

  static shouldIgnoreEditorShortcut(event, root = null) {
    if (this.getEventPath(event).some(node => this.isInteractiveElement(node))) {
      return true;
    }
    return this.isInteractiveElement(this.getDeepActiveElement(root));
  }
}

// Global namespace
window.DND = window.DND || {};
window.DND.InteractionUtils = InteractionUtils;
