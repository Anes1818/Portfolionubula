/* Pure local mocks: no Square connection, no real links, no payments. */
const assert=require('node:assert/strict');
(async()=>{
 const {createSquarePaymentLinks}=await import('../../cloudflare/rays-payments/square-payment-links.mjs');
 let q,calls=[],locked=false;
 const repo={async withLock(id,fn){assert.equal(locked,false);locked=true;try{return await fn();}finally{locked=false;}},async get(){return structuredClone(q);},async save(id,value){q=structuredClone(value);}};
 const initial=()=>({shop:'raysbouquetz',status:'approved',revision:2,currency:'CAD',totalCents:20443,paidCents:0,expiresAt:Date.now()+100000,includesCashValue:false});
 const env={PAYMENTS_ENABLED:true,SQUARE_ACCESS_TOKEN:'local-test-only',SQUARE_LOCATION_ID:'local-test-location',SQUARE_SANDBOX:true};
 const service=createSquarePaymentLinks({repository:repo,env,fetchImpl:async(url,request)=>{calls.push({url,body:JSON.parse(request.body)});return {ok:true,json:async()=>({payment_link:{id:'mock-link',order_id:'mock-order',url:'https://sandbox.square.link/u/MOCK'}})};}});
 q=initial();let r=await service({quoteId:'preview_1',revision:2,choice:'deposit',totalCents:1});assert.equal(r.dueCents,10222);assert.equal(r.balanceCents,10221);assert.equal(calls[0].body.quick_pay.price_money.amount,10222);assert.equal(calls[0].body.quick_pay.price_money.currency,'CAD');assert.ok(calls[0].url.startsWith('https://connect.squareupsandbox.com'));
 await service({quoteId:'preview_1',revision:2,choice:'deposit'});assert.equal(calls.length,1,'Repeat requests reuse the stored pending link');
 await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'full'}),/Cancel/);
 q.paymentRequest.status='cancelled';await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'deposit'}),/Cancel/);
 q=initial();delete q.includesCashValue;await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'full'}),/approved/);
 q=initial();await assert.rejects(()=>service({quoteId:'preview_1',revision:0,choice:'full'}),/Invalid/);
 q=initial();q.paidCents=5000;r=await service({quoteId:'preview_1',revision:2,choice:'full'});assert.equal(r.dueCents,15443);assert.equal(r.balanceCents,0);
 q=initial();await assert.rejects(()=>service({quoteId:'preview_1',revision:1,choice:'full'}),/approved/);
 q.status='draft';await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'full'}),/approved/);
 q=initial();q.includesCashValue=true;await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'full'}),/eligibility/);
 q=initial();q.expiresAt=1;await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'full'}),/approved/);
 env.PAYMENTS_ENABLED=false;await assert.rejects(()=>service({quoteId:'preview_1',revision:2,choice:'full'}),/not connected/);
 console.log('PASS dynamic CAD payment amounts, half-cent rounding, balances, server quote authority, idempotent retries, stale/draft quote rejection, replacement and activation gates. No real payment links created.');
})().catch(e=>{console.error(e);process.exitCode=1;});
