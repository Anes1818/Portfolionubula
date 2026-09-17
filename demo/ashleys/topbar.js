/* topbar.js — keeps the delivery notice and the main nav pinned to the top.
   Both bars live inside one sticky stack so they stay visible while scrolling.
   events.js reuses the same #evTopStack for the event strip. */
(function () {
  var annc = document.getElementById('annc');
  var nav = document.getElementById('nav');
  if (!annc && !nav) return;

  var stack = document.getElementById('evTopStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'evTopStack';
    var first = annc || nav;
    first.parentNode.insertBefore(stack, first);
  }
  if (annc) stack.appendChild(annc);
  if (nav) stack.appendChild(nav);

  var stuck = false;
  function onScroll() {
    var s = window.pageYOffset > 4;
    if (s !== stuck) { stuck = s; stack.classList.toggle('is-stuck', s); }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();
