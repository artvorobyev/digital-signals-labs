const { createCanvas, loadImage } = require('canvas');
const { writeFileSync } = require('fs');
const path = require('path');
const { loadOpenCV } = require('../base');

const COEFF_MATRIX_3 = [
  [0.5, 0.75, 0.5],
  [0.75, 1, 0.75],
  [0.5, 0.75, 0.5],
];
const COEFF_MATRIX_5 = [
  [0.000789, 0.006581, 0.013347, 0.006581, 0.000789],
  [0.006581, 0.054901, 0.111345, 0.054901, 0.006581],
  [0.013347, 0.11345, 0.225821, 0.111345, 0.013347],
  [0.006581, 0.054901, 0.111345, 0.054901, 0.006581],
  [0.000789, 0.006581, 0.013347, 0.006581, 0.000789],
];

const COEFF_MATRIX = COEFF_MATRIX_3;
const DIV = 6;

function getMatrixForCurrentPixel(matrix, row, col) {
  const output = [];
  const s = (COEFF_MATRIX.length - 1) / 2;
  for (let i = row - s; i <= row + s; i++) {
    let outputRow = [];
    for (let j = col - s; j <= col + s; j++) {
      outputRow.push(
        i < 0 || j < 0 || i >= matrix.rows || j >= matrix.cols
          ? 0
          : matrix.ucharPtr(i, j)
      );
    }
    output.push(outputRow);
  }
  return output;
}

(async () => {
  await loadOpenCV();
  const image = await loadImage(path.join(__dirname, '/../lena.jpeg'));
  const src = cv.imread(image);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  const canvasGray = createCanvas(image.width, image.height);
  cv.imshow(canvasGray, gray);
  writeFileSync('output-gray.png', canvasGray.toBuffer('image/png'));
  let dst = new cv.Mat();
  let ksize = new cv.Size(5, 5);
  cv.GaussianBlur(gray, dst, ksize, 3);
  const canvas = createCanvas(image.width, image.height);
  cv.imshow(canvas, dst);
  writeFileSync('output-cv.png', canvas.toBuffer('image/png'));

  let customMat = new cv.Mat(gray.rows, gray.cols, gray.type());

  for (let i = 0; i < gray.rows; i++) {
    for (let j = 0; j < gray.cols; j++) {
      const matrix = getMatrixForCurrentPixel(gray, i, j);
      let newValue = 0;
      for (let iMatrix = 0; iMatrix < COEFF_MATRIX.length; iMatrix++) {
        for (let jMatrix = 0; jMatrix < COEFF_MATRIX.length; jMatrix++) {
          newValue += matrix[iMatrix][jMatrix] * COEFF_MATRIX[iMatrix][jMatrix];
        }
      }

      customMat.ucharPtr(i, j)[0] = Math.floor(newValue / DIV);
    }
  }

  const customCanvas = createCanvas(image.width, image.height);
  cv.imshow(customCanvas, customMat);
  writeFileSync(
    'output-custom-' + COEFF_MATRIX.length + '.png',
    customCanvas.toBuffer('image/png')
  );

  src.delete();
  dst.delete();
  gray.delete();
  customMat.delete();
})();
