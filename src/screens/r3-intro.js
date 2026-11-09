// r3-intro: round card "Last Orders" with the pub bell.
import { introScreen } from './common.js';

export default introScreen({
  id: 'r3-intro', round: 3, eyebrow: 'Course Three', title: 'Last Orders',
  rules: 'One question. Write as many answers as you can. Then swipe to raise a glass.',
  lineKey: 'r3Intro',
  bell: true,
});
