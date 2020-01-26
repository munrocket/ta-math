import { ema, sma, madev, pointwise, rolling, trueRange, typicalPrice, wilderSmooth} from './core';
import { bb } from './overlays';
import { AdxStruct, LineSignalStruct, MacdStruct, PlusMinusStruct } from './types';
import { float, int } from './types';

/* indicators */

export function adl($high: Array<float>, $low: Array<float>, $close: Array<float>, $volume: Array<float>): Array<float> {
  let adl = [$volume[0] * (2.*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1, len = $high.length; i < len; i++) {
    adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
  }
  return adl;
}

// export function adx($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int): AdxStruct {
//   let dmp = [0.], dmm = [0.];
//   for(let i = 1, len = $low.length; i < len; i++) {
//     let hd = $high[i] - $high[i - 1];
//     let ld = $low[i - 1] - $low[i];
//     dmp.push((hd > ld) ? Math.max(hd, 0.) : 0.);
//     dmm.push((ld > hd) ? Math.max(ld, 0.) : 0.);
//   }
//   let str = wilderSmooth(trueRange($high, $low, $close), window);
//   dmp = wilderSmooth(dmp, window);
//   dmm = wilderSmooth(dmm, window);
//   let dip = pointwise2((a: float, b: float) => 100. * a / b, dmp, str);
//   let dim = pointwise2((a: float, b: float) => 100. * a / b, dmm, str);
//   let dx = pointwise2((a: float, b: float) => 100. * Math.abs(a - b) / (a + b), dip, dim);
//   return { dip: dip, dim: dim, adx: new Array(14).fill(NaN).concat(ema(dx.slice(14), 2. * (<float>window) - 1)) };
// }

// export function bbp($close: Array<float>, window: float, mult: float): Array<float> {
//   let band = bb($close, window, mult);
//   return pointwise3((p: float, u: float, l: float) => (p - l) / (u - l), $close, band.upper, band.lower);
// }

// export function cci($high: Array<float>, $low: Array<float>,
//                     $close: Array<float>, window: float, mult: float): Array<float> {
//   let tp = typicalPrice($high, $low, $close);
//   let tpsma = sma(tp, window);
//   let tpmad = madev(tp, window);
//   tpmad[0] = Infinity;
//   return pointwise3((a: float, b: float, c: float) => (a - b) / (c * mult), tp, tpsma, tpmad);
// }

// export function cho($high: Array<float>, $low: Array<float>, $close: Array<float>,
//                     $volume: Array<float>, winshort: float, winlong: float): Array<float> {
//   let adli = adl($high, $low, $close, $volume);
//   return pointwise2((s: float, l: float) => s - l, ema(adli, winshort), ema(adli, winlong));
// }

// export function fi($close: Array<float>, $volume: Array<float>, window: float): Array<float> {
//   let delta = rolling((s: Array<float>) => s[s.length - 1] - s[0], $close, 2);
//   return ema(pointwise2((a: float, b: float) => a * b, delta, $volume), window);
// }

// export function kst($close: Array<float>, w1: float, w2: float, w3: float, w4: float,
//                     s1: float, s2: float, s3: float, s4: float, sig: float): LineSignalStruct {
//   let rcma1 = sma(roc($close, w1), s1);
//   let rcma2 = sma(roc($close, w2), s2);
//   let rcma3 = sma(roc($close, w3), s3);
//   let rcma4 = sma(roc($close, w4), s4);
//   let line = pointwise4((a: float, b: float, c: float, d: float) => a + b * 2 + c * 3 + d * 4, rcma1, rcma2, rcma3, rcma4);
//   return { line: line, signal: sma(line, sig) };
// }

// export function macd($close: Array<float>, winshort: float, winlong: float, winsig: float): MacdStruct {
//   const line = pointwise2((a: float, b: float) => a - b, ema($close, winshort), ema($close, winlong));
//   const signal = ema(line, winsig);
//   const hist = pointwise2((a: float, b: float) => a - b, line, signal);
//   return { line: line, signal: signal, hist: hist };
// }

// export function mfi($high: Array<float>, $low: Array<float>,
//                     $close: Array<float>, $volume: Array<float>, window: float): Array<float> {
//   let pmf = [0], nmf = [0];
//   let tp = typicalPrice($high, $low, $close);
//   for (let i = 1, len = $close.length; i < len; i++) {
//     let diff = tp[i] - tp[i - 1];
//     pmf.push(diff >= 0 ? tp[i] * $volume[i] : 0);
//     nmf.push(diff < 0 ? tp[i] * $volume[i] : 0);
//   }
//   pmf = rolling((s: Array<float>) => s.reduce((sum: float, x: float) => {return sum + x}, 0), pmf, window);
//   nmf = rolling((s: Array<float>) => s.reduce((sum: float, x: float) => {return sum + x}, 0), nmf, window);
//   return pointwise2((a: float, b: float) => 100 - 100 / (1 + a / b), pmf, nmf);
// }

// export function obv($close: Array<float>, $volume: Array<float>, signal: float): LineSignalStruct {
//   let obv = [0];
//   for (let i = 1, len = $close.length; i < len; i++) {
//     obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
//   }
//   return {line: obv, signal: sma(obv, signal)};
// }

// export function roc($close: Array<float>, window: float): Array<float> {
//   let result = new Array(window).fill(NaN);
//   for (let i = window, len = $close.length; i < len; i++) {
//     result.push(100 * ($close[i] - $close[i - window]) / $close[i - window])
//   }
//   return result;
// }

// export function rsi($close: Array<float>, window: float): Array<float> {
//   let gains = [0], loss = [1e-14];
//   for (let i = 1, len = $close.length; i < len; i++) {
//     let diff = $close[i] - $close[i - 1];
//     gains.push(diff >= 0 ? diff : 0);
//     loss.push(diff < 0 ? -diff : 0);
//   }
//   return pointwise2((a: float, b: float) => 100 - 100 / (1 + a / b),
//                    ema(gains, 2 * window - 1), ema(loss, 2 * window - 1));
// }

// export function stoch($high: Array<float>, $low: Array<float>, $close: Array<float>,
//                       window: float, signal: float, smooth: float): LineSignalStruct {
//   let lowest = rolling((s: Array<float>) => Math.min(...s), $low, window);
//   let highest = rolling((s: Array<float>) => Math.max(...s), $high, window);
//   let K = pointwise2((h: float, l: float, c: float) => 100 * (c - l) / (h - l), highest, lowest, $close); 
//   if (smooth > 1) { K = sma(K, smooth) }
//   return { line: K, signal: sma(K, signal) };
// }

// export function stochRsi($close: Array<float>, window: float, signal: float, smooth: float): LineSignalStruct {
//   let _rsi = rsi($close, window);
//   let extreme = rolling((s: Array<float>) => { return { low: Math.min(...s), high: Math.max(...s) }}, _rsi, window);
//   let K = pointwise2((rsi: float, e: any) => (rsi - e.low) / (e.high - e.low), _rsi, extreme);
//   K[0] = 0; if (smooth > 1) { K = sma(K, smooth) }
//   return { line: K, signal: sma(K, signal) };
// }

// export function vi($high: Array<float>, $low: Array<float>, $close: Array<float>, window: float): PlusMinusStruct {
//   let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
//   for(let i = 1, len = $high.length; i < len; i++) {
//     pv.push(Math.abs($high[i] - $low[i-1]));
//     nv.push(Math.abs($high[i-1] - $low[i]));
//   }
//   let apv = rolling((s: Array<float>) => s.reduce((sum: float, x: float) => sum + x, 0), pv, window);
//   let anv = rolling((s: Array<float>) => s.reduce((sum: float, x: float) => sum + x, 0), nv, window);
//   let atr = rolling((s: Array<float>) => s.reduce((sum: float, x: float) => sum + x, 0), trueRange($high, $low, $close), window);
//   return { plus: pointwise2((a: float, b: float) => a / b, apv, atr), minus: pointwise2((a: float, b: float) => a / b, anv, atr) };
// }

// export function williams($high: Array<float>, $low: Array<float>, $close: Array<float>, window: float): Array<float> {
//   return pointwise1((x: float) => x - 100, stoch($high, $low, $close, window, 1, 1).line);
// }