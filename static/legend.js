// — Citazione articolo —
const ASDV_NOTE_HTML = `
<aside class="note-cell" aria-label="Nota">
  Longhin, Marco. Per una sistematizzazione dell'<em>Archivio sonoro dei dialetti veneti</em> (Oral Archives Journal, under review)
</aside>`;

function injectGlobalNoteCell() {
  if (document.querySelector('.note-cell')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = ASDV_NOTE_HTML.trim();
  document.body.appendChild(wrapper.firstElementChild);
}

document.addEventListener('DOMContentLoaded', injectGlobalNoteCell);


window.ASDV = window.ASDV || {};

(function LegendModule(ns){

  ns.buildLegend = function(){
    const svg = document.querySelector('svg');
    if (!svg) return;
    
    // — Permette click/hover attraverso lo sfondo non interattivo —
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

    // — Raccoglie elementi interattivi dall'SVG —
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

    // — Legenda dei colori (statica) —
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

    // Bottone "Fusioni e note"
    let tableBtn = document.querySelector('#open-fusions');
    if (!tableBtn) {
      tableBtn = document.createElement('button');
      tableBtn.id = 'open-fusions';
      tableBtn.type = 'button';
      tableBtn.textContent = 'Fusioni e note';
      tableBtn.className = 'btn btn--primary';
      tableBtn.setAttribute('aria-haspopup', 'dialog');
      legendStatic.appendChild(tableBtn);
    }

    // — Dialog "Fusioni e note" —
    let tableDialog = document.getElementById('table-dialog');
    if (!tableDialog) {
      tableDialog = document.createElement('dialog');
      tableDialog.id = 'table-dialog';
      tableDialog.setAttribute('aria-labelledby', 'table-dialog-title');
      tableDialog.innerHTML = `
        <h3 id="table-dialog-title"></h3>
        <div class="table-wrapper"></div>
        <form method="dialog" class="dialog-actions">
          <button class="btn btn--primary" value="close" aria-label="Chiudi tabella">Chiudi</button>
        </form>
      `;
      document.body.appendChild(tableDialog);
    }

    tableBtn.addEventListener('click', () => {
      if (typeof tableDialog.showModal === 'function') {
        tableDialog.showModal();
      } else {
        tableDialog.setAttribute('open', '');
      }
    });

    const tableTitleEl = tableDialog.querySelector('#table-dialog-title');
    const tableWrapperEl = tableDialog.querySelector('.table-wrapper');

    // — Lista dinamica dei comuni —
    let legendDynamic = document.querySelector('.municipalities');
    if (!legendDynamic) {
      legendDynamic = document.createElement('aside');
      legendDynamic.className = 'municipalities';
      document.body.appendChild(legendDynamic);
    }
    legendDynamic.innerHTML = '';

    // Titolo della pagina con nome provincia —
    const title = document.createElement('h3');
    const province = (() => {
      const m = (document.title || '').match(/provincia di\s+(.+)/i);
      return m ? m[1].trim() : '';
    })();
    title.textContent = `Comuni della provincia di ${province}`;

  // Titolo della lista con nome provincia
  if (tableTitleEl) {
    const provLabel = province && province.length ? province : '';
    tableTitleEl.textContent = `Fusioni di comuni nella provincia di ${provLabel}`.trim();
  }

  // Utility: escape HTML per messaggi/tabella —
  const escapeHTML = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // — Popolamento del contenuto del dialog —
  // Se presente #fusions-message: mostra testo
  // Se presente #fusions-data (JSON array): costruisce tabella
  let pageMessage = '';
  const msgNode = document.getElementById('fusions-message');
  if (msgNode && msgNode.textContent) {
    const raw = msgNode.textContent.trim();
    if ((msgNode.getAttribute('type') || '').includes('json')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.text === 'string') pageMessage = parsed.text.trim();
      } catch (e) {
        console.warn('ASDV fusioni: JSON non valido in #fusions-message', e);
      }
    } else {
      pageMessage = raw;
    }
  }

  if (tableWrapperEl) tableWrapperEl.innerHTML = '';

  if (pageMessage && tableWrapperEl) {
    tableWrapperEl.innerHTML = `<p class="fusion-fallback">${escapeHTML(pageMessage)}</p>`;
  } else {
    let fusionRows = [];
    const dataNode = document.getElementById('fusions-data');
    if (dataNode && dataNode.textContent) {
      try {
        const parsed = JSON.parse(dataNode.textContent);
        if (Array.isArray(parsed)) fusionRows = parsed;
      } catch (e) {
        console.warn('ASDV fusioni: JSON non valido in #fusions-data', e);
      }
    }

    if (fusionRows.length && tableWrapperEl) {
      const table = document.createElement('table');
      table.className = 'info-table';
      table.setAttribute('role', 'table');

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr><th scope="col">Comune istituito</th><th scope="col">Data di istituzione</th><th scope="col">Comuni soppressi</th></tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      fusionRows.forEach((row) => {
        const tr = document.createElement('tr');
        const c1 = document.createElement('td');
        const c2 = document.createElement('td');
        const c3 = document.createElement('td');
        c1.textContent = row.istituito ?? '';
        c2.textContent = row.data ?? '';
        c3.textContent = row.soppressi ?? '';
        tr.append(c1, c2, c3);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      tableWrapperEl.appendChild(table);
    }
  }

    legendDynamic.appendChild(title);

    // Lista dei comuni ordinata alfabeticamente —
    const ul = document.createElement('ul');
    ul.className = 'municipality-list';

    const items = Array.from(map.entries())
      .map(([label, obj]) => ({ label, g: obj.g, base: obj.base }))
      .sort((a, b) => a.base.localeCompare(b.base, 'it'));

    // — Gestione evidenziazione —
    // selectedSet: comuni selezionati via checkbox/click
    // applyHighlights: applica highlight persistente
    // previewOn/Off: anteprima hover (se nulla è selezionato)
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

    // Costruzione delle righe: checkbox + label + sync con clic sul percorso SVG
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

    // — Integrazione con modulo di ricerca —
    if (window.ASDV && typeof window.ASDV.initSearch === 'function') {
      window.ASDV.initSearch({ legendDynamic, ul, items, selectedSet, applyHighlights, clearAllHighlights });
    }

    legendDynamic.appendChild(ul);

    // — Bottone "Cancella selezione" —
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

// ===== Bootstrap legenda =====
document.addEventListener('DOMContentLoaded', () => {
  window.ASDV.buildLegend && window.ASDV.buildLegend();
});