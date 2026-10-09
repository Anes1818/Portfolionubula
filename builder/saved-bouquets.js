/* Explicit local snapshots. No customer database, upload, or cross-device sync. */
(function(g){'use strict';
 const key='nebulaSavedBouquetsV1',limit=20,M=g.NebulaModel;
 function read(){
  const raw=localStorage.getItem(key);if(!raw)return [];
  if(raw.length>2000000)throw Error('invalid');
  const list=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>limit)throw Error('invalid');
  const ids=new Set();
  return list.map(entry=>{
   const design=M.validate(entry?.design);
   if(!entry||typeof entry.id!=='string'||entry.id.length>80||ids.has(entry.id)||!Number.isFinite(entry.savedAt)||!design)throw Error('invalid');
   ids.add(entry.id);return {id:entry.id,savedAt:entry.savedAt,design};
  });
 }
 function save(raw){
  const design=M.validate(raw);if(!design)throw Error('invalid');
  const list=read();if(list.length>=limit)throw Error('full');
  const entry={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),savedAt:Date.now(),design};
  localStorage.setItem(key,JSON.stringify([entry,...list]));return entry;
 }
 function remove(id){const list=read();localStorage.setItem(key,JSON.stringify(list.filter(entry=>entry.id!==id)));}
 g.NebulaSaved={read,save,remove,limit};
})(window);
