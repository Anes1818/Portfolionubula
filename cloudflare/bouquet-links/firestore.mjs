import {Buffer} from 'node:buffer';
const encode=v=>{if(v===null)return {nullValue:null};if(typeof v==='string')return {stringValue:v};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};throw Error('Unsupported database value');};
const decode=v=>'stringValue'in v?v.stringValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'booleanValue'in v?v.booleanValue:'timestampValue'in v?Date.parse(v.timestampValue):null;
let cachedToken;
export function createFirestore(env,fetcher=fetch){
 const project=env.FIREBASE_PROJECT_ID;
 if(!/^[a-z][a-z0-9-]{4,62}$/.test(project||''))throw Error('Missing project configuration');
 const root=`projects/${project}/databases/(default)/documents`,base='https://firestore.googleapis.com/v1/'+root;
 async function accessToken(){
  const account=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT||'{}');
  if(account.project_id!==project||!account.client_email||!account.private_key)throw Error('Missing server credentials');
  if(cachedToken?.identity===env.FIREBASE_SERVICE_ACCOUNT&&cachedToken.until>Date.now())return cachedToken.token;
  const now=Math.floor(Date.now()/1000),b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const input=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const pem=account.private_key.replace(/-----[^-]+-----|\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Buffer.from(pem,'base64'),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(input));
  const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+Buffer.from(signature).toString('base64url')}),signal:AbortSignal.timeout(5000)});
  const data=await response.json();if(!response.ok||!data.access_token)throw Error('Server authentication failed');
  cachedToken={identity:env.FIREBASE_SERVICE_ACCOUNT,token:data.access_token,until:Date.now()+(Math.min(data.expires_in||3600,3600)-120)*1000};return data.access_token;
 }
 async function api(suffix,body,missing=false){
  const response=await fetcher(base+suffix,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
  if(missing&&response.status===404)return null;
  const data=await response.json();if(!response.ok){const e=Error('Database operation failed');e.retryable=data.error?.status==='ABORTED';throw e;}return data;
 }
 const prefix='nebulaShops/la-flor-eterna/';
 const get=async(path,transaction)=>{const data=await api('/'+prefix+path+(transaction?'?transaction='+encodeURIComponent(transaction):''),undefined,true);return data?Object.fromEntries(Object.entries(data.fields||{}).map(([k,v])=>[k,decode(v)])):null;};
 return {get,atomic:async fn=>{
  for(let attempt=0;attempt<3;attempt++){
   const {transaction}=await api(':beginTransaction',{});const writes=[];
   try{const value=await fn({get:path=>get(path,transaction),set:(path,data)=>writes.push({update:{name:root+'/'+prefix+path,fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]))}})});
    await api(':commit',{transaction,writes});return value;
   }catch(e){await api(':rollback',{transaction}).catch(()=>{});if(!e.retryable||attempt===2)throw e;}
  }
 }};
}
