const { createCanvas, loadImage } = require('canvas');
const { writeFileSync } = require('fs');
const path = require('path');
const { loadOpenCV } = require('../base');

const ROBERTS_COEFFS_1 = [
  [1, 0],
  [0, -1],
];

const ROBERTS_COEFFS_2 = [
  [0, 1],
  [-1, 0],
];

const PREWITT_COEFFS_1 = [
  [-1, 0, 1],
  [-1, 0, 1],
  [-1, 0, 1],
];

const PREWITT_COEFFS_2 = [
  [-1, -1, -1],
  [0, 0, 0],
  [1, 1, 1],
];

const SOBEL_COEFFS_1 = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];

const SOBEL_COEFFS_2 = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

const SСHARR_COEFFS_1 = [
  [3, 10, 3],
  [0, 0, 0],
  [-3, -10, -3],
];

const SCHARR_COEFFS_2 = [
  [3, 0, -3],
  [10, 0, -10],
  [3, 0, -3],
];

const COEFF_MATRIX_LAPLACE_SMALL = [
  [0, 1, 0],
  [1, -4, 1],
  [0, 1, 0],
];

const COEFF_MATRIX_LAPLACE = [
  [1, 1, 1],
  [1, -8, 1],
  [1, 1, 1],
];

function getMatrixForCurrentPixel(matrix, row, col, coeffMatrix) {
  const output = [];
  const isOdd = coeffMatrix.length % 2 === 1;
  const start = isOdd ? (coeffMatrix.length - 1) / 2 : 0;
  const end = isOdd ? (coeffMatrix.length - 1) / 2 : coeffMatrix.length - 1;
  const isArray = matrix.constructor === Array;
  for (let i = row - start; i <= row + end; i++) {
    let outputRow = [];
    for (let j = col - start; j <= col + end; j++) {
      outputRow.push(
        i < 0 ||
          j < 0 ||
          (isArray
            ? i >= matrix.length || j >= matrix[0].length
            : i >= matrix.rows || j >= matrix.cols)
          ? 0
          : isArray
          ? matrix[i][j]
          : matrix.ucharPtr(i, j)[0]
      );
    }
    output.push(outputRow);
  }
  return output;
}

function compareL(a, b, threshold) {
  return ((a < 0 && b > 0) || (a > 0 && b < 0)) && Math.abs(a - b) > threshold;
}

function isLaplacianExtremum(localLaplassMatrix, threshold) {
  const end = localLaplassMatrix.length - 1;
  const center = (localLaplassMatrix.length - 1) / 2;

  const leftTopToRightBottom = compareL(
    localLaplassMatrix[0][0],
    localLaplassMatrix[end][end],
    threshold
  );
  const rightTopToLeftBottom = compareL(
    localLaplassMatrix[0][end],
    localLaplassMatrix[end][0],
    threshold
  );
  const topToBottom = compareL(
    localLaplassMatrix[0][center],
    localLaplassMatrix[end][center]
  );

  const leftToRight = compareL(
    localLaplassMatrix[center][0],
    localLaplassMatrix[center][end]
  );

  return (
    [
      leftToRight,
      leftTopToRightBottom,
      rightTopToLeftBottom,
      topToBottom,
    ].filter((i) => i).length >= 2
  );
}

function applyOperator(
  blurred,
  coeffMatrix1,
  coeffMatrix2,
  operatorName,
  threshold
) {
  let result = new cv.Mat(blurred.rows, blurred.cols, 0);

  let matrixArr1 = [];
  let matrixArr2 = [];

  for (let i = 0; i < blurred.rows; i++) {
    let rowMatrix1 = [];
    let rowMatrix2 = [];
    for (let j = 0; j < blurred.cols; j++) {
      const matrix = getMatrixForCurrentPixel(blurred, i, j, coeffMatrix1);

      let newValue = 0;
      let newValue2 = 0;

      for (let iMatrix = 0; iMatrix < coeffMatrix1.length; iMatrix++) {
        for (let jMatrix = 0; jMatrix < coeffMatrix1.length; jMatrix++) {
          newValue += matrix[iMatrix][jMatrix] * coeffMatrix1[iMatrix][jMatrix];
          newValue2 +=
            matrix[iMatrix][jMatrix] * coeffMatrix2[iMatrix][jMatrix];
        }
      }

      rowMatrix1.push(Math.floor(newValue));
      rowMatrix2.push(Math.floor(newValue2));
    }

    matrixArr1.push(rowMatrix1);
    matrixArr2.push(rowMatrix2);
  }

  for (let i = 0; i < blurred.rows; i++) {
    for (let j = 0; j < blurred.cols; j++) {
      const temp = Math.floor(
        Math.sqrt(Math.pow(matrixArr1[i][j], 2) + Math.pow(matrixArr2[i][j], 2))
      );

      result.ucharPtr(i, j)[0] = temp > threshold ? 255 : 0;
    }
  }

  const customCanvas = createCanvas(blurred.cols, blurred.rows);
  cv.imshow(customCanvas, result);
  writeFileSync(
    `output-operator-${operatorName}.png`,
    customCanvas.toBuffer('image/png')
  );

  result.delete();
}

function applyLaplass(blurred) {
  let result = new cv.Mat(blurred.rows, blurred.cols, 0);

  let matrixArr = [];

  for (let i = 0; i < blurred.rows; i++) {
    let rowMatrix = [];
    for (let j = 0; j < blurred.cols; j++) {
      const matrix = getMatrixForCurrentPixel(
        blurred,
        i,
        j,
        COEFF_MATRIX_LAPLACE
      );

      let newValue = 0;

      for (let iMatrix = 0; iMatrix < COEFF_MATRIX_LAPLACE.length; iMatrix++) {
        for (
          let jMatrix = 0;
          jMatrix < COEFF_MATRIX_LAPLACE.length;
          jMatrix++
        ) {
          newValue +=
            matrix[iMatrix][jMatrix] * COEFF_MATRIX_LAPLACE[iMatrix][jMatrix];
        }
      }

      rowMatrix.push(Math.floor(newValue));
    }

    matrixArr.push(rowMatrix);
  }

  const threshold =
    matrixArr.reduce((acc, currentRow) => {
      const currentMax = Math.max(currentRow);
      return currentMax > acc ? currentMax : acc;
    }, 0) * 0.04;

  for (let i = 0; i < blurred.rows; i++) {
    for (let j = 0; j < blurred.cols; j++) {
      const matrixLaplass = getMatrixForCurrentPixel(
        matrixArr,
        i,
        j,
        COEFF_MATRIX_LAPLACE
      );

      const isExtremum = isLaplacianExtremum(matrixLaplass, threshold);
      result.ucharPtr(i, j)[0] = isExtremum ? 255 : 0;
    }
  }

  const customCanvas = createCanvas(blurred.cols, blurred.rows);
  cv.imshow(customCanvas, result);
  writeFileSync(
    `output-operator-laplace.png`,
    customCanvas.toBuffer('image/png')
  );

  result.delete();
}

(async () => {
  await loadOpenCV();
  const image = await loadImage(path.join(__dirname, '/input.jpeg'));
  const src = cv.imread(image);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  const canvasGray = createCanvas(image.width, image.height);
  cv.imshow(canvasGray, gray);
  writeFileSync('output-gray.png', canvasGray.toBuffer('image/png'));

  let blurred = new cv.Mat();
  let ksize = new cv.Size(5, 5);
  cv.GaussianBlur(gray, blurred, ksize, 3);
  const canvasBlurred = createCanvas(image.width, image.height);
  cv.imshow(canvasBlurred, blurred);
  writeFileSync('output-blurred.png', canvasBlurred.toBuffer('image/png'));

  applyOperator(blurred, ROBERTS_COEFFS_1, ROBERTS_COEFFS_2, 'roberts', 10);
  applyOperator(blurred, SOBEL_COEFFS_1, SOBEL_COEFFS_2, 'sobel', 90);
  applyOperator(blurred, PREWITT_COEFFS_1, PREWITT_COEFFS_2, 'prewitt', 50);
  applyOperator(blurred, SСHARR_COEFFS_1, SCHARR_COEFFS_2, 'scharr', 90);
  applyLaplass(blurred);

  let canny = new cv.Mat();
  cv.Canny(blurred, canny, 100, 200);
  const canvasCanny = createCanvas(image.width, image.height);
  cv.imshow(canvasCanny, canny);
  writeFileSync('output-operator-canny.png', canvasCanny.toBuffer('image/png'));

  src.delete();
  blurred.delete();
  gray.delete();
  canny.delete();
})();
