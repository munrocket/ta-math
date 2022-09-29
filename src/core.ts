/* basic math */

export function mean(series: Array<number>) {
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
  }
  return sum / series.length;
}

export function sd(series: Array<number>) {
  let E = mean(series);
  let E2 = mean(pointwise((x: number) => x * x, series));
  return Math.sqrt(E2 - E * E);
}

export function cov(f: Array<number>, g: Array<number>) {
  let Ef = mean(f), Eg = mean(g);
  let Efg = mean(pointwise((a: number, b: number) => a * b, f, g));
  return Efg - Ef * Eg;
}

export function cor(f: Array<number>, g: Array<number>) {
  let Ef = mean(f), Eg = mean(g);
  let Ef2 = mean(pointwise((a: number) => a * a, f));
  let Eg2 = mean(pointwise((a: number) => a * a, g));
  let Efg = mean(pointwise((a: number, b: number) => a * b, f, g));
  return (Efg - Ef * Eg) / Math.sqrt((Ef2 - Ef * Ef) * (Eg2 - Eg * Eg));
}

export function mad(array: Array<number>) {
  return mae(array, new Array(array.length).fill(mean(array)));
}

/* functional programming */

export function pointwise(operation: Function, ...serieses: Array<Array<number>>) {
  let result = [];
  for (let i = 0, len = serieses[0].length; i < len; i++) {
    let iseries = (i: number) => serieses.map(x => x[i]);
    result[i] = operation(...iseries(i));
  }
  return result;
}

export function rolling(operation: Function, series: Array<number>, window: number) {
  let result = [];
  for (let i = 0, len = series.length; i < len; i++) {
    let j = i + 1 - window;
    result.push(operation(series.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* scaled and percentage errors */

export function mae(f: Array<number>, g: Array<number>) {
  const absDiff = pointwise((a: number, b: number) => Math.abs(a - b), f, g);
  return (f.length != g.length) ? Infinity : mean(absDiff);
}

export function rmse(f: Array<number>, g: Array<number>) {
  const sqrDiff = pointwise((a: number, b: number) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

export function nrmse(f: Array<number>, g: Array<number>) {
  return rmse(f, g) / (Math.max(...f) - Math.min(...f));
}

export function mape(f: Array<number>, g: Array<number>) {
  const frac = pointwise((a: number, b: number) => Math.abs((a - b) / a), f, g);
  return (f.length != g.length) ? Infinity : mean(frac) * 100;
}

/* core indicators & overlays */

export function sma(series: Array<number>, window: number) {
  return rolling((s: Array<number>) => mean(s), series, window);
}

export function ema(series: Array<number>, window: number, start ?: number) {
  let weight = 2 / (window + 1);
  let ema = [ start ? start : mean(series.slice(0, window)) ];
  for (let i = 1, len = series.length; i < len; i++) {
    ema.push(series[i] * weight + (1 - weight) * ema[i - 1]);
  }
  return ema;
}

export function wma(series: Array<number>, window: number) {
  let result: Array<number> = [];
  for (let i = 0, len = series.length; i < len; i++) {
    let sum = 0, wind = Math.max(window, i + 1);
    for (let j = 0; j < wind; j++) {
      sum += series[i - j] * (wind - j);
    }
    result.push(sum * 2 / wind / (wind + 1));
  }
  return result;
}

export function hma(series: Array<number>, window: number) {
  let s1 = wma(series, Math.floor(window / 2));
  let s2 = wma(series, window);
  let s3 = pointwise((a: number, b: number) => 2 * a - b, s1, s2);
  return wma(s3, Math.floor(Math.sqrt(window)));
}

export function stdev(series: Array<number>, window: number) {
  return rolling((s: Array<number>) => sd(s), series, window);
}

export function madev(series: Array<number>, window: number) {
  return rolling((s: Array<number>) => mad(s), series, window);
}

export function expdev(series: Array<number>, window: number) {
  let sqrDiff = pointwise((a: number, b: number) => (a - b) * (a - b), series, ema(series, window));
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

export function typicalPrice($high: Array<number>, $low: Array<number>, $close: Array<number>) {
  return pointwise((a: number, b: number, c: number) => (a + b + c) / 3, $high, $low, $close);
}

export function trueRange($high: Array<number>, $low: Array<number>, $close: Array<number>) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1, len = $low.length; i < len; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}