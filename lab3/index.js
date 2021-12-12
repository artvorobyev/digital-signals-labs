const { createCanvas, loadImage } = require('canvas');
const { writeFileSync } = require('fs');
const path = require('path');
const { loadOpenCV } = require('../base');

function outputImage(matrix, name) {
  const canvas = createCanvas(matrix.cols, matrix.rows);
  cv.imshow(canvas, matrix);
  writeFileSync(`output-${name}.png`, canvas.toBuffer('image/png'));
}

(async () => {
  await loadOpenCV();
  const image = await loadImage(path.join(__dirname, '/input.png'));
  const src = cv.imread(image);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

  let ksize = new cv.Size(10, 10);
  let anchor = new cv.Point(-1, -1);
  let element = cv.getStructuringElement(cv.MORPH_ELLIPSE, ksize, anchor);
  let dst = new cv.Mat();

  cv.dilate(src, dst, element);
  outputImage(dst, 'dilation');

  cv.erode(src, dst, element);
  outputImage(dst, 'erosion');

  cv.dilate(src, dst, element);
  cv.erode(dst, dst, element);
  outputImage(dst, 'closing');

  cv.erode(src, dst, element);
  cv.dilate(dst, dst, element);
  outputImage(dst, 'opening');

  // SKELETON

  const image2 = await loadImage(path.join(__dirname, '/input-horse.png'));
  const src2 = cv.imread(image2);
  cv.cvtColor(src2, src2, cv.COLOR_RGBA2GRAY, 0);

  var skeleton = new cv.Mat(src2.rows, src2.cols, 0);
  for (let i = 0; i < src2.rows; i++) {
    for (let j = 0; j < src2.cols; j++) {
      skeleton.ucharPtr(i, j)[0] = 0;
    }
  }
  var temp = new cv.Mat(src2.rows, src2.cols, 0);
  var opening = new cv.Mat(src2.rows, src2.cols, 0);
  var srcCopy = src2.clone();
  var eroded = new cv.Mat(src2.rows, src2.cols, 0);
  var element2 = cv.getStructuringElement(cv.MORPH_CROSS, new cv.Size(3, 3));

  while (true) {
    cv.erode(srcCopy, opening, element2);
    cv.dilate(opening, opening, element2);

    cv.subtract(srcCopy, opening, temp);
    cv.erode(srcCopy, eroded, element2);
    cv.bitwise_or(skeleton, temp, skeleton);
    srcCopy = eroded.clone();

    if (cv.countNonZero(srcCopy) === 0) {
      break;
    }
  }

  outputImage(skeleton, 'skeleton');

  // CONDITIONAL DILATION

  const image3 = await loadImage(
    path.join(__dirname, '/input-conditional.png')
  );
  const src3 = cv.imread(image3);
  cv.cvtColor(src3, src3, cv.COLOR_RGBA2GRAY, 0);
  var elementV = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 3));
  var elementD = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  var conditionalErosion = new cv.Mat();
  var result = new cv.Mat(src3.rows, src3.cols, 0);
  for (let i = 0; i < result.rows; i++) {
    for (let j = 0; j < result.cols; j++) {
      result.ucharPtr(i, j)[0] = 0;
    }
  }
  var temp2 = new cv.Mat(src3.rows, src3.cols, 0);
  for (let i = 0; i < temp2.rows; i++) {
    for (let j = 0; j < temp2.cols; j++) {
      temp2.ucharPtr(i, j)[0] = 0;
    }
  }

  var temp3 = new cv.Mat(src3.rows, src3.cols, 0);
  for (let i = 0; i < temp3.rows; i++) {
    for (let j = 0; j < temp3.cols; j++) {
      temp2.ucharPtr(i, j)[0] = 0;
    }
  }
  cv.erode(src3, conditionalErosion, elementV);

  for (let i = 0; i < 3; i++) {
    cv.dilate(conditionalErosion, conditionalErosion, elementD);
    cv.bitwise_and(src3, conditionalErosion, result);

    conditionalErosion = result.clone();

    cv.subtract(result, temp2, temp3);

    if (cv.countNonZero(temp3) === 0) {
      break;
    }

    temp2 = result.clone();
  }

  outputImage(result, 'conditional');

  src.delete();
  src2.delete();
  src3.delete();
  dst.delete();
  skeleton.delete();
  temp.delete();
  temp2.delete();
  temp3.delete();
  opening.delete();
  srcCopy.delete();
  eroded.delete();
  conditionalErosion.delete();
  result.delete();
})();
