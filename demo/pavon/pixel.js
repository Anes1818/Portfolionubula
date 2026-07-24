/* ===== Flowers Pavon pixel engine + live effects ===== */
(function(){
'use strict';
var PAL={r:'#c9556f',R:'#e2919f',p:'#eeb7c5',P:'#f6d5dd',g:'#3c5934',l:'#7ea065',y:'#e9b93c',Y:'#f6d878',o:'#c96f4a',b:'#8a6440',B:'#c89b62',w:'#f7f3e8',W:'#ffffff',v:'#9b7fb8',c:'#7fb3c9',k:'#33312a',s:'#a9bb97'};
var SPR={
rose:['............','...rrrr.....','..rRRrrr....','..rRrrrr....','..rrrrrr....','...rrrr.....','.....g......','..l..g......','...l.g......','..llg.......','....g.......','....g.......'],
rose2:['............','...ppPp.....','..pPPppp....','..pppppp....','...pppp.....','.....g......','.....g......','..l..g......','...llg......','.....g......','.....g......','............'],
tulip:['............','...p.pp.....','...pppp.....','...pppp.....','....pp......','.....g......','.....g......','..l..g......','...llg......','.....g......','.....g......','............'],
tulip2:['............','...v.vv.....','...vvvv.....','...vvvv.....','....vv......','.....g......','.....g......','..l..g......','...llg......','.....g......','.....g......','............'],
daisy:['............','....W.......','..W.y.W.....','...WyW......','..WyyyW.....','...WyW......','..W.y.W.....','....g.......','....g.......','..l.g.......','...lg.......','....g.......'],
sun:['............','..y.yy.y....','...yyyy.....','..yyooyy....','..yoooyy....','..yyooyy....','...yyyy.....','..y.yy.y....','.....g......','.....g......','...l.g......','.....g......'],
lily:['............','....W.......','..W.W.W.....','...WWW......','..W.W.W.....','....W.......','.....g......','.....g......','..l..g......','...llg......','.....g......','............'],
sprout:['............','............','...ll.......','..ll.gg.....','...l.gg.....','....gg......','....g.......','...gg.......','....g.......','..bbbbb.....','...bbb......','............'],
heart:['............','.rr...rr....','rrrr.rrrr...','rRrrrrrrr...','rrrrrrrrr...','.rrrrrrr....','..rrrrr.....','...rrr......','....r.......','............','............','............'],
cake:['..y..y..y...','..w..w..w...','.pppppppppp.','.pPpPpPpPpP.','.pppppppppp.','.BBBBBBBBBB.','.BpBpBpBpBB.','.BBBBBBBBBB.','............','............','............','............'],
star:['............','.....y......','.....y......','...yyYyy....','....yYy.....','...y.y.y....','............','............','............','............','............','............']
};
function drawSprite(cv,name){
  var rows=SPR[name]; if(!rows)return;
  var n=rows.length, ctx=cv.getContext('2d');
  cv.width=n; cv.height=n; ctx.clearRect(0,0,n,n);
  for(var y=0;y<n;y++){var row=rows[y];for(var x=0;x<row.length;x++){var ch=row[x];if(ch!=='.'&&PAL[ch]){ctx.fillStyle=PAL[ch];ctx.fillRect(x,y,1,1);}}}
}
var EMO={rose:'🌹',rose2:'🌸',tulip:'🌷',tulip2:'🪻',daisy:'🌼',sun:'🌻',lily:'🤍',sprout:'🌱',heart:'❤️',cake:'🎂',star:'✨'};
document.querySelectorAll('canvas[data-px]').forEach(function(c){if(c.closest('#garden')){drawSprite(c,c.dataset.px);return;}var s=document.createElement('span');s.className='ic';s.setAttribute('data-px',c.dataset.px);s.textContent=EMO[c.dataset.px]||'🌸';if(c.className)s.className+=' '+c.className;c.replaceWith(s);});

/* ---- pixel bouquet placeholders (until real photos arrive) ---- */
var SEEDS={1:['y','o','p','c','y'],2:['r','r','R','r','w'],3:['p','P','w','v','P'],4:['W','w','W','w','W'],5:['y','Y','W','y','Y'],6:['o','B','o','s','B'],7:['p','v','W','y','c'],8:['s','W','l','w','s']};
function pixelBouquet(seed){
  var cv=document.createElement('canvas'); cv.width=26; cv.height=30;
  var x=cv.getContext('2d');
  function px(c,X,Y,w,h){x.fillStyle=PAL[c]||c;x.fillRect(X,Y,w||1,h||1);}
  for(var i=0;i<11;i++){var w=16-i;px('B',5+Math.floor(i*0.55),13+i,w>4?w:4,1);}
  px('b',5,13,16,1); px('b',10,24,5,1);
  px('p',9,19,7,2); px('P',11,19,2,2);
  px('l',4,10,2,2);px('l',20,9,2,2);px('g',6,7,2,2);px('g',18,6,2,2);px('l',12,3,2,2);
  var cols=SEEDS[seed]||SEEDS[1];
  var pos=[[7,7],[12,5],[17,7],[9,10],[15,10]];
  for(var f=0;f<pos.length;f++){var c=cols[f%cols.length],X=pos[f][0],Y=pos[f][1];
    px(c,X-1,Y,3,1);px(c,X,Y-1,1,3);px(c,X-1,Y-1,1,1);px(c,X+1,Y-1,1,1);px(c,X-1,Y+1,1,1);px(c,X+1,Y+1,1,1);px('W',X,Y,1,1);}
  return cv;
}
window.pixelBouquetPub=pixelBouquet;
document.querySelectorAll("img[data-pxseed]").forEach(function(im){
  im.addEventListener('error',function(){
    var cv=pixelBouquet(parseInt(im.dataset.pxseed,10));
    cv.className=im.className; im.replaceWith(cv);
  });
});

/* ---- anatomy diagram ---- */
(function(){
  var cv=document.getElementById('anaCv'); if(!cv)return;
  var x=cv.getContext('2d');
  function px(c,X,Y,w,h){x.fillStyle=PAL[c]||c;x.fillRect(X,Y,w||1,h||1);}
  for(var i=0;i<12;i++){var w=18-i;px('B',4+Math.floor(i*0.6),15+i,w>4?w:4,1);}
  px('b',4,15,18,1);
  px('p',9,21,8,2);px('P',12,21,2,2);
  px('s',3,10,3,3);px('s',20,9,3,3);px('l',5,5,2,3);px('l',19,4,2,3);
  px('p',7,11,3,3);px('p',16,12,3,3);px('P',12,2,2,2);
  var pos=[[8,7],[13,6],[18,8],[11,11],[15,10]];
  var cols=['r','R','r','o','r'];
  for(var f=0;f<pos.length;f++){var c=cols[f],X=pos[f][0],Y=pos[f][1];
    px(c,X-1,Y,3,1);px(c,X,Y-1,1,3);px('W',X,Y,1,1);}
})();

/* ---- WhatsApp links ---- */
var WA='17039534542'; /* Flowers Pavon WhatsApp */
document.querySelectorAll('[data-wa]').forEach(function(a){a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(a.dataset.wa);a.target='_blank';a.rel='noopener';});

/* ---- cutoff countdown ---- */
(function(){
  var el=document.getElementById('cutoff'); if(!el)return;
  var now=new Date(), cut=new Date(now); cut.setHours(13,0,0,0);
  if(now<cut){var ms=cut-now,h=Math.floor(ms/36e5),mn=Math.floor(ms%36e5/6e4);
    el.innerHTML='ORDER IN <b>'+(h?h+'H ':'')+mn+'M</b> FOR SAME-DAY DELIVERY';}
  else el.innerHTML='ORDER NOW · DELIVERED <b>TOMORROW MORNING</b>';
})();

/* ---- pixel petal rain (hero) ---- */
(function(){
  var cv=document.getElementById('petals'); if(!cv)return;
  var ctx=cv.getContext('2d');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS=['#eeb7c5','#f6d5dd','#e2919f','#a9bb97','#f6d878'];
  var W,H,ps=[];
  function size(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}
  size(); window.addEventListener('resize',size);
  for(var i=0;i<34;i++)ps.push({x:Math.random(),y:Math.random(),s:4+Math.floor(Math.random()*3)*3,v:.0005+Math.random()*.0009,w:Math.random()*6,c:COLORS[i%5]});
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<ps.length;i++){var p=ps[i];
      p.y+=p.v*(reduce?0.25:1); p.w+=.01;
      if(p.y>1.04){p.y=-.04;p.x=Math.random();}
      var gx=Math.floor((p.x*W+Math.sin(p.w)*24)/6)*6, gy=Math.floor(p.y*H/6)*6;
      ctx.fillStyle=p.c; ctx.globalAlpha=.75; ctx.fillRect(gx,gy,p.s,p.s);
    }
    ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---- sparkle cursor trail (disabled — elegant look) ---- */
(function(){
  return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!window.matchMedia('(pointer: fine)').matches)return;
  var last=0, COLORS=['#e2919f','#c9a24b','#a9bb97'];
  window.addEventListener('pointermove',function(e){
    var now=Date.now(); if(now-last<90)return; last=now;
    var s=document.createElement('div'); s.className='spark';
    s.style.left=(e.clientX+6)+'px'; s.style.top=(e.clientY+8)+'px';
    s.style.background=COLORS[Math.floor(Math.random()*3)];
    document.body.appendChild(s);
    setTimeout(function(){s.remove();},750);
  });
})();

/* ---- pixel garden: bloom in view, fold away out of view ---- */
(function(){
  var g=document.getElementById('garden'); if(!g)return;
  var flowers=Array.prototype.slice.call(g.querySelectorAll('canvas'));
  function stagger(growing){
    flowers.forEach(function(c,i){
      var n=growing?i:(flowers.length-1-i);
      c.style.transitionDelay=(n*0.075)+'s';
    });
  }
  if(!('IntersectionObserver' in window)){
    stagger(true);g.classList.add('grown');return;
  }
  new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      stagger(entry.isIntersecting);
      g.classList.toggle('grown',entry.isIntersecting);
    });
  },{threshold:.32,rootMargin:'0px 0px -5% 0px'}).observe(g);
})();

/* ---- scroll reveal ---- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.1});
document.querySelectorAll('.rv').forEach(function(el){io.observe(el);});

/* ---- occasion filter ---- */
function applyFilter(f){
  document.querySelectorAll('.fbtn').forEach(function(b){b.classList.toggle('on',b.dataset.f===f);});
  document.querySelectorAll('.bq').forEach(function(b){
    var show=f==='all'||(b.dataset.occ||'').split(' ').indexOf(f)>=0;
    b.classList.toggle('hide',!show);
  });
}
document.querySelectorAll('.fbtn').forEach(function(b){b.addEventListener('click',function(){applyFilter(b.dataset.f);});});
document.querySelectorAll('.chip[data-go]').forEach(function(ch){ch.addEventListener('click',function(){
  applyFilter(ch.dataset.go);
  document.getElementById('catalog').scrollIntoView({behavior:'smooth'});
});});
})();

/* ---- hero 3D flower photo ring ---- */
(function(){
  var host=document.getElementById('heroRingIn'); if(!host)return;
  var FLOWERS=['rose_pink','tulip_yellow','rose_red','gerbera_daisy','tulip_violet','lily','ranunculus','rose_white','carnation_pink','rose_yellow','tulip_pink','rose_violet'];
  var BGS=['linear-gradient(160deg,#fbe9ee,#fdf8ef)','linear-gradient(160deg,#eef3e4,#fdf8ef)','linear-gradient(160deg,#fdf3e3,#fdf8ef)','linear-gradient(160deg,#e9f0f2,#fdf8ef)'];
  host.style.setProperty('--n',FLOWERS.length);
  FLOWERS.forEach(function(name,i){
    var im=document.createElement('img');
    im.className='card fcard';
    im.alt=name.replace('_',' ');
    im.src='assets/build/'+name+'.png';
    im.style.setProperty('--i',i);
    im.style.background=BGS[i%4];
    host.appendChild(im);
  });
})();

/* ---- hero pixelate-lens (studio polaroids of our bouquets) ---- */
(function(){
  var cv=document.getElementById('heroFx'); if(!cv)return;
  var hero=document.getElementById('hero');
  var ctx=cv.getContext('2d');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* edges only: greenery tucked behind tilted polaroids; center stays clear for the headline */
  var phone=(hero.clientWidth||window.innerWidth)<=640;
  /* phones get the same lens + polaroids, scaled to fit the narrow hero */
  var ITEMS=phone?[
    {src:'assets/build/eucalyptus.png',t:'stem',x:.30,h:.28},
    {src:'assets/build/babys_breath.png',t:'stem',x:.70,h:.28},
    {src:'assets/bouquets/b2.jpg',t:'card',x:.14,h:.32,r:-6,c:'AMOR INFINITO · $550'},
    {src:'assets/bouquets/b1.jpg',t:'card',x:.86,h:.32,r:6,c:'RAMO #9 · $200'}
  ]:[
    {src:'assets/build/eucalyptus.png',t:'stem',x:.17,h:.52},
    {src:'assets/build/alstroemeria.png',t:'stem',x:.30,h:.40},
    {src:'assets/build/limonium.png',t:'stem',x:.70,h:.40},
    {src:'assets/build/babys_breath.png',t:'stem',x:.83,h:.52},
    {src:'assets/bouquets/b2.jpg',t:'card',x:.095,h:.56,r:-6,c:'AMOR INFINITO · $550'},
    {src:'assets/bouquets/b5.jpg',t:'card',x:.195,h:.40,r:4,c:'ENCANTO ROSADO · $160'},
    {src:'assets/bouquets/b3.jpg',t:'card',x:.805,h:.40,r:-4,c:'SUNFLOWERS · $210'},
    {src:'assets/bouquets/b1.jpg',t:'card',x:.905,h:.56,r:6,c:'RAMO #9 · $200'}
  ];
  ITEMS.forEach(function(s){
    s.img=new Image();
    s.img.onload=function(){paint();};
    s.img.src=s.src;
  });
  var base=document.createElement('canvas'), bctx=base.getContext('2d');
  var W=0,H=0,BS=phone?48:68,boxes=[];
  var m={x:0,y:0,tx:0,ty:0}, t=0, lastMove=0;
  function paint(){
    bctx.clearRect(0,0,W,H);
    ITEMS.forEach(function(s){
      if(!s.img.complete||!s.img.naturalWidth)return;
      var ih=H*s.h;
      if(s.t==='stem'){
        var iw=ih*s.img.naturalWidth/s.img.naturalHeight;
        bctx.drawImage(s.img, s.x*W-iw/2, H*1.0-ih, iw, ih);
        return;
      }
      /* polaroid card */
      var fw=ih*.68, cx=s.x*W, cy=H*.99-ih/2;
      bctx.save();
      bctx.translate(cx,cy); bctx.rotate(s.r*Math.PI/180);
      bctx.shadowColor='rgba(51,49,42,.22)'; bctx.shadowBlur=22; bctx.shadowOffsetY=12;
      bctx.fillStyle='#fffdf6'; bctx.fillRect(-fw/2,-ih/2,fw,ih);
      bctx.shadowColor='transparent'; bctx.shadowBlur=0; bctx.shadowOffsetY=0;
      bctx.strokeStyle='rgba(51,49,42,.32)'; bctx.lineWidth=1.5; bctx.strokeRect(-fw/2,-ih/2,fw,ih);
      var pad=fw*.06, capH=fw*.17;
      bctx.drawImage(s.img, -fw/2+pad, -ih/2+pad, fw-2*pad, ih-2*pad-capH);
      bctx.fillStyle='#6b675c';
      bctx.font='600 '+Math.max(10,Math.round(fw*.06))+'px Georgia, serif';
      bctx.textAlign='center';
      bctx.fillText(s.c, 0, ih/2-capH/2+4);
      /* washi tape */
      bctx.rotate(-.05);
      bctx.fillStyle='rgba(238,183,197,.8)';
      bctx.fillRect(-fw*.13,-ih/2-7,fw*.26,15);
      bctx.restore();
    });
  }
  function size(){
    W=cv.width=base.width=hero.clientWidth||window.innerWidth;
    H=cv.height=base.height=hero.clientHeight||600;
    m.x=m.tx=W*.5; m.y=m.ty=H*.5;
    boxes=[];
    for(var x=0;x<=W;x+=BS)for(var y=0;y<=H;y+=BS)boxes.push({x:x,y:y});
    paint();
  }
  size(); window.addEventListener('resize',size);
  hero.addEventListener('pointermove',function(e){
    var r=cv.getBoundingClientRect();
    m.tx=e.clientX-r.left; m.ty=e.clientY-r.top; lastMove=Date.now();
  });
  function frame(){
    t+=.006;
    if(Date.now()-lastMove>2600){
      m.tx=W*.5+Math.cos(t)*W*.38; m.ty=H*.6+Math.sin(t*2)*H*.18;
    }
    var k=reduce?.025:.09;
    m.x+=(m.tx-m.x)*k; m.y+=(m.ty-m.y)*k;
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(base,0,0);
    ctx.fillStyle='rgba(226,145,159,.5)';
    for(var i=0;i<boxes.length;i++){var b=boxes[i];
      var d=Math.hypot(b.x-m.x,b.y-m.y);
      var s=1-Math.min(1,Math.max(0,d/(W*.30)));
      if(s<.004)continue;
      var bs=BS*s;
      ctx.drawImage(base,b.x+bs/2,b.y+bs/2,Math.max(1,BS-bs),Math.max(1,BS-bs),b.x,b.y,BS,BS);
      ctx.beginPath();ctx.arc(b.x,b.y,BS*.13*s,0,6.2832);ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  frame();
})();
