import { rolling, mean, sd, pointwise, fillarray } from './core';

export function sma($close, window) {
  return rolling($close, window, x => mean(x));
}

export function std($close, window) {
  return rolling($close, window, x => sd(x));
}

export function ema($close, window, weight = null) {
  let result = [$close[0]];
  weight = weight ? weight : 2 / (window + 1);
  for (let i = 1; i < $close.length; i++) {
    result.push(($close[i] - result[i - 1]) * weight + result[i - 1]);
  };
  return result;
}

export function bband($close, window, mult) {
  const middle = sma($close, window);
  const upper = pointwise(middle, std($close, window), (a, b) => a + b * mult);
  const lower = pointwise(middle, std($close, window), (a, b) => a - b * mult);
  return [upper, middle, lower];
}

export function vbp($close, $volume, nzones, left, right) {
  let result = fillarray(nzones, 0);
  let bottom = Infinity, top = -Infinity, total = 0;
  for (let i = left; i < (right ? right : $close.length); i++) {
    total += $volume[i];
    top = (top < $close[i]) ? $close[i] : top;
    bottom = (bottom > $close[i]) ? $close[i] : bottom;
  }
  for (let i = left; i < (right ? right : $close.length); i++) {
    result[Math.floor(($close[i] - bottom + 1e-14) / (top - bottom + 1e-12) * nzones)] += $volume[i];
  }
  return { bottom: bottom, top: top, volumes: result.map((x) => { return x / total })};
}

export function zigzag($time, $high, $low, percent) {
  let low = $low[0];    let high = $high[0];
  let isUp = true;      let time = [],        zigzag = [];
  for (let i = 1; i < $time.length; i++) {
    if (isUp) {
      high = ($high[i] > high) ? $high[i] : high;
      if ($low[i] < low + (high - low) * (100 - percent) / 100) {
        isUp = false;   time.push($time[0]);  zigzag.push($low[0]);
      }
    } else {
      low = ($low[i] < low) ? $low[i] : low;
      if ($high[i] > low + (high - low) * percent / 100) {
        isUp = true;    time.push($time[0]);  zigzag.push($low[0]);
      }
    }
  }
  return [time.pop(), zigzag.pop()];
}