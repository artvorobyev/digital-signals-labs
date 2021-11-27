const { createCanvas, loadImage } = require('canvas');
const { writeFileSync } = require('fs');
const path = require('path');

function computeAdaptiveThreshold(sourceImageData, ratio) {
  var integral = buildIntegralGray(sourceImageData);

  var width = sourceImageData.width;
  var height = sourceImageData.height;
  var s = width / 16;
  var sourceData = sourceImageData.data;
  var result = createImageData(width, height);
  var resultData = result.data;
  var resultData32 = new Uint32Array(resultData.buffer);

  var x = 0,
    y = 0,
    lineIndex = 0;

  for (y = 0; y < height; y++, lineIndex += width) {
    for (x = 0; x < width; x++) {
      var value = sourceData[(lineIndex + x) << 2];
      var x1 = Math.max(x - s, 0);
      var y1 = Math.max(y - s, 0);
      var x2 = Math.min(x + s, width - 1);
      var y2 = Math.min(y + s, height - 1);
      var area = (x2 - x1 + 1) * (y2 - y1 + 1);
      var localIntegral = getIntegralAt(integral, width, x1, y1, x2, y2);
      if (value * area > localIntegral * ratio) {
        resultData32[lineIndex + x] = 0xffffffff;
      } else {
        resultData32[lineIndex + x] = 0xff000000;
      }
    }
  }
  return result;
}

function createImageData(width, height) {
  var canvas = createCanvas(width, height);
  return canvas.getContext('2d').createImageData(width, height);
}

function buildIntegralGray(sourceImageData) {
  var sourceData = sourceImageData.data;
  var width = sourceImageData.width;
  var height = sourceImageData.height;
  var integral = new Int32Array(width * height);

  var x = 0,
    y = 0,
    lineIndex = 0,
    sum = 0;
  for (x = 0; x < width; x++) {
    sum += sourceData[x << 2];
    integral[x] = sum;
  }

  for (y = 1, lineIndex = width; y < height; y++, lineIndex += width) {
    sum = 0;
    for (x = 0; x < width; x++) {
      sum += sourceData[(lineIndex + x) << 2];
      integral[lineIndex + x] = integral[lineIndex - width + x] + sum;
    }
  }
  return integral;
}

function getIntegralAt(integral, width, x1, y1, x2, y2) {
  var result = integral[x2 + y2 * width];
  if (y1 > 0) {
    result -= integral[x2 + (y1 - 1) * width];
    if (x1 > 0) {
      result += integral[x1 - 1 + (y1 - 1) * width];
    }
  }
  if (x1 > 0) {
    result -= integral[x1 - 1 + y2 * width];
  }
  return result;
}

(async () => {
  var image = await loadImage(path.join(__dirname, '/input-bradley.png'));

  var canvas = createCanvas(image.width, image.height);
  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  var imageData = ctx.getImageData(0, 0, image.width, image.height);

  var t = 0.15;
  var thresholded = computeAdaptiveThreshold(imageData, 1 - t);
  ctx.putImageData(thresholded, 0, 0);
  writeFileSync('output-bradley.png', canvas.toBuffer('image/png'));
})();
