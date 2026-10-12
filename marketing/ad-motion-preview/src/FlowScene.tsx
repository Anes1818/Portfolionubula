import {Bouquet, Shell} from './HookScene';

type FlowProps = {step: 'estimate' | 'request' | 'control'};

export const FlowScene = ({step}: FlowProps) => {
  const title=step==='estimate'?'“How much?”':step==='request'?'Design + details.':'Your eye. Your final quote.';
  const caption=step==='estimate'?'An estimate from your prices.':step==='request'?'A request for your WhatsApp.':'You confirm the arrangement.';
  const shot=step==='estimate'?'REPLACE WITH: actual estimate + item quantities':step==='request'?'REPLACE WITH: review → real WhatsApp draft':'REPLACE WITH: matching design / bouquet sheet';
  return <Shell>
    <Bouquet />
    <div style={{position:'absolute',top:345,left:180,width:720,fontSize:88,fontWeight:900,lineHeight:1.04,letterSpacing:-4}}>{title}</div>
    <div style={{position:'absolute',top:1330,left:180,width:720,padding:'25px 0',background:'#f7f3ea',fontSize:45,fontWeight:800}}>{caption}</div>
    <div style={{position:'absolute',top:1465,left:140,width:800,textAlign:'center',fontSize:26,color:'#6c5b4e'}}>{shot}</div>
  </Shell>;
};
