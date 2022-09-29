import { sma, ema, wma, stdev, expdev, pointwise, atr, typicalPrice} from './core';

/* overlays */

export function bb($close: Array<number>, window: number, mult: number) {
  let ma = sma($close, window);
  let dev = stdev($close, window);
  let upper = pointwise((a: number, b: number) => a + b * mult, ma, dev);
  let lower = pointwise((a: number, b: number) => a - b * mult, ma, dev);
  return { lower : lower, middle : ma, upper : upper };
}

export function dema($close: Array<number>, window: number) {
  let ema1 = ema($close, window);
  return pointwise((a: number, b: number) => 2 * a - b, ema1, ema(ema1, window));
}

export function ebb($close: Array<number>, window: number, mult: number) {
  let ma = ema($close, window);
  let dev = expdev($close, window);
  let upper = pointwise((a: number, b: number) => a + b * mult, ma, dev);
  let lower = pointwise((a: number, b: number) => a - b * mult, ma, dev);
  return { lower : lower, middle : ma, upper : upper };
}

export function keltner($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number, mult: number) {
  let middle = ema($close, window);
  let upper = pointwise((a: number, b: number) => a + mult * b, middle, atr($high, $low, $close, window));
  let lower = pointwise((a: number, b: number) => a - mult * b, middle, atr($high, $low, $close, window));
  return { lower: lower, middle: middle, upper: upper };
}

export function psar($high: Array<number>, $low: Array<number>, stepfactor: number, maxfactor: number) {
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
    }
    if ((isUp && $low[i] < cursar) || (!isUp && cursar > $high[i])) {
      isUp = !isUp;
      factor = stepfactor;
      cursar = (isUp) ? Math.min(...$low.slice(i - 2, i + 1)) : Math.max(...$high.slice(i - 2, i + 1));
    }
    //console.log(`isUp=${isUp}, c=${$low[i]}, extreme=${extreme.toFixed(2)}, factor=${factor}, sar=${cursar.toFixed(2)}`);
    psar.push(cursar);
  }
  return psar;
}

export function tema($close: Array<number>, window: number) {
  let ema1 = ema($close, window);
  let ema2 = ema(ema1, window);
  return pointwise((a: number, b: number, c: number) => 3 * a - 3 * b + c, ema1, ema2, ema(ema2, window));
}

export function vbp($close: Array<number>, $volume: Array<number>, zones: number, left: number, right: number) {
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
  return { bottom: bottom, top: top, volumes: vbp.map((x) => { return x / total }) };
}

export function vwap($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>) {
  let tp = typicalPrice($high, $low, $close), cumulVTP = [$volume[0] * tp[0]], cumulV = [$volume[0]];
  for(let i = 1, len = $close.length; i < len; i++) {
    cumulVTP[i] = cumulVTP[i - 1] + $volume[i] * tp[i];
    cumulV[i] = cumulV[i - 1] + $volume[i];
  }
  return pointwise((a: number, b: number) => a / b, cumulVTP, cumulV)
}

export function hma(series: Array<number>, window: number) {
  let s1 = wma(series, Math.floor(window / 2));
  let s2 = wma(series, window);
  let s3 = pointwise((a: number, b: number) => 2 * a - b, s1, s2);
  return wma(s3, Math.floor(Math.sqrt(window)));
}

export function zigzag($time: Array<number>, $high: Array<number>, $low: Array<number>, percent: number) {
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
  }
  return { time : time, price : zigzag };
}