/* basic math */

export function avg(series: Array<number>) {
  let sum = 0, len = series.length;
  for (let i = 0; i < len; i++) {
    sum += series[i];
  }
  return sum / len;
}

export function wavg(series: Array<number>) {
  let sum = 0, len = series.length;
  for (let i = 0; i < len; i++) {
    sum += series[i] * (i + 1);
  }
  return sum / (len * (len + 1) / 2);
}

export function sd(series: Array<number>) {
  let E = avg(series);
  let E2 = avg(pointwise((x: number) => x * x, series));
  return Math.sqrt(E2 - E * E);
}

export function cov(f: Array<number>, g: Array<number>) {
  let Ef = avg(f), Eg = avg(g);
  let Efg = avg(pointwise((a, b) => a * b, f, g));
  return Efg - Ef * Eg;
}

export function cor(f: Array<number>, g: Array<number>) {
  let Ef = avg(f), Eg = avg(g);
  let Ef2 = avg(pointwise((a: number) => a * a, f));
  let Eg2 = avg(pointwise((a: number) => a * a, g));
  let Efg = avg(pointwise((a, b) => a * b, f, g));
  return (Efg - Ef * Eg) / Math.sqrt((Ef2 - Ef * Ef) * (Eg2 - Eg * Eg));
}

export function mad(array: Array<number>) {
  return mae(array, new Array(array.length).fill(avg(array)));
}

/* functional programming */

export function pointwise(operation: (...args: any[]) => any, ...serieses: Array<Array<number>>) {
  let result = [];
  for (let i = 0, len = serieses[0].length; i < len; i++) {
    let iseries = (i: number) => serieses.map(x => x[i]);
    result.push(operation(...iseries(i)));
  }
  return result;
}

export function rolling(operation: (...args: any[]) => any, series: Array<number>, window: number) {
  let result = [];
  for (let i = 0, len = series.length; i < len; i++) {
    let j = i + 1 - window;
    result.push(operation(series.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* scaled and percentage errors */

export function mae(f: Array<number>, g: Array<number>) {
  const absDiff = pointwise((a, b) => Math.abs(a - b), f, g);
  return (f.length != g.length) ? Infinity : avg(absDiff);
}

export function rmse(f: Array<number>, g: Array<number>) {
  const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(avg(sqrDiff));
}

export function nrmse(f: Array<number>, g: Array<number>) {
  return rmse(f, g) / (Math.max(...f) - Math.min(...f));
}

export function mape(f: Array<number>, g: Array<number>) {
  const frac = pointwise((a, b) => Math.abs((a - b) / a), f, g);
  return (f.length != g.length) ? Infinity : avg(frac) * 100;
}

/* core indicators & overlays */

export function sma(series: Array<number>, window: number) {
  return rolling(s => avg(s), series, window);
}

export function ema(series: Array<number>, window: number, start ?: number) {
  let weight = 2 / (window + 1);
  let ema = [ start ? start : avg(series.slice(0, window)) ];
  for (let i = 1, len = series.length; i < len; i++) {
    ema.push(series[i] * weight + (1 - weight) * ema[i - 1]);
  }
  return ema;
}

export function wma(series: Array<number>, window: number) {
  return rolling(s => wavg(s), series, window);
}

export function stdev(series: Array<number>, window: number) {
  return rolling(s => sd(s), series, window);
}

export function madev(series: Array<number>, window: number) {
  return rolling(s => mad(s), series, window);
}

export function expdev(series: Array<number>, window: number) {
  let sqrDiff = pointwise((a, b) => (a - b) * (a - b), series, ema(series, window));
  return pointwise((x: number) => Math.sqrt(x), ema(sqrDiff, window));
}

/* Wilder's functions */

export function atr($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number) {
  let tr = trueRange($high, $low, $close);
  return ema(tr, 2 * window - 1);
}

export function wilderSmooth(series: Array<number>, window: number) {
  let result = new Array(window).fill(NaN);
  result.push(series.slice(1, window + 1).reduce((sum, item) => { return sum += item}, 0));
  for(let i = window + 1; i < series.length; i++) {
    result.push((1 - 1 / window) * result[i - 1] + series[i]);
  }
  return result;
}

/* price transformations */

export function medianPrice($high: Array<number>, $low: Array<number>) {
  return pointwise((a, b) => (a + b) / 2, $high, $low);
}

export function typicalPrice($high: Array<number>, $low: Array<number>, $close: Array<number>) {
  return pointwise((a, b, c) => (a + b + c) / 3, $high, $low, $close);
}

export function trueRange($high: Array<number>, $low: Array<number>, $close: Array<number>) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1, len = $low.length; i < len; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}