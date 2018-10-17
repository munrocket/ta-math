import { ema, sma, madev, pointwise, rolling, trueRange, typicalPrice, wilderSmooth} from './core';

/* indicators */

export function adl($high, $low, $close, $volume) {
  let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1, len = $high.length; i < len; i++) {
    adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
  }
  return adl;
}

export function adx($high, $low, $close, window) {
  let dmp = [0], dmm = [0];
  for(let i = 1, len = $low.length; i < len; i++) {
    let hd = $high[i] - $high[i - 1];
    let ld = $low[i - 1] - $low[i];
    dmp.push((hd > ld) ? Math.max(hd, 0) : 0);
    dmm.push((ld > hd) ? Math.max(ld, 0) : 0);
  }
  let str = wilderSmooth(trueRange($high, $low, $close), window);
  dmp = wilderSmooth(dmp, window);
  dmm = wilderSmooth(dmm, window);
  let dip = pointwise((a, b) => 100 * a / b, dmp, str);
  let dim = pointwise((a, b) => 100 * a / b, dmm, str);
  let dx = pointwise((a, b) => 100 * Math.abs(a - b) / (a + b), dip, dim);
  //console.log("dip,dim", pointwise((a, b, c) => [a, b, c], dip, dim, dx));
  return {dip: dip, dim: dim, adx: new Array(14).fill(NaN).concat(ema(dx.slice(14), 2 * window - 1))};
}

export function cci($high, $low, $close, window, mult) {
  let tp = typicalPrice($high, $low, $close);
  let tpsma = sma(tp, window);
  let tpmad = madev(tp, window);
  tpmad[0] = Infinity;
  return pointwise((a, b, c) => (a - b) / (c * mult), tp, tpsma, tpmad);
}

export function fi($close, $volume, window) {
  let delta = rolling(x => x[x.length - 1] - x[0], 2, $close);
  return ema(pointwise((a, b) => a * b, delta, $volume), window);
}

export function kst($close, w1, w2, w3, w4, s1, s2, s3, s4, sig) {
  let rcma1 = sma(roc($close, w1), s1);
  let rcma2 = sma(roc($close, w2), s2);
  let rcma3 = sma(roc($close, w3), s3);
  let rcma4 = sma(roc($close, w4), s4);
  let line = pointwise((a, b, c, d) => a + b + c + d, rcma1, rcma2, rcma3, rcma4);
  return { line: line, signal: sma(line, sig) };
}

export function macd($close, winshort, winlong, winsig) {
  const line = pointwise((a, b) => a - b, ema($close, winshort), ema($close, winlong));
  const signal = ema(line, winsig);
  const hist = pointwise((a, b) => a - b, line, signal);
  return { line: line, signal: signal, hist: hist };
}

export function mfi($high, $low, $close, $volume, window) {
  let pmf = [0], nmf = [0];
  let tp = typicalPrice($high, $low, $close);
  for (let i = 1, len = $close.length; i < len; i++) {
    let diff = tp[i] - tp[i - 1];
    pmf.push(diff >= 0 ? tp[i] * $volume[i] : 0);
    nmf.push(diff < 0 ? tp[i] * $volume[i] : 0);
  }
  pmf = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, pmf);
  nmf = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, nmf);
  return pointwise((a, b) => 100 - 100 / (1 + a / b), pmf, nmf);
}

export function obv($close, $volume, signal) {
  let obv = [0];
  for (let i = 1, len = $close.length; i < len; i++) {
    obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
  }
  return {line: obv, signal: sma(obv, signal)};
}

export function roc($close, window) {
  return rolling(x => 100 * (x[x.length - 1] - x[0]) / x[0], window, $close);
}

export function rsi($close, window) {
  let gains = [0], loss = [1e-14];
  for (let i = 1, len = $close.length; i < len; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, 2 * window - 1), ema(loss, 2 * window - 1));
}

export function stoch($high, $low, $close, window, signal, smooth) {
  let lowest = rolling(x => Math.min(...x), window, $low);
  let highest = rolling(x => Math.max(...x), window, $high);
  let K = pointwise((h, l, c) => 100 * (c - l) / (h - l), highest, lowest, $close); 
  if (smooth > 1) { K = sma(K, smooth) }
  return { line: K, signal: sma(K, signal) };
}

export function stochRsi($close, window, signal, smooth) {
  let _rsi = rsi($close, window);
  let extreme = rolling(x => {return {low: Math.min(...x), high: Math.max(...x)}}, window, _rsi);
  let K = pointwise((rsi, e) => (rsi - e.low) / (e.high - e.low), _rsi, extreme);
  K[0] = 0; if (smooth > 1) { K = sma(K, smooth) }
  return { line: K, signal: sma(K, signal) };
}

export function vi($high, $low, $close, window) {
  let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
  for(let i = 1, len = $high.length; i < len; i++) {
    pv.push(Math.abs($high[i] - $low[i-1]));
    nv.push(Math.abs($high[i-1] - $low[i]));
  }
  let apv = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, pv);
  let anv = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, nv);
  let atr = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, trueRange($high, $low, $close));
  return { plus: pointwise((a, b) => a / b, apv, atr), minus: pointwise((a, b) => a / b, anv, atr) };
}

export function williams($high, $low, $close, window) {
  return pointwise(x => x - 100, stoch($high, $low, $close, window, 1, 1).line);
}