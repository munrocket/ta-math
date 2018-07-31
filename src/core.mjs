/* basic functions */

export function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}

export function sd(array) {
  return rmse(array, new Array(array.length).fill(mean(array)));
}

export function mad(array) {
  return mae(array, new Array(array.length).fill(mean(array)));
}

export function mae(f, g) {
  const absDiff = pointwise((a, b) => Math.abs(a - b), f, g);
  return (f.length != g.length) ? Infinity : mean(absDiff);
}

export function rmse(f, g) {
  const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

export function nrmse(f, g) {
  return rmse(f, g) / (Math.max(...f) - Math.min(...f));
}

export function pointwise(operation, ...args) {
  let result = [];
  for (let i = 0; i < args[0].length; i++) {
    let iargs = (i) => args.map(array => array[i]);
    result[i] = operation(...iargs(i));
  }
  return result;
}

/* rolling or price specific functions */

export function rolling(operation, window, array) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

export function trueRange($high, $low, $close) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1; i < $low.length; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}

export function typicalPrice($high, $low, $close) {
  let tp = [];
  for (let i = 0; i < $low.length; i++) {
    tp.push(($high[i] + $low[i] + $close[i]) / 3);
  }
  return tp;
}