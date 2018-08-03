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

/* functional programming */

export function pointwise(operation, ...args) {
  let result = [];
  for (let i = 0; i < args[0].length; i++) {
    let iargs = (i) => args.map(array => array[i]);
    result[i] = operation(...iargs(i));
  }
  return result;
}

export function rolling(operation, window, array) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* basic indicators & overlays */

export function stdev($close, window) {
  return rolling(x => sd(x), window, $close);
}

export function expdev($close, window, weight = null) {
  let sqrDiff = pointwise((a, b) => (a - b) * (a - b), $close, ema($close, window));
  return pointwise(x => Math.sqrt(x), ema(sqrDiff, window, weight));
}

export function sma($close, window) {
  return rolling(x => mean(x), window, $close);
}

export function ema($close, window, weight = null, start = null) {
  weight = weight ? weight : 2 / (window + 1);
  let ema = [ start ? start : mean($close.slice(0, window)) ];
  for (let i = 1; i < $close.length; i++) {
    ema.push($close[i] * weight + ema[i - 1] * (1 - weight));
  };
  return ema;
}

export function madev($close, window) {
  return rolling(x => mad(x), window, $close);
}

export function atr($high, $low, $close, window) {
  let tr = trueRange($high, $low, $close);
  return ema(tr, window, 1 / window);
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