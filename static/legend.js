// ===== Config e nota globale =====
const ASDV_NOTE_HTML = `
<aside class="note-cell" aria-label="Nota">
  Longhin, Marco. 2025. Per una sistematizzazione dell'<em>Archivio sonoro dei dialetti veneti</em> (Oral Archives Journal, under review)
</aside>`;

function injectGlobalNoteCell() {
  if (document.querySelector('.note-cell')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = ASDV_NOTE_HTML.trim();
  document.body.appendChild(wrapper.firstElementChild);
}

document.addEventListener('DOMContentLoaded', injectGlobalNoteCell);

// ===== Namespace e API =====

window.ASDV = window.ASDV || {};

(function LegendModule(ns){
  ns.buildLegend = function(){
    const svg = document.querySelector('svg');
    if (!svg) return;
    
    (function allowHitThroughForBackground() {
      const candidates = svg.querySelectorAll('g, path, polygon, polyline, rect, circle, ellipse');
      candidates.forEach((el) => {
        const hasInteractiveAncestor = !!el.closest('[data-tooltip]');
        const hasInteractiveDescendant = el.matches('g') && !!el.querySelector('[data-tooltip]');
        if (hasInteractiveAncestor || hasInteractiveDescendant) {
          el.style.pointerEvents = '';
        } else {
          el.style.pointerEvents = 'none';
        }
      });
    })();

    const nodes = Array.from(svg.querySelectorAll('[data-tooltip]'));
    if (!nodes.length) return;

    const map = new Map();
    for (const el of nodes) {
      const g = el.closest('g') || el;
      let raw = (g.getAttribute('data-tooltip') || el.getAttribute('data-tooltip') || '').trim();
      if (!raw) continue;
      let label = raw
      .replace(/(?:\\n|\r?\n|&#10;|&#x0a;)/gi, ', ')
      label = label.replace(/\s*\([^)]*\)\s*/g, '').replace(/\s{2,}/g, ' ').trim();
      const base = label;
      if (!map.has(label)) map.set(label, { g, base });
      if (!g.classList.contains('area')) g.classList.add('area');
      g.style.cursor = 'pointer';
    }

    // — Legenda dei colori
    let legendStatic = document.querySelector('.colour-legend');
    if (!legendStatic) {
      legendStatic = document.createElement('aside');
      legendStatic.className = 'colour-legend';
      document.body.appendChild(legendStatic);
    }
    const staticLabels = {
      base:  svg.getAttribute('data-legend-base')  || 'Comuni esaminati',
      light: svg.getAttribute('data-legend-light') || 'Comuni non esaminati',
      dark:  svg.getAttribute('data-legend-dark')  || 'Capoluogo di provincia'
    };
    const staticTitle = document.createElement('h3');
    staticTitle.textContent = 'Legenda dei colori';
    const key = document.createElement('div');
    key.className = 'colour-legend-key';
    key.innerHTML = `
      <span class="swatch area" aria-hidden="true"></span><span class="label">${staticLabels.base}</span>
      <span class="swatch area-light" aria-hidden="true"></span><span class="label">${staticLabels.light}</span>
      <span class="swatch area-dark" aria-hidden="true"></span><span class="label">${staticLabels.dark}</span>
    `;
    legendStatic.innerHTML = '';
    legendStatic.appendChild(staticTitle);
    legendStatic.appendChild(key);

    // — Lista dei comuni
    let legendDynamic = document.querySelector('.municipalities');
    if (!legendDynamic) {
      legendDynamic = document.createElement('aside');
      legendDynamic.className = 'municipalities';
      document.body.appendChild(legendDynamic);
    }
    legendDynamic.innerHTML = '';

    const title = document.createElement('h3');
    const province = (() => {
      const m = (document.title || '').match(/provincia di\s+(.+)/i);
      return m ? m[1].trim() : '';
    })();
    title.textContent = `Comuni della provincia di ${province}`;
    legendDynamic.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'municipality-list';

    const items = Array.from(map.entries())
      .map(([label, obj]) => ({ label, g: obj.g, base: obj.base }))
      .sort((a, b) => a.base.localeCompare(b.base, 'it'));

    const selectedSet = new Set();
    const clearAllHighlights = () => {
      svg.querySelectorAll('.area.is-highlighted').forEach(n => n.classList.remove('is-highlighted'));
      svg.querySelectorAll('.area.is-dimmed').forEach(n => n.classList.remove('is-dimmed'));
    };
    const applyHighlights = () => {
      clearAllHighlights();
      if (selectedSet.size === 0) return;
      selectedSet.forEach(g => g.classList.add('is-highlighted'));
      svg.querySelectorAll('.area').forEach(n => {
        const parent = n.closest('g') || n;
        if (!Array.from(selectedSet).includes(parent)) n.classList.add('is-dimmed');
      });
    };

    // — Preview hover
    const previewOn = (g) => {
      if (selectedSet.size > 0) return;
      clearAllHighlights();
      g.classList.add('is-highlighted');
      svg.querySelectorAll('.area').forEach(n => { if (n !== g) n.classList.add('is-dimmed'); });
    };
    const previewOff = () => {
      if (selectedSet.size > 0) return;
      clearAllHighlights();
    };

    for (const { label, base, g } of items) {
      const li = document.createElement('li');
      li.className = 'municipality-item';

      const id = `lg-${base.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.setAttribute('aria-label', `Seleziona ${label}`);

      const lab = document.createElement('label');
      lab.setAttribute('for', id);
      lab.textContent = label;

      cb.addEventListener('change', () => {
        if (cb.checked) selectedSet.add(g); else selectedSet.delete(g);
        applyHighlights();
      });
      lab.addEventListener('mouseenter', () => previewOn(g));
      lab.addEventListener('mouseleave', previewOff);
      g.addEventListener('click', () => {
        const now = !cb.checked;
        cb.checked = now;
        if (now) selectedSet.add(g); else selectedSet.delete(g);
        applyHighlights();
      });
      g.addEventListener('mouseenter', () => previewOn(g));
      g.addEventListener('mouseleave', previewOff);

      li.appendChild(cb);
      li.appendChild(lab);
      ul.appendChild(li);
    }

    // — Integrazione ricerca
    if (window.ASDV && typeof window.ASDV.initSearch === 'function') {
      window.ASDV.initSearch({ legendDynamic, ul, items, selectedSet, applyHighlights, clearAllHighlights });
    }

    legendDynamic.appendChild(ul);

    // — Cancella selezione
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Cancella selezione';
    clearBtn.className = 'btn btn--primary clear-selection';
    legendDynamic.appendChild(clearBtn);

    clearBtn.addEventListener('click', () => {
      selectedSet.clear();
      ul.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      clearAllHighlights();
    });
  };
})(window.ASDV);

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', () => {
  window.ASDV.buildLegend && window.ASDV.buildLegend();
});