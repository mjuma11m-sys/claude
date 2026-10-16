import {Composition} from 'remotion';
import {Demo, DEMO_TOTAL} from './Demo';
import {Hayati, HAYATI_TOTAL} from './Hayati';
import {FPS} from './kit/theme';

// Add one <Composition> per video (or per soundtrack variant).
export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Demo" component={Demo} durationInFrames={DEMO_TOTAL} fps={FPS} width={1080} height={1920} />
		<Composition id="Hayati" component={Hayati} durationInFrames={HAYATI_TOTAL} fps={FPS} width={1080} height={1920} />
	</>
);
