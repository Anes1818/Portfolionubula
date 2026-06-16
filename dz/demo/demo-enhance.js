/* DEMO ENHANCE — draggable floating cart, image fallback, demo banner */
(function(){
  "use strict";
  function ready(fn){ if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  // Image fallback: if a live-site .png/.jpg fails, retry as .webp (and vice versa)
  document.addEventListener("error", function(e){
    var t = e.target;
    if (!t || t.tagName !== "IMG" || t.dataset.fallbackTried) return;
    var s = t.getAttribute("src") || "";
    if (!/robustedz\.store/i.test(s)) return;
    t.dataset.fallbackTried = "1";
    if (/\.(png|jpe?g)$/i.test(s)) t.src = s.replace(/\.(png|jpe?g)$/i, ".webp");
    else if (/\.webp$/i.test(s)) t.src = s.replace(/\.webp$/i, ".jpg");
  }, true);

  ready(function(){
    var cart = document.getElementById("floatingCart");
    if (cart) {
      try {
        var pos = JSON.parse(localStorage.getItem("cartPos") || "null");
        if (pos && pos.left) { cart.style.left = pos.left; cart.style.top = pos.top; cart.style.right = "auto"; cart.style.bottom = "auto"; }
      } catch (e) {}
      var dragging = false, moved = false, sx, sy, ox, oy;
      var handle = cart.querySelector("#dragCartBtn") || cart;
      function down(x, y){ dragging = true; moved = false; var r = cart.getBoundingClientRect(); ox = r.left; oy = r.top; sx = x; sy = y; cart.classList.add("dragging"); }
      function move(x, y){ if (!dragging) return; var dx = x - sx, dy = y - sy; if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true; var nl = Math.min(Math.max(0, ox + dx), window.innerWidth - cart.offsetWidth); var nt = Math.min(Math.max(0, oy + dy), window.innerHeight - cart.offsetHeight); cart.style.left = nl + "px"; cart.style.top = nt + "px"; cart.style.right = "auto"; cart.style.bottom = "auto"; }
      function up(){ if (!dragging) return; dragging = false; cart.classList.remove("dragging"); try { localStorage.setItem("cartPos", JSON.stringify({ left: cart.style.left, top: cart.style.top })); } catch (e) {} }
      handle.addEventListener("mousedown", function(e){ down(e.clientX, e.clientY); e.preventDefault(); });
      document.addEventListener("mousemove", function(e){ move(e.clientX, e.clientY); });
      document.addEventListener("mouseup", up);
      handle.addEventListener("touchstart", function(e){ var t = e.touches[0]; down(t.clientX, t.clientY); }, { passive: true });
      document.addEventListener("touchmove", function(e){ if (dragging) { var t = e.touches[0]; move(t.clientX, t.clientY); e.preventDefault(); } }, { passive: false });
      document.addEventListener("touchend", up);
      // swallow the click that would open the cart if we were actually dragging
      handle.addEventListener("click", function(e){ if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    }

    if (!document.getElementById("demoBanner")) {
      var b = document.createElement("div");
      b.id = "demoBanner";
      b.innerHTML = "\uD83D\uDD0E \u0646\u0633\u062E\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 (DEMO)";
      document.body.appendChild(b);
    }
  });
})();
