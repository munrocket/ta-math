import { float, int } from './types';

let result = new Array<float>();
let sum: float = 0.;

/* basic math */

export function mean(series: Array<float>): float {
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
  }
  return sum / series.length;
}

export function sd(series: Array<float>): float {
  let E = mean(series);
  let E2 = mean(pointwise((x: float) => x * x, series));
  return Math.sqrt(E2 - E * E);
}

export function cov(f: Array<float>, g: Array<float>): float {
  let Ef = mean(f), Eg = mean(g);
  let Efg = mean(pointwise((a: float, b: float) => a * b, f, g));
  return Efg - Ef * Eg;
}

export function cor(f: Array<float>, g: Array<float>): float {
  let Ef = mean(f), Eg = mean(g);
  let Ef2 = mean(pointwise((a: float) => a * a, f));
  let Eg2 = mean(pointwise((a: float) => a * a, g));
  let Efg = mean(pointwise((a: float, b: float) => a * b, f, g));
  return (Efg - Ef * Eg) / Math.sqrt((Ef2 - Ef * Ef) * (Eg2 - Eg * Eg));
}

export function mad(array: Array<float>): float {
  return mae(array, new Array(array.length).fill(mean(array)));
}

/* functional programming */

//@inline
export function pointwise(operation: Function, ...serieses: Array<Array<float>>): Array<float> {
  for (let i = 0, len = serieses[0].length; i < len; i++) {
    let iseries = (i: float) => serieses.map(x => x[i]);
    result[i] = operation(...iseries(i));
  }
  return result;
}
//@inline
export function rolling(operation: Function, series: Array<float>, window: int): Array<float> {
  for (let i = 0, len = series.length; i < len; i++) {
    let j = i + 1 - window;
    result.push(operation(series.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* scaled and percentage errors */

export function mae(f: Array<float>, g: Array<float>): float {
  const absDiff = pointwise((a: float, b: float) => Math.abs(a - b), f, g);
  return (f.length != g.length) ? Infinity : mean(absDiff);
}

export function rmse(f: Array<float>, g: Array<float>): float {
  const sqrDiff = pointwise((a: float, b: float) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

export function nrmse(f: Array<float>, g: Array<float>): float {
  return rmse(f, g) / (Math.max(...f) - Math.min(...f));
}

export function mape(f: Array<float>, g: Array<float>): float {
  const frac = pointwise((a: float, b: float) => Math.abs((a - b) / a), f, g);
  return (f.length != g.length) ? Infinity : mean(frac) * 100.;
}

/* core indicators & overlays */

export function sma(series: Array<float>, window: int): Array<float> {
  return rolling((s: Array<float>) => mean(s), series, window);
}

export function ema(series: Array<float>, window: int, start ?: int): Array<float> {
  let weight = 2. / ((<float>window) + 1.);
  let ema = [ start ? start : mean(series.slice(0, window)) ];
  for (let i = 1, len = series.length; i < len; i++) {
    ema.push(series[i] * weight + (1. - weight) * ema[i - 1]);
  }
  return ema;
}

export function stdev(series: Array<float>, window: int): Array<float> {
  return rolling((s: Array<float>) => sd(s), series, window);
}

export function madev(series: Array<float>, window: int): Array<float> {
  return rolling((s: Array<float>) => mad(s), series, window);
}

export function expdev(series: Array<float>, window: int): Array<float> {
  let sqrDiff = pointwise((a: float, b: float) => (a - b) * (a - b), series, ema(series, window));
  return pointwise((x: float) => Math.sqrt(x), ema(sqrDiff, window));
}

/* Wilder's functions */
export function atr($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int): Array<float> {
  let tr = trueRange($high, $low, $close);
  return ema(tr, 2. * (<float>window) - 1.);
}

export function wilderSmooth(series: Array<float>, window: int): Array<float> {
  let result = new Array<float>(window).fill(NaN);
  result.push(series.slice(1, window + 1).reduce((sum, item) => { return sum += item}, 0.));
  for(let i = window + 1; i < series.length; i++) {
    result.push((1. - 1. / (<int>window)) * result[i - 1] + series[i]);
  }
  return result;
}

/* price transformations */

export function typicalPrice($high: Array<float>, $low: Array<float>, $close: Array<float>): Array<float> {
  return pointwise((a: float, b: float, c: float) => (a + b + c) / 3., $high, $low, $close);
}

export function trueRange($high: Array<float>, $low: Array<float>, $close: Array<float>): Array<float> {
  let tr = [$high[0] - $low[0]];
  for (let i = 1, len = $low.length; i < len; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}