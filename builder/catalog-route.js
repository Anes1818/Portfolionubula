/* Keep older shared links working without loading the editor on catalog visits. */
(() => {
  function routeDesign() {
    const params = new URLSearchParams(location.search);
    if (/[#&]b=/.test(location.hash) || params.has('template') || params.has('saved')) {
      location.replace('studio.html' + location.search + location.hash);
    }
  }
  routeDesign();
  addEventListener('hashchange', routeDesign);
})();
