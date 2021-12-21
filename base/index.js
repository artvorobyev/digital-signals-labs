const { Canvas, Image, ImageData } = require('canvas');
const { JSDOM } = require('jsdom');
const { writeFileSync } = require('fs');
const { createCanvas } = require('canvas');

function loadOpenCV() {
  if (
    global.Module &&
    global.Module.onRuntimeInitialized &&
    global.cv &&
    global.cv.imread
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    installDOM();
    global.Module = {
      onRuntimeInitialized() {
        resolve();
      },
    };
    global.cv = require('./opencv.js');
  });
}
function installDOM() {
  const dom = new JSDOM();
  global.document = dom.window.document;
  global.Image = Image;
  global.HTMLCanvasElement = Canvas;
  global.ImageData = ImageData;
  global.HTMLImageElement = Image;
}
function outputImage(matrix, name) {
  const canvas = createCanvas(matrix.cols, matrix.rows);
  cv.imshow(canvas, matrix);
  writeFileSync(`output-${name}.png`, canvas.toBuffer('image/png'));
}

module.exports = { loadOpenCV, outputImage };
