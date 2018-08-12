import { ema, sma, madev, pointwise, rolling, trueRange, typicalPrice} from './core';

/* indicators */

export function macd($close, wshort, wlong, wsig) {
  const line = pointwise((a, b) => a - b, ema($close, wshort), ema($close, wlong));
  const signal = ema(line, wsig);
  const hist = pointwise((a, b) => a - b, line, signal);
  return { line : line, signal : signal, hist : hist };
}

export function rsi($close, window) {
  let gains = [0], loss = [1e-14];
  for (let i = 1, len = $close.length; i < len; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, window, 1 / window), ema(loss, window, 1 / window));
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

export function stoch($high, $low, $close, window, signal, smooth) {
  let lowest = rolling(x => Math.min(...x), window, $low);
  let highest = rolling(x => Math.max(...x), window, $high);
  let K = pointwise((h, l, c) => 100 * (c - l) / (h - l), highest, lowest, $close); 
  if (smooth > 1) { K = sma(K, smooth) }
  return { line : K, signal : sma(K, signal) };
}

export function stochRsi($close, window, signal, smooth) {
  let _rsi = rsi($close, window);
  let extreme = rolling(x => {return {low: Math.min(...x), high: Math.max(...x)}}, window, _rsi);
  let K = pointwise((rsi, e) => (rsi - e.low) / (e.high - e.low), _rsi, extreme);
  K[0] = 0; if (smooth > 1) { K = sma(K, smooth) }
  return { line : K, signal : sma(K, signal) };
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
  return { plus : pointwise((a, b) => a / b, apv, atr), minus :   pointwise((a, b) => a / b, anv, atr) };
}

export function cci($high, $low, $close, window, mult) {
  let tp = typicalPrice($high, $low, $close);
  let tpsma = sma(tp, window);
  let tpmad = madev(tp, window);
  tpmad[0] = Infinity;
  return pointwise((a, b, c) => (a - b) / (c * mult), tp, tpsma, tpmad);
}

export function obv($close, $volume, signal) {
  let obv = [0];
  for (let i = 1, len = $close.length; i < len; i++) {
    obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
  }
  return {line: obv, signal: sma(obv, signal)};
}

export function adl($high, $low, $close, $volume) {
  let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1, len = $high.length; i < len; i++) {
    adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
  }
  return adl;
}

export function roc($close, window) {
  return rolling(x => 100 * (x[x.length - 1] - x[0]) / x[0], window, $close);
}

export function williams($high, $low, $close, window) {
  return pointwise(x => x - 100, stoch($high, $low, $close, window, 1, 1).line);
}