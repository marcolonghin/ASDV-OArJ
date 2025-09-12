// ===== Tooltip: setup e gestione hover =====
window.ASDV = window.ASDV || {};

(function TooltipModule(ns){
  ns.setupTooltip = function(){
    const tooltip = document.getElementById("tooltip") || (() => {
      const el = document.createElement("div");
      el.id = "tooltip";
      el.className = "tooltip";
      el.setAttribute("role", "tooltip");
      el.setAttribute("aria-hidden", "true");
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
      return el;
    })();

    let current = null;

    let _pending = false;
    let _last = { x: 0, y: 0 };
    function positionTooltip(pageX, pageY) {
      const pad = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      const rect = tooltip.getBoundingClientRect();
      const w = rect.width || tooltip.offsetWidth || 0;
      const h = rect.height || tooltip.offsetHeight || 0;

      let left = pageX + pad;
      let top  = pageY + pad;

      const maxLeft = scrollX + vw - w - 4;
      const maxTop  = scrollY + vh - h - 4;
      const minLeft = scrollX + 4;
      const minTop  = scrollY + 4;

      if (left > maxLeft) left = Math.max(minLeft, pageX - w - pad);
      if (top  > maxTop)  top  = Math.max(minTop,  pageY - h - pad);

      tooltip.style.left = left + "px";
      tooltip.style.top  = top  + "px";
    }

    // — Mostra tooltip su elementi con data-tooltip
    document.addEventListener("mouseover", (e) => {
      const el = e.target.closest("[data-tooltip]");
      if (!el) return;
      current = el;
      const raw = el.getAttribute("data-tooltip") || "";
      tooltip.textContent = raw.replace(/\\n/g, "\n");
      tooltip.style.visibility = "visible";
      tooltip.style.opacity = "1";
      tooltip.setAttribute("aria-hidden", "false");
    });

    document.addEventListener("mousemove", (e) => {
      if (!current) return;
      _last.x = e.pageX;
      _last.y = e.pageY;
      if (_pending) return;
      _pending = true;
      requestAnimationFrame(() => {
        _pending = false;
        positionTooltip(_last.x, _last.y);
      });
    });

    // — Nascondi tooltip quando si esce dall'area con data-tooltip
    document.addEventListener("mouseout", (e) => {
      if (!current) return;
      if (!e.relatedTarget || !e.relatedTarget.closest("[data-tooltip]")) {
        current = null;
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
        tooltip.setAttribute("aria-hidden", "true");
      }
    });
  };

})(window.ASDV);

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', () => {
  window.ASDV.setupTooltip && window.ASDV.setupTooltip();
});