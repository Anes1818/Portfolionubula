/* Keep the public demo on the latest isolated runtime; preserve older design links and enforce VIP invite gate. */
(()=>{
 if(!/^https?:$/.test(location.protocol)||!/^\/builder(?:\/|$)/.test(location.pathname))return;
 const h=(location.hostname||'').toLowerCase(),local=h==='localhost'||h==='127.0.0.1'||h==='[::1]'||h.endsWith('.localhost');
 const q=new URLSearchParams(location.search);
 let vip=q.get('vip')==='nebula'||q.get('vip')==='1'||q.get('access')==='nebula';
 if(vip){try{sessionStorage.setItem('nebula_vip','1');localStorage.setItem('nebula_vip','1');}catch{}}
 else{try{vip=sessionStorage.getItem('nebula_vip')==='1'||localStorage.getItem('nebula_vip')==='1';}catch{}}
 if((!local||q.get('test_gate')==='1')&&!vip){location.replace('/shop-setup.html');return;}
 const file=location.pathname.endsWith('studio.html')?'studio.html':location.pathname.endsWith('order.html')?'order.html':'index.html';
 location.replace('/demo/nebula-builder/'+file+location.search+location.hash);
})();
