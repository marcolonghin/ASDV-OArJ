// ===== Ricerca (Tagify + integrazione legenda) =====
window.ASDV = window.ASDV || {};

(function SearchModule(ns){
  function ensureTagifyLoaded(){
    return new Promise((resolve) => {
      if (window.Tagify) { resolve(true); return; }
      const cssId = 'tagify-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/@yaireo/tagify/dist/tagify.css';
        document.head.appendChild(link);
      }
      const jsId = 'tagify-js';
      let script = document.getElementById(jsId);
      if (script) {
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        return;
      }
      script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://cdn.jsdelivr.net/npm/@yaireo/tagify';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  ns.initSearch = function({ legendDynamic, ul, items, selectedSet, applyHighlights }){
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';
    const searchInput = document.createElement('input');
    searchInput.id = 'search-comune';
    searchInput.className = 'search-input';
    searchInput.setAttribute('placeholder', 'Cerca un comune...');
    searchInput.setAttribute('aria-label', 'Cerca un comune');
    searchWrap.appendChild(searchInput);
    legendDynamic.appendChild(searchWrap);

    (async () => {
      const ok = await ensureTagifyLoaded();
      const names = Array.from(new Set(items.map(i => i.base)));
      const indexByBase = new Map(items.map(i => [i.base, i]));

      const chooseItem = (base) => {
        const it = indexByBase.get(base);
        if (!it) return;
        const li = Array.from(ul.children).find(node => {
          const lab = node.querySelector('label');
          return lab && lab.textContent.trim() === base;
        }) || Array.from(ul.children).find(node => node.querySelector('label')?.textContent.startsWith(base));
        const cb = li ? li.querySelector('input[type="checkbox"]') : null;
        if (cb) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          selectedSet.add(it.g);
          applyHighlights();
        }
        if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };

      if (ok && window.Tagify) {
        const tagify = new window.Tagify(searchInput, {
          whitelist: names,
          enforceWhitelist: true,
          dropdown: {
            enabled: 1,
            fuzzySearch: true,
            position: 'input',
            appendTarget: document.body,
            placeDropdown: (tagify, dropdownElm) => {
              const rect = tagify.DOM.input.getBoundingClientRect();
              dropdownElm.style.position = 'fixed';
              dropdownElm.style.left = rect.left + 'px';
              dropdownElm.style.top = rect.bottom + 'px';
              dropdownElm.style.width = rect.width + 'px';
            }
          },
          maxTags: 1,
          editTags: false
        });
        tagify.on('add', (e) => {
          const base = e.detail?.data?.value;
          if (base) {
            chooseItem(base);
            setTimeout(() => {
              try {
                tagify.removeAllTags(true);
                tagify.setInputValue('');
                tagify.dropdown.hide();
                tagify.DOM.input.focus();
              } catch (_) { }
            }, 0);
          }
        });
      } else {
        const dl = document.createElement('datalist');
        dl.id = 'dl-comuni';
        names.forEach(n => { const opt = document.createElement('option'); opt.value = n; dl.appendChild(opt); });
        document.body.appendChild(dl);
        searchInput.setAttribute('list', 'dl-comuni');
        searchInput.addEventListener('change', () => {
          chooseItem(searchInput.value);
          searchInput.value = '';
        });
        searchInput.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            chooseItem(searchInput.value);
            searchInput.value = '';
            searchInput.blur();
          }
        });
      }
    })();
  };
})(window.ASDV);

// ===== Hover mappa e province =====
(function () {
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(() => {
    const svgRoot = document.querySelector('svg');
    if (!svgRoot || svgRoot.dataset.asdvHoverBound === '1') return;
    svgRoot.dataset.asdvHoverBound = '1';

    function norm(key) {
      if (!key) return '';
      const k = String(key).trim();
      return k.charAt(0).toUpperCase() + k.slice(1);
    }

    document.querySelectorAll('g.area').forEach(g => {
      if (g.style && g.style.pointerEvents === 'none') g.style.pointerEvents = '';
      g.querySelectorAll('*').forEach(n => {
        if (n.style && n.style.pointerEvents === 'none') n.style.pointerEvents = '';
      });
    });

    const areaNodes = Array.from(document.querySelectorAll('g.area[data-click]'));
    const btnNodes  = Array.from(document.querySelectorAll('.province-list a.btn'));
    if (!areaNodes.length || !btnNodes.length) return;

    areaNodes.forEach(g => {
      g.querySelectorAll('path').forEach(p => {
        try { p.setAttribute('vector-effect', 'non-scaling-stroke'); } catch(_) {}
      });
    });

    const areaByKey = new Map(areaNodes.map(g => [norm(g.dataset.click), g]));
    const btnByKey  = new Map(btnNodes.map(a => [norm(a.dataset.click), a]));

    function highlightFromArea(key, on) {
      const k = norm(key);
      const area = areaByKey.get(k);
      const btn  = btnByKey.get(k);
      if (on) {
        areaByKey.forEach((otherArea, otherKey) => {
          if (otherKey !== k) otherArea.classList.add('is-dimmed');
        });
        if (area) area.classList.add('is-highlighted');
        if (btn)  btn.classList.add('is-hover');
      } else {
        areaByKey.forEach(otherArea => otherArea.classList.remove('is-dimmed', 'is-highlighted'));
        btnByKey.forEach(otherBtn => otherBtn.classList.remove('is-hover'));
      }
    }

    areaByKey.forEach((area, key) => {
      area.addEventListener('mouseenter', () => highlightFromArea(key, true));
      area.addEventListener('mouseleave', () => highlightFromArea(key, false));
      area.setAttribute('tabindex', '0');
      area.addEventListener('focus', () => highlightFromArea(key, true));
      area.addEventListener('blur', () => highlightFromArea(key, false));
    });

    function clearDimming() {
      areaByKey.forEach(area => area.classList.remove('is-dimmed', 'is-highlighted'));
    }
    function highlightFromButton(key, on) {
      const k = norm(key);
      const area = areaByKey.get(k);
      if (on) {
        areaByKey.forEach((otherArea, otherKey) => {
          if (otherKey !== k) otherArea.classList.add('is-dimmed');
        });
        if (area) area.classList.add('is-highlighted');
      } else {
        clearDimming();
      }
    }
    btnByKey.forEach((btn, key) => {
      btn.addEventListener('mouseenter', () => highlightFromButton(key, true));
      btn.addEventListener('mouseleave', () => highlightFromButton(key, false));
      btn.addEventListener('focus',      () => highlightFromButton(key, true));
      btn.addEventListener('blur',       () => highlightFromButton(key, false));
    });

    svgRoot.addEventListener('click', (e) => {
      let node = e.target;
      while (node && node !== svgRoot) {
        const isArea = node.classList && node.classList.contains && node.classList.contains('area');
        const hasData = node.dataset && node.dataset.click;
        if (isArea && hasData) {
          const key = norm(node.dataset.click);
          const btn = btnByKey.get(key);
          if (btn && btn.href) window.location.assign(btn.href);
          return;
        }
        node = node.parentNode || node.parentElement || node.ownerSVGElement;
      }
    }, { passive: true });
  });
})();