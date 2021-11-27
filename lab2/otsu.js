const { createCanvas, loadImage } = require('canvas');
const { writeFileSync } = require('fs');
const path = require('path');
const { loadOpenCV } = require('../base');

function otsu(matrix) {
  let T = 0;
  let Gmax = -1;
  const n = matrix.cols * matrix.rows;
  let n1 = 0;
  let n2 = n;
  const bins = 256;

  let pixels = [];
  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      pixels.push(matrix.ucharPtr(i, j)[0]);
    }
  }

  const h = new Array(256)
    .fill(0)
    .map((_value, index) => {
      return index;
    })
    .map((value) => pixels.filter((pixel) => pixel === value).length);

  let S1 = 0;
  let S2 = pixels.reduce((acc, curr) => acc + curr, 0);
  let M1 = 0;
  let M2 = S2 / n2;

  for (let t = 0; t < bins; t++) {
    nt = h[t];
    n1 = n1 + nt;
    n2 = n2 - nt;
    const w1 = n1 / n;
    const w2 = 1 - w1;
    S1 = S1 + nt * t;
    S2 = S2 - nt * t;
    M1 = S1 / n1;
    M2 = S2 / n2;
    G2 = w1 * w2 * Math.pow(M1 - M2, 2);

    if (G2 > Gmax) {
      Gmax = G2;
      T = t;
    }
  }

  let result = new cv.Mat(matrix.rows, matrix.cols, matrix.type());
  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      result.ucharPtr(i, j)[0] = matrix.ucharPtr(i, j)[0] < T ? 0 : 255;
    }
  }

  return result;
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

  let otsuCV = new cv.Mat();
  cv.threshold(gray, otsuCV, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
  const canvasOtsuCv = createCanvas(image.width, image.height);
  cv.imshow(canvasOtsuCv, otsuCV);
  writeFileSync('output-otsu-cv.png', canvasOtsuCv.toBuffer('image/png'));

  const otsuCustom = otsu(gray);
  const canvasOtsuCustom = createCanvas(image.width, image.height);
  cv.imshow(canvasOtsuCustom, otsuCustom);
  writeFileSync(
    'output-otsu-custom.png',
    canvasOtsuCustom.toBuffer('image/png')
  );

  src.delete();
  gray.delete();
  otsuCV.delete();
  otsuCustom.delete();
})();
