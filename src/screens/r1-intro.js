// r1-intro: round card "Course One - Plate Up".
import { introScreen } from './common.js';

export default introScreen({
  id: 'r1-intro', round: 1, eyebrow: 'Course One', title: 'Plate Up',
  rules: 'Two of you answer the same question. The table votes for the better plate.',
  lineKey: 'r1Intro',
});
