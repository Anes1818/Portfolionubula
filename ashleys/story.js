/* v9.0 · "A rose's journey" — scroll-told story with a gold progress thread */
(function () {
  var cards = [].slice.call(document.querySelectorAll('.jcard'));
  if (!cards.length) return;
  cards.forEach(function (c, i) { c.style.transitionDelay = (i * 0.13).toFixed(2) + 's'; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    cards.forEach(function (c) { io.observe(c); });
  } else {
    cards.forEach(function (c) { c.classList.add('seen'); });
  }
  var sec = document.getElementById('journey'), prog = document.getElementById('jprog');
  function upd() {
    if (!sec || !prog) return;
    var r = sec.getBoundingClientRect(), vh = window.innerHeight;
    var p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh * 0.4)));
    prog.style.width = (p * 100).toFixed(1) + '%';
  }
  window.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd);
  upd();
})();
