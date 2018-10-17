/* basic math */

export function mean(series) {
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
  }
  return sum / series.length;
}

export function sd(series) {
  let E = mean(series);
  let E2 = mean(pointwise(x => x * x, series));
  return Math.sqrt(E2 - E * E);
}

export function cov(f, g) {
  let Ef = mean(f), Eg = mean(g);
  let Efg = mean(pointwise((a, b) => a * b, f, g));
  return Efg - Ef * Eg;
}

export function cor(f, g) {
  let Ef = mean(f), Eg = mean(g);
  let Ef2 = mean(pointwise((a) => a * a, f));
  let Eg2 = mean(pointwise((a) => a * a, g));
  let Efg = mean(pointwise((a, b) => a * b, f, g));
  return (Efg - Ef * Eg) / Math.sqrt((Ef2 - Ef * Ef) * (Eg2 - Eg * Eg));
}

export function mad(array) {
  return mae(array, new Array(array.length).fill(mean(array)));
}

/* functional programming */

export function pointwise(operation, ...serieses) {
  let result = [];
  for (let i = 0, len = serieses[0].length; i < len; i++) {
    let iseries = (i) => serieses.map(x => x[i]);
    result[i] = operation(...iseries(i));
  }
  return result;
}

export function rolling(operation, window, series) {
  let result = [];
  for (let i = 0, len = series.length; i < len; i++) {
    let j = i + 1 - window;
    result.push(operation(series.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* scaled and percentage errors */

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

export function mape(f, g) {
  const frac = pointwise((a, b) => Math.abs((a - b) / a), f, g);
  return (f.length != g.length) ? Infinity : mean(frac) * 100;
}

/* core indicators & overlays */

export function sma(series, window) {
  return rolling(x => mean(x), window, series);
}

export function ema(series, window, start = null) {
  let weight = 2 / (window + 1); // window(weight) = (2 / weight) - 1;
  let ema = [ start ? start : mean(series.slice(0, window)) ];
  for (let i = 1, len = series.length; i < len; i++) {
    ema.push(series[i] * weight + (1 - weight) * ema[i - 1]);
  }
  return ema;
}

export function stdev(series, window) {
  return rolling(x => sd(x), window, series);
}

export function madev(series, window) {
  return rolling(x => mad(x), window, series);
}

export function expdev(series, window) {
  let sqrDiff = pointwise((a, b) => (a - b) * (a - b), series, ema(series, window));
  return pointwise(x => Math.sqrt(x), ema(sqrDiff, window));
}

/* Wilder's functions */

export function atr($high, $low, $close, window) {
  let tr = trueRange($high, $low, $close);
  return ema(tr, 2 * window - 1);
}

export function wilderSmooth(series, window) {
  let result = new Array(window).fill(NaN);
  result.push(series.slice(1, window + 1).reduce((sum, item) => { return sum += item}, 0));
  for(let i = window + 1; i < series.length; i++) {
    result.push((1 - 1 / window) * result[i - 1] + series[i]);
  }
  return result;
}

/* price transformations */

export function typicalPrice($high, $low, $close) {
  return pointwise((a, b, c) => (a + b + c) / 3, $high, $low, $close);
}

export function trueRange($high, $low, $close) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1, len = $low.length; i < len; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}