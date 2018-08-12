import { sma, ema, stdev, expdev, pointwise, atr} from './core';

/* overlays */

export function bb($close, window, mult) {
  const middle = sma($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, stdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, stdev($close, window));
  return { lower : lower, middle : middle, upper : upper};
}

export function ebb($close, window, mult) {
  const middle = ema($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, expdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, expdev($close, window));
  return { lower : lower, middle : middle, upper : upper};
}

export function psar($high, $low, stepfactor, maxfactor) {
  let isUp = true;
  let factor = stepfactor;
  let extreme = Math.max($high[0], $high[1]);
  let psar = [$low[0], Math.min($low[0],  $low[1])];
  let cursar = psar[1];
  for (let i = 2, len = $high.length; i < len; i++) {
    cursar = cursar + factor * (extreme - cursar);
    if ((isUp && $high[i] > extreme) || (!isUp && $low[i] < extreme)) {
      factor = ((factor <= maxfactor) ? factor + stepfactor : maxfactor);
      extreme = (isUp) ? $high[i] : $low[i];
    };
    if ((isUp && $low[i] < cursar) || (!isUp && cursar > $high[i])) {
      isUp = !isUp;
      factor = stepfactor;
      cursar = (isUp) ? Math.min(...$low.slice(i - 2, i + 1)) : Math.max(...$high.slice(i - 2, i + 1));
      //extreme = (isUp) ? $high[i] : $low[i];
    }
    //console.log(`isUp=${isUp}, c=${$low[i]}, extreme=${extreme.toFixed(2)}, factor=${factor}, sar=${cursar.toFixed(2)}`);
    psar.push(cursar);
  }
  return psar;
}

export function vbp($close, $volume, zones, left, right) {
  let total = 0;
  let bottom = Infinity;
  let top = -Infinity;
  let vbp = new Array(zones).fill(0);
  right = !isNaN(right) ? right : $close.length;
  for (let i = left; i < right; i++) {
    total += $volume[i];
    top = (top < $close[i]) ? $close[i] : top;
    bottom = (bottom > $close[i]) ? $close[i] : bottom;
  }
  for (let i = left; i < right; i++) {
    vbp[Math.floor(($close[i] - bottom) / (top - bottom) * (zones - 1))] += $volume[i];
  }
  return { bottom: bottom, top: top, volumes: vbp.map((x) => { return x / total })};
}

export function keltner($high, $low, $close, window, mult) {
  let middle = ema($close, window);
  let upper = pointwise((a, b) => a + mult * b, middle, atr($high, $low, $close, window));
  let lower = pointwise((a, b) => a - mult * b, middle, atr($high, $low, $close, window));
  return { lower: lower, middle: middle, upper: upper };
}

export function zigzag($time, $high, $low, percent) {
  let lowest = $low[0],         thattime = $time[0],    isUp = false;
  let highest = $high[0],       time = [],              zigzag = [];
  for (let i = 1, len = $time.length; i < len; i++) {
    if (isUp) {
      if ($high[i] > highest) { thattime = $time[i];    highest = $high[i]; }
      else if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
        isUp = false;           time.push(thattime);    zigzag.push(highest);   lowest = $low[i];
      }
    } else {
      if ($low[i] < lowest)   { thattime = $time[i];    lowest = $low[i]; }
      else if ($high[i] > lowest + (highest - lowest) * percent / 100) {
        isUp = true;            time.push(thattime);    zigzag.push(lowest);    highest = $high[i];
      }
    }
  };
  return { time : time, price : zigzag};
}