const { loadImage } = require('canvas');
const { loadOpenCV, outputImage } = require('../base');
const path = require('path');

const MORAVEC_THRESHOLD = 40000;
const FAST_THRESHOLD = 45;

function getSecurePixel(matrix, i, j) {
  const isArray = Array.isArray(matrix);
  return i < 0 ||
    j < 0 ||
    (!isArray && (i >= matrix.rows || j >= matrix.cols)) ||
    (isArray && (i >= matrix.length || j >= matrix[0].length))
    ? 255 // because background of image is white
    : isArray
    ? matrix[i][j]
    : matrix.ucharPtr(i, j)[0];
}

function getWindowMinimumForCurrentPixel(matrix, i, j, windowSize) {
  const coeff = (windowSize - 1) / 2;
  const shifts = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const minimum = Math.min.apply(
    null,
    shifts.map((shift) => {
      let summ = 0;
      for (let is = i - coeff + shift[1]; is <= i + coeff + shift[1]; is++) {
        for (let js = j - coeff + shift[0]; js <= j + coeff + shift[0]; js++) {
          summ += Math.pow(
            getSecurePixel(matrix, is, js) - getSecurePixel(matrix, i, j),
            2
          );
        }
      }
      return summ;
    })
  );
  return minimum;
}

function getLocalPixels(matrix, i, j, windowSize) {
  const coeff = (windowSize - 1) / 2;
  let array = [];
  for (let is = i - coeff; is <= i + coeff; is++) {
    for (let js = j - coeff; js <= j + coeff; js++) {
      array.push(getSecurePixel(matrix, is, js));
    }
  }

  return array;
}

(async () => {
  await loadOpenCV();
  const image = await loadImage(path.join(__dirname, '/input-box.png'));
  const src = cv.imread(image);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

  // MORAVEC
  var detector = [];
  const windowSize = 5;
  for (let i = 0; i < src.rows; i++) {
    let row = [];
    for (let j = 0; j < src.cols; j++) {
      const currentPixelMinimum = getWindowMinimumForCurrentPixel(
        src,
        i,
        j,
        windowSize
      );
      row.push(
        currentPixelMinimum > MORAVEC_THRESHOLD ? currentPixelMinimum : 0
      );
    }
    detector.push(row);
  }

  let moravec = src.clone();

  detector.forEach((row, i) =>
    row.forEach((pixel, j) => {
      if (pixel !== 0) {
        const max = Math.max.apply(null, getLocalPixels(detector, i, j, 31));
        if (pixel === max) {
          cv.circle(moravec, new cv.Point(j, i), 5, [0, 0, 0, 0], 1);
        }
      }
    })
  );

  outputImage(moravec, 'moravec');

  // HARRIS

  var harris = new cv.Mat();
  cv.cornerHarris(src, harris, 2, 3, 0.04);
  cv.normalize(harris, harris, 0, 255, cv.NORM_MINMAX);
  cv.dilate(
    harris,
    harris,
    cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(10, 10))
  );
  harris.convertTo(harris, 0);
  const maxHarris = cv.minMaxLoc(harris).maxVal;

  let harrisOutput = src.clone();
  for (let i = 0; i < harris.rows; i++) {
    for (let j = 0; j < harris.cols; j++) {
      if (getSecurePixel(harris, i, j) > 0.45 * maxHarris) {
        cv.circle(harrisOutput, new cv.Point(j, i), 1, [0, 0, 0, 0], 1);
      }
    }
  }
  outputImage(harrisOutput, 'harris');

  // FAST
  var fast = new cv.FastFeatureDetector(FAST_THRESHOLD);
  let keyPoints = new cv.KeyPointVector();
  fast.detect(src, keyPoints);
  var img2 = new cv.Mat();
  cv.drawKeypoints(src, keyPoints, img2, [255, 0, 0, 0]);
  outputImage(img2, 'fast');
})();
