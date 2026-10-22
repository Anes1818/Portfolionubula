'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 for(const viewport of [{width:393,height:780},{width:780,height:393}]){
  const p=await b.newPage({viewport,isMobile:true,hasTouch:true});
  if(process.env.NEBULA_SCROLL_LIVE!=='1')await p.route('**/app.css*',r=>r.fulfill({contentType:'text/css',body:fs.readFileSync('shops/la-flor-eterna/app.css','utf8')}));
  await p.goto('https://nebulastudio.site/b/#OBOXn3hvems5W__2IN3tJA');await p.waitForFunction(()=>document.querySelector('#orderSheet')&&!orderSheet.hidden);
  const c=await p.context().newCDPSession(p),x=Math.round(viewport.width/2),start=Math.min(600,viewport.height-35);
  async function swipe(){await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});for(let y=start-20;y>=100;y-=20){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await p.waitForTimeout(15);}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);}
  await swipe();assert.ok(await p.evaluate(()=>scrollY>50),'A finger swipe must scroll the sheet');
  for(let n=0;n<8;n++){if(await p.evaluate(()=>scrollY+innerHeight>=document.documentElement.scrollHeight-3))break;await swipe();}
  assert.ok(await p.evaluate(()=>scrollY+innerHeight>=document.documentElement.scrollHeight-3),'All details must be reachable');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  console.log('PASS touch scroll and bottom reachability '+viewport.width+'x'+viewport.height);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
