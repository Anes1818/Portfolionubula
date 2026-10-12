import {Composition, Folder, Series, useVideoConfig} from 'remotion';
import {HookScene, HookProps} from './HookScene';
import {FlowScene} from './FlowScene';
import {EndScene} from './EndScene';

export const AdStoryboard = ({hook}: HookProps) => {
  const {fps}=useVideoConfig();
  return <Series>
    <Series.Sequence name="Question + immediate edit" durationInFrames={5*fps} premountFor={fps}><HookScene hook={hook}/></Series.Sequence>
    <Series.Sequence name="Actual estimate shot" durationInFrames={3*fps} premountFor={fps}><FlowScene step="estimate"/></Series.Sequence>
    <Series.Sequence name="WhatsApp preparation" durationInFrames={4*fps} premountFor={fps}><FlowScene step="request"/></Series.Sequence>
    <Series.Sequence name="Florist confirms" durationInFrames={4*fps} premountFor={fps}><FlowScene step="control"/></Series.Sequence>
    <Series.Sequence name="Comment FLOWER" durationInFrames={4*fps} premountFor={fps}><EndScene/></Series.Sequence>
  </Series>;
};

export const MyComposition = () => <>
  <Composition id="A-MoreRed" component={AdStoryboard} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={{hook:'question'}}/>
  <Composition id="B-PriceQuestion" component={AdStoryboard} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={{hook:'price'}}/>
  <Composition id="C-FinalSay" component={AdStoryboard} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={{hook:'control'}}/>
  <Folder name="Scenes">
    <Composition id="Hook" component={HookScene} durationInFrames={150} fps={30} width={1080} height={1920} defaultProps={{hook:'question'}}/>
    <Composition id="Estimate" component={FlowScene} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={{step:'estimate'}}/>
    <Composition id="Request" component={FlowScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{step:'request'}}/>
    <Composition id="FloristReview" component={FlowScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{step:'control'}}/>
    <Composition id="EndCard" component={EndScene} durationInFrames={120} fps={30} width={1080} height={1920}/>
  </Folder>
</>;
