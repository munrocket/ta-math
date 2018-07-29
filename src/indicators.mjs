import { sd, pointwise, rolling, trueRange} from './core';
import { ema, sma } from './overlays';

/* indicators */

export function* stddev($close, window) {
  yield* rolling(x => sd(x), window, $close);
}

export function expdev($close, window, weight = null) {
  let sqrDiff = pointwise((a, b) => (a - b) * (a - b), $close, ema($close, window));
  return pointwise(x => Math.sqrt(x), ema(sqrDiff, window, weight));
}

export function macd($close, wshort, wlong, wsig) {
  const line = pointwise((a, b) => a - b, ema($close, wshort), ema($close, wlong));
  const signal = ema(line, wsig);
  const hist = pointwise((a, b) => a - b, line, signal);
  return { line : line, signal : signal, hist : hist };
}

export function rsi($close, window) {
  let gains = [0], loss = [1e-14];
  for (let i = 1; i < $close.length; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, window, 1 / window), ema(loss, window, 1 / window));
}

export function stoch($high, $low, $close, window, signal, smooth) {
  let lowest = rolling(x => Math.min(...x), window, $low);
  let highest = rolling(x => Math.max(...x), window, $high);
  let K = pointwise(function (h, l, c) {return 100 * (c - l) / (h - l)}, highest, lowest, $close); 
  if (smooth > 1) { K = sma(K, smooth) };
  return { line : K, signal : sma(K, signal) };
}

export function obv($close, $volume) {
  let obv = [0];
  for (let i = 1; i < $close.length; i++) {
    obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
  }
  return obv;
}

export function adl($high, $low, $close, $volume) {
  let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1; i < $high.length; i++) {
    adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
  }
  return adl;
}

export function atr($high, $low, $close, window) {
  let tr = trueRange($high, $low, $close);
  return ema(tr, window, 1 / window);
}

export function vi($high, $low, $close, window) {
  let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
  for(let i = 1; i < $high.length; i++) {
    pv.push(Math.abs($high[i] - $low[i-1]));
    nv.push(Math.abs($high[i-1] - $low[i]));
  }
  let apv = rolling(x => x.reduce((sum, a) => {return sum + a;}, 0), window, pv);
  let anv = rolling(x => x.reduce((sum, a) => {return sum + a;}, 0), window, nv);
  let atr = rolling(x => x.reduce((sum, a) => {return sum + a;}, 0), window, trueRange($high, $low, $close));
  return { plus : pointwise((a, b) => a / b, apv, atr), minus :   pointwise((a, b) => a / b, anv, atr) };
}