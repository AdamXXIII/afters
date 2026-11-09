// Screen registry. ONE FILE PER SCREEN (src/screens/<id>.js). Add new screens here.
import title from './title.js';
import create from './create.js';
import join from './join.js';
import lobby from './lobby.js';
import intro from './intro.js';
import r1Intro from './r1-intro.js';
import r1Write from './r1-write.js';
import r1Wait from './r1-wait.js';
import r1Vote from './r1-vote.js';
import r1Reveal from './r1-reveal.js';
import r1Scores from './r1-scores.js';
import r2Intro from './r2-intro.js';
import r2Write from './r2-write.js';
import r2Wait from './r2-wait.js';
import r2Pick from './r2-pick.js';
import r2Reveal from './r2-reveal.js';
import r2Scores from './r2-scores.js';
import r3Intro from './r3-intro.js';
import r3Write from './r3-write.js';
import r3Swipe from './r3-swipe.js';
import r3Reveal from './r3-reveal.js';
import podium from './podium.js';
import end from './end.js';
import reconnect from './reconnect.js';
import settings from './settings.js';

export const SCREENS = [
  title, create, join, lobby, intro,
  r1Intro, r1Write, r1Wait, r1Vote, r1Reveal, r1Scores,
  r2Intro, r2Write, r2Wait, r2Pick, r2Reveal, r2Scores,
  r3Intro, r3Write, r3Swipe, r3Reveal,
  podium, end,
];

export const OVERLAYS = [reconnect, settings];
