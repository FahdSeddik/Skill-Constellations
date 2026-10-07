function upperBound(values, target, low = 0, high = values.length) {
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function lowerBound(values, target, low = 0, high = values.length) {
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth(share) {
  return share * share * (3 - 2 * share);
}

function easeOut(share) {
  return 1 - Math.pow(1 - share, 3);
}

function easeInOut(share) {
  return share < 0.5 ? 4 * share * share * share : 1 - Math.pow(2 - 2 * share, 3) / 2;
}
