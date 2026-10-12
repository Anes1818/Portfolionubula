import {Shell, Bouquet} from './HookScene';

export const EndScene = () => <Shell>
  <Bouquet />
  <div style={{position:'absolute',top:360,left:180,width:720,fontSize:80,fontWeight:900,lineHeight:1,letterSpacing:-3}}>Try it from your customer’s side.</div>
  <div style={{position:'absolute',top:1130,left:180,width:720,padding:'34px 36px',boxSizing:'border-box',background:'#79302b',borderRadius:24,color:'#fff9ef'}}>
    <div style={{fontSize:44,fontWeight:700}}>Comment</div>
    <div style={{fontSize:105,fontWeight:900,letterSpacing:-4}}>FLOWER</div>
    <div style={{fontSize:35,marginTop:12}}>for the builder demo link.</div>
  </div>
  <div style={{position:'absolute',top:1460,left:180,width:720,fontSize:34,fontWeight:700,textAlign:'center'}}>Your shop link: $29/month</div>
</Shell>;
