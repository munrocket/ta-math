'use strict';

/* basic functions */

function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}

function sd(array) {
  return rmse(array, new Array(array.length).fill(mean(array)));
}

function mad(array) {
  return mae(array, new Array(array.length).fill(mean(array)));
}

function mae(f, g) {
  const absDiff = pointwise((a, b) => Math.abs(a - b), f, g);
  return (f.length != g.length) ? Infinity : mean(absDiff);
}

function rmse(f, g) {
  const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

/* functional programming */

function pointwise(operation, ...arrays) {
  let result = [];
  for (let i = 0; i < arrays[0].length; i++) {
    let iarray = (i) => arrays.map(x => x[i]);
    result[i] = operation(...iarray(i));
  }
  return result;
}

function rolling(operation, window, array) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* basic indicators & overlays */

function stdev($close, window) {
  return rolling(x => sd(x), window, $close);
}

function expdev($close, window, weight = null) {
  let sqrDiff = pointwise((a, b) => (a - b) * (a - b), $close, ema($close, window));
  return pointwise(x => Math.sqrt(x), ema(sqrDiff, window, weight));
}

function sma($close, window) {
  return rolling(x => mean(x), window, $close);
}

function ema($close, window, weight = null, start = null) {
  weight = weight ? weight : 2 / (window + 1);
  let ema = [ start ? start : mean($close.slice(0, window)) ];
  for (let i = 1; i < $close.length; i++) {
    ema.push($close[i] * weight + ema[i - 1] * (1 - weight));
  }  return ema;
}

function madev($close, window) {
  return rolling(x => mad(x), window, $close);
}

function atr($high, $low, $close, window) {
  let tr = trueRange($high, $low, $close);
  return ema(tr, window, 1 / window);
}

function trueRange($high, $low, $close) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1; i < $low.length; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}

function typicalPrice($high, $low, $close) {
  let tp = [];
  for (let i = 0; i < $low.length; i++) {
    tp.push(($high[i] + $low[i] + $close[i]) / 3);
  }
  return tp;
}

/* indicators */

function macd($close, wshort, wlong, wsig) {
  const line = pointwise((a, b) => a - b, ema($close, wshort), ema($close, wlong));
  const signal = ema(line, wsig);
  const hist = pointwise((a, b) => a - b, line, signal);
  return { line : line, signal : signal, hist : hist };
}

function rsi($close, window) {
  let gains = [0], loss = [1e-14];
  for (let i = 1; i < $close.length; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, window, 1 / window), ema(loss, window, 1 / window));
}

function mfi($high, $low, $close, $volume, window) {
  let pmf = [0], nmf = [0];
  let tp = typicalPrice($high, $low, $close);
  for (let i = 1; i < $close.length; i++) {
    let diff = tp[i] - tp[i - 1];
    pmf.push(diff >= 0 ? tp[i] * $volume[i] : 0);
    nmf.push(diff < 0 ? tp[i] * $volume[i] : 0);
  }
  pmf = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, pmf);
  nmf = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, nmf);
  return pointwise((a, b) => 100 - 100 / (1 + a / b), pmf, nmf);
}

function stoch($high, $low, $close, window, signal, smooth) {
  let lowest = rolling(x => Math.min(...x), window, $low);
  let highest = rolling(x => Math.max(...x), window, $high);
  let K = pointwise((h, l, c) => 100 * (c - l) / (h - l), highest, lowest, $close); 
  if (smooth > 1) { K = sma(K, smooth); }  return { line : K, signal : sma(K, signal) };
}

function stochRsi($close, window, signal, smooth) {
  let _rsi = rsi($close, window);
  let extreme = rolling(x => {return {low: Math.min(...x), high: Math.max(...x)}}, window, _rsi);
  let K = pointwise((rsi, e) => (rsi - e.low) / (e.high - e.low), _rsi, extreme);
  K[0] = 0; if (smooth > 1) { K = sma(K, smooth); }  return { line : K, signal : sma(K, signal) };
}

function vi($high, $low, $close, window) {
  let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
  for(let i = 1; i < $high.length; i++) {
    pv.push(Math.abs($high[i] - $low[i-1]));
    nv.push(Math.abs($high[i-1] - $low[i]));
  }
  let apv = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, pv);
  let anv = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, nv);
  let atr$$1 = rolling(x => x.reduce((sum, x) => {return sum + x}, 0), window, trueRange($high, $low, $close));
  return { plus : pointwise((a, b) => a / b, apv, atr$$1), minus :   pointwise((a, b) => a / b, anv, atr$$1) };
}

function cci($high, $low, $close, window, mult) {
  let tp = typicalPrice($high, $low, $close);
  let tpsma = sma(tp, window);
  let tpmad = madev(tp, window);
  tpmad[0] = Infinity;
  return pointwise((a, b, c) => (a - b) / (c * mult), tp, tpsma, tpmad);
}

function obv($close, $volume, signal) {
  let obv = [0];
  for (let i = 1; i < $close.length; i++) {
    obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
  }
  return {line: obv, signal: sma(obv, signal)};
}

function adl($high, $low, $close, $volume) {
  let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1; i < $high.length; i++) {
    adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
  }
  return adl;
}

function roc($close, window) {
  return rolling(x => 100 * (x[x.length - 1] - x[0]) / x[0], window, $close);
}

function williams($high, $low, $close, window) {
  return pointwise(x => x - 100, stoch($high, $low, $close, window, 1, 1).line);
}

/* overlays */

function bb($close, window, mult) {
  const middle = sma($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, stdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, stdev($close, window));
  return { lower : lower, middle : middle, upper : upper};
}

function ebb($close, window, mult) {
  const middle = ema($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, expdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, expdev($close, window));
  return { lower : lower, middle : middle, upper : upper};
}

function psar($high, $low, stepfactor, maxfactor) {
  let extreme = $low[0],  factor = 0;
  let isUp = true,   psar = [extreme];
  for (let i = 1; i < $high.length; i++) {
    let newsar = psar[i - 1] + factor * (extreme - psar[i - 1]);
    if ((isUp && newsar < $low[i]) || (!isUp && newsar > $high[i])) {
      if ((isUp && $high[i] > extreme) || (!isUp && $low[i] < extreme)) {
        extreme = (isUp) ? $high[i] : $low[i];
        factor = (factor <= maxfactor) ? factor + stepfactor : maxfactor;
      }    } else {
      isUp = !isUp;   factor = stepfactor;
      newsar = (isUp) ? Math.min($low.slice(-3)) : Math.max($high.slice(-3));
      extreme = (isUp) ? $high[i] : $low[i];
    }
    //console.log("sar=" + newsar + "extreme=" + extreme +" factor=" + factor + "dir=" + isUp);
    psar.push(newsar);
  }
  return psar;
}

function vbp($close, $volume, zones, left, right) {
  let vbp = new Array(zones).fill(0);
  let bottom = Infinity, top = -Infinity, total = 0;
  for (let i = left; i < (right ? right : $close.length); i++) {
    total += $volume[i];
    top = (top < $close[i]) ? $close[i] : top;
    bottom = (bottom > $close[i]) ? $close[i] : bottom;
  }
  for (let i = left; i < (right ? right : $close.length); i++) {
    vbp[Math.floor(($close[i] - bottom + 1e-14) / (top - bottom + 2e-14) * (zones - 1))] += $volume[i];
  }
  return { bottom: bottom, top: top, volume: vbp.map((x) => { return x / total })};
}

function keltner($high, $low, $close, window, mult) {
  let middle = ema($close, window);
  let upper = pointwise((a, b) => a + mult * b, middle, atr($high, $low, $close, window));
  let lower = pointwise((a, b) => a - mult * b, middle, atr($high, $low, $close, window));
  return { lower: lower, middle: middle, upper: upper };
}

function zigzag($time, $high, $low, percent) {
  let lowest = $low[0],         thattime = $time[0],    isUp = true;
  let highest = $high[0],       time = [],              zigzag = [];
  for (let i = 1; i < $time.length; i++) {
    if (isUp) {
      if ($high[i] > highest) { thattime = $time[i];    highest = $high[i]; }      if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
        isUp = false;           time.push(thattime);    zigzag.push(highest);   lowest = $low[i];
      }
    } else {
      if ($low[i] < lowest) {   thattime = $time[i];    lowest = $low[i]; }      if ($high[i] > lowest + (highest - lowest) * percent / 100) {
        isUp = true;            time.push(thattime);    zigzag.push(lowest);    highest = $high[i];
      }
    }
  }  return { time : time, price : zigzag};
}

/* formats */

let exchangeFormat = (x) => {
  return {
    length: x.length,
    time: (i) => x[i][0],
    open: (i) => x[i][1],
    high: (i) => x[i][2],
    low: (i) => x[i][3],
    close: (i) => x[i][4],
    volume: (i) => x[i][5]
  }
};

/**
 * Class for calculating technical analysis indicators and overlays
 */
class TA {
  constructor(ohlcv, format = null) {
    this.format = (format == null) ? exchangeFormat : format;

    let proxy = (prop) => new Proxy(this.format(ohlcv)[prop], {
      get: (obj, key) => {
        if (key == 'length') {
          return this.format(ohlcv).length;
        } else if (key == 'slice') {
          return (start, end) => {
            var result = [];
            for (var i = start; i < end; i++) { result.push(obj(i)); }
            return result;
          }
        } else {
          try {
            if (key === parseInt(key).toString()) {
              return obj(key);
            }
          } catch(er) {}
        }
      }
    });

    this.$ = ['time', 'open', 'high', 'low', 'close', 'volume'];
    this.$.forEach(prop => this.$[prop] = proxy(prop));


    /* technical analysy method defenition */

    return {
      sma:      (window = 15)                           =>    sma(this.$.close, window),
      ema:      (window = 10)                           =>    ema(this.$.close, window),
      bb:       (window = 15, mult = 2)                 =>    bb(this.$.close, window, mult),
      ebb:      (window = 10, mult = 2)                 =>    ebb(this.$.close, window, mult),
      psar:     (factor = 0.02, maxfactor = 0.2)        =>    psar(this.$.high, this.$.low, factor, maxfactor),
      vbp:      (zones = 12, left = 0, right = null)    =>    vbp(this.$.close, this.$.volume, zones, left, right),
      keltner:  (window = 14, mult = 2)                 =>    keltner(this.$.high, this.$.low, this.$.close, window, mult),
      zigzag:   (percent = 15)                          =>    zigzag(this.$.time, this.$.high, this.$.low, percent),

      stdev:    (window = 15)                           =>    stdev(this.$.close, window),
      madev:    (window = 15)                           =>    madev(this.$.close, window),
      expdev:   (window = 15)                           =>    expdev(this.$.close, window),
      macd:     (wshort = 12, wlong = 26, wsig = 9)     =>    macd(this.$.close, wshort, wlong, wsig),
      rsi:      (window = 14)                           =>    rsi(this.$.close, window),
      mfi:      (window = 14)                           =>    mfi(this.$.high, this.$.low, this.$.close, this.$.volume, window),
      stoch:    (window = 14, signal = 3, smooth = 1)   =>    stoch(this.$.high, this.$.low, this.$.close, window, signal, smooth),
      stochRsi: (window = 14, signal = 3, smooth = 1)   =>    stochRsi(this.$.close, window, signal, smooth),
      vi:       (window = 14)                           =>    vi(this.$.high, this.$.low, this.$.close, window),
      cci:      (window = 20, mult = 0.015)             =>    cci(this.$.high, this.$.low, this.$.close, window, mult),
      obv:      (signal = 10)                           =>    obv(this.$.close, this.$.volume, signal),
      adl:      ()                                      =>    adl(this.$.high, this.$.low, this.$.close, this.$.volume),
      atr:      (window = 14)                           =>    atr(this.$.high, this.$.low, this.$.close, window),
      williams: (window = 14)                           =>    williams(this.$.high, this.$.low, this.$.close, window),
      roc:      (window = 14)                           =>    roc(this.$.close, window) 
    }
  }
}

module.exports = TA;
