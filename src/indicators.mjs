import { pointwise } from './core';
import { ema, sma } from './overlays';

export function macd($close, wshort, wlong, wsig) {
  const line = pointwise(ema($close, wshort), ema($close, wlong), (a, b) => a - b);
  const signal = ema(line, wsig);
  const hist = pointwise(line, signal, (a, b) => a - b);
  return { line : line, signal : signal, hist : hist };
}

export function rsi($close, window) {
  let gains = [1e-14], loss = [0];
  for (let i = 1; i < $close.length; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  let avgain = sma(gains, window);
  let avloss = sma(loss, window);
  return pointwise(avgain, avloss, (a, b) => 100 - 100 / (1 + a / b));
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