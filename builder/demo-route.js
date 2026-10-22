/* Keep the public demo on the latest isolated runtime; preserve older design links. */
(()=>{if(/^https?:$/.test(location.protocol)&&/^\/builder(?:\/|$)/.test(location.pathname)){const file=location.pathname.endsWith('studio.html')?'studio.html':location.pathname.endsWith('order.html')?'order.html':'index.html';location.replace('/demo/nebula-builder/'+file+location.search+location.hash);}})();
