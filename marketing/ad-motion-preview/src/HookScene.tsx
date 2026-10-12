import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type HookProps = {hook: 'question' | 'price' | 'control'};

export const Bouquet = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <div style={{position:'absolute',left:90,top:650,width:900,height:730,overflow:'hidden',borderRadius:34}}>
    <Img src={staticFile('forever-my-boo.png')} style={{position:'absolute',width:1250,height:1250,left:-175,top:-185,scale:interpolate(frame,[0,5*fps],[1,1.04],{extrapolateRight:'clamp',extrapolateLeft:'clamp'})}} />
  </div>;
};

export const Shell = ({children}: {children: React.ReactNode}) => <AbsoluteFill style={{background:'#f7f3ea',color:'#1c201c',fontFamily:'Arial, sans-serif'}}>
  <div style={{position:'absolute',top:240,left:180,fontSize:32,fontWeight:800,letterSpacing:4,color:'#725948'}}>NEBULA / FOR FLORISTS</div>
  {children}
  <div style={{position:'absolute',top:1580,left:180,width:720,fontSize:28,color:'#675a52',textAlign:'center'}}>STORYBOARD · STILL IMAGE · RECORDING PENDING</div>
</AbsoluteFill>;

export const HookScene = ({hook}: HookProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const question = frame < 2*fps ? '“More red?”' : '“Keep the ghosts?”';
  return <Shell>
    <Bouquet />
    <div style={{position:'absolute',top:340,left:180,width:720,fontSize:hook==='control'?76:hook==='price'?80:92,fontWeight:900,lineHeight:1.04,letterSpacing:-4}}>
      {hook==='question'?question:hook==='price'?'Another “how much?” DM?':'They try the idea. You keep the final say.'}
    </div>
    <div style={{position:'absolute',top:610,left:180,fontSize:30,color:'#65554c'}}>Example request · actual builder export</div>
    <div style={{position:'absolute',top:1400,left:180,width:720,fontSize:45,fontWeight:800,color:'#7f302b',opacity:interpolate(frame,[3*fps,3.25*fps],[0,1],{extrapolateRight:'clamp',extrapolateLeft:'clamp'})}}>Let them try the idea.</div>
  </Shell>;
};
