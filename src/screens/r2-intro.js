// r2-intro: round card "Course Two - Porkies".
import { introScreen } from './common.js';

export default introScreen({
  id: 'r2-intro', round: 2, eyebrow: 'Course Two', title: 'Porkies',
  rules: 'Every fact is true. Fill the gap with a believable lie, then find the real answer.',
  lineKey: 'r2Intro',
});
