// Lightweight i18n loader: fetches /i18n/strings.csv and replaces text on
// elements marked with data-i18n="key" or data-i18n-attr="attr:key".
// Locale is taken from <html lang>. Maps ckb -> ku.
(function () {
  'use strict';

  var LANG_MAP = { ckb: 'ku' };

  function getLocale() {
    var lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    return LANG_MAP[lang] || lang;
  }

  // Minimal RFC-4180-ish CSV parser. Handles quoted fields with embedded
  // commas, quotes ("") and newlines.
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(field); field = '';
        } else if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          row.push(field); field = '';
          rows.push(row); row = [];
        } else {
          field += c;
        }
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Find or create the text node we should write into. Strategy:
  //  - If element has no element children, use its textContent.
  //  - Otherwise, replace the longest direct text-node child.
  function setText(el, text) {
    var hasElementChild = false;
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 1) { hasElementChild = true; break; }
    }
    if (!hasElementChild) {
      el.textContent = text;
      return;
    }
    // Find longest direct text node
    var best = null;
    for (var j = 0; j < el.childNodes.length; j++) {
      var n = el.childNodes[j];
      if (n.nodeType === 3 && n.textContent.trim().length) {
        if (!best || n.textContent.trim().length > best.textContent.trim().length) {
          best = n;
        }
      }
    }
    if (best) {
      // Preserve any leading whitespace (often a single space after an icon)
      var leading = best.textContent.match(/^\s*/)[0] || ' ';
      best.textContent = leading + text;
    } else {
      // No text node yet — append one with a leading space
      el.appendChild(document.createTextNode(' ' + text));
    }
  }

  function applyTranslations(dict) {
    // Text content
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      if (dict[key] != null && dict[key] !== '') setText(el, dict[key]);
    }
    // Attributes: data-i18n-attr="attr:key" or "attr1:key1;attr2:key2"
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    for (var k = 0; k < attrNodes.length; k++) {
      var node = attrNodes[k];
      var spec = node.getAttribute('data-i18n-attr');
      var pairs = spec.split(';');
      for (var p = 0; p < pairs.length; p++) {
        var bits = pairs[p].split(':');
        if (bits.length !== 2) continue;
        var attr = bits[0].trim();
        var k2 = bits[1].trim();
        if (dict[k2] != null && dict[k2] !== '') node.setAttribute(attr, dict[k2]);
      }
    }
  }

  function init() {
    var locale = getLocale();
    fetch('../i18n/strings.csv', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('strings.csv fetch failed: ' + r.status);
        return r.text();
      })
      .then(function (text) {
        var rows = parseCSV(text).filter(function (r) { return r.length > 1; });
        if (!rows.length) return;
        var header = rows[0];
        var keyIdx = header.indexOf('key');
        var locIdx = header.indexOf(locale);
        if (locIdx < 0) {
          console.warn('[i18n] locale not found in CSV:', locale);
          return;
        }
        var dict = {};
        for (var i = 1; i < rows.length; i++) {
          var row = rows[i];
          if (!row[keyIdx]) continue;
          dict[row[keyIdx]] = row[locIdx] || '';
        }
        applyTranslations(dict);
        document.documentElement.setAttribute('data-i18n-loaded', 'true');
      })
      .catch(function (err) { console.error('[i18n]', err); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
