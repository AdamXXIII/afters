// Shared helpers for game modules. Import what you need:
//   sensors.js      tilt (forehead nod), motion permission, vibrate, landscape lock      (browser)
//   drawing.js      drawPad UI, drawingView replay                                        (browser)
//   drawing-data.js encode/decode/validate drawings, replay timing, renderDrawing         (Node-safe: host logic)
export * from './sensors.js';
export * from './drawing.js';
