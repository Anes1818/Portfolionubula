const examples = [
  {id:'pink-promise',title:'Pink Promise',credit:'Fresh flowers · La Flor Eterna',href:'/studio/studio.html?demo=1&flowers=fresh&recipe=pink-promise'},
  {id:'crimson-velvet',title:'Crimson Velvet',credit:'Fresh flowers · La Flor Eterna',href:'/studio/studio.html?demo=1&flowers=fresh&recipe=crimson-velvet'},
  {id:'money-moves',title:'Money Moves',credit:'Satin & money · raysbouquetz',href:'https://nebulastudio.site/shops/raysbouquetz/studio.html?template=money-moves'}
];
const root=document.querySelector('.bouquet-showcase');
if(root){
 const stage=root.querySelector('.showcase-stage'),range=root.querySelector('input'),play=root.querySelector('#showcasePlay');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let active=0,playing=!reduce.matches,visible=true,frame=0,started=0,generation=0;
 function reveal(value){stage.style.setProperty('--reveal',value+'%');range.value=value;range.setAttribute('aria-valuetext',Math.round(value)+'% real bouquet, '+Math.round(100-value)+'% builder design');}
 function controls(){play.textContent=playing?'Pause ⏸':'Play ▶';play.setAttribute('aria-label',playing?'Pause comparison animation':'Play comparison animation');}
 function pause(){playing=false;cancelAnimationFrame(frame);controls();}
 async function choose(index){
  const version=++generation,example=examples[index];
  const images=await Promise.all(['real','design'].map(kind=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src='/assets/showcase/'+example.id+'-'+kind+'.webp';})));
  if(version!==generation||images.some(im=>!im))return;
  active=index;root.querySelector('#showcaseReal').src=images[0].src;root.querySelector('#showcaseReal').alt='Real '+example.title+' bouquet — '+example.credit;
  root.querySelector('#showcaseDesign').src=images[1].src;root.querySelector('#showcaseDesign').alt=example.title+' recreated with the bouquet builder';
  root.querySelector('#showcaseTitle').textContent=example.title;root.querySelector('#showcaseCredit').textContent=example.credit;root.querySelector('#showcaseOpen').href=example.href;
  root.querySelectorAll('[data-example]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.example===index)));
  reveal(playing?100:50);started=0;
 }
 function tick(time){
  if(!playing||!visible||document.hidden)return;
  if(!started)started=time;
  const t=time-started;
  // Hold the real photo, slide to its actual builder render, then hold the result.
  const progress=Math.max(0,Math.min(1,(t-1600)/4200));
  const eased=progress*progress*(3-2*progress);reveal(100*(1-eased));
  if(t>9200){started=time;choose((active+1)%examples.length);}
  frame=requestAnimationFrame(tick);
 }
 function resume(){cancelAnimationFrame(frame);started=0;if(playing&&visible&&!document.hidden)frame=requestAnimationFrame(tick);controls();}
 play.onclick=()=>{playing=!playing;resume();};
 range.addEventListener('input',()=>{pause();reveal(+range.value);});
 range.addEventListener('pointerdown',pause);
 root.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{pause();choose(+b.dataset.example);});
 document.addEventListener('visibilitychange',resume);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();},{threshold:.15}).observe(stage);
 reduce.addEventListener('change',()=>{if(reduce.matches){pause();reveal(50);}});
 controls();reveal(playing?100:50);resume();
}
