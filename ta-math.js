'use strict';

function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}

function sd(array) {
  //const correction = (array.length > 1) ? Math.sqrt(array.length / (array.length - 1)) : 1;
  return rmsd(array, fillarray(array.length, mean(array)));
}

function fillarray(length, value) {
  let result = [];
  for (let i = 0; i < length; i++) {
    result.push(value);
  }
  return result;
}

function rmsd(f, g) {
  const sqrDiff = pointwise(f, g, (a, b) => (a - b) * (a - b));
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

function pointwise(f, g, operation) {
  let result = [];
  for (let i = 0; i < f.length; i++) {
    result.push(operation(f[i], g[i]));
  }
  return result;
}

function rolling(array, window, operation) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

function sma($close, window) {
  return rolling($close, window, x => mean(x));
}

function std($close, window) {
  return rolling($close, window, x => sd(x));
}

function ema($close, window, weight = null) {
  let ema = [$close[0]];
  weight = weight ? weight : 2 / (window + 1);
  for (let i = 1; i < $close.length; i++) {
    ema.push(($close[i] - ema[i - 1]) * weight + ema[i - 1]);
  }  return ema;
}

function bband($close, window, mult) {
  const middle = sma($close, window);
  const upper = pointwise(middle, std($close, window), (a, b) => a + b * mult);
  const lower = pointwise(middle, std($close, window), (a, b) => a - b * mult);
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
    psar.push(newsar);
  }
  return psar;
}

function vbp($close, $volume, zones, left, right) {
  let vbp = fillarray(zones, 0);
  let bottom = Infinity, top = -Infinity, total = 0;
  for (let i = left; i < (right ? right : $close.length); i++) {
    total += $volume[i];
    top = (top < $close[i]) ? $close[i] : top;
    bottom = (bottom > $close[i]) ? $close[i] : bottom;
  }
  for (let i = left; i < (right ? right : $close.length); i++) {
    vbp[Math.floor(($close[i] - bottom + 1e-14) / (top - bottom + 1e-12) * (zones - 1))] += $volume[i];
  }
  return { bottom: bottom, top: top, volume: vbp.map((x) => { return x / total })};
}

function zigzag($time, $high, $low, percent) {
  let lowest = $low[0],         thattime = $time[0],     highest = $high[0];  
  let isUp = true,              time = [],              zigzag = [];
  for (let i = 1; i < $time.length; i++) {
    if (isUp) {
      if ($high[i] > highest) { thattime = $time[i];    highest = $high[i]; }      if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
        isUp = false;           time.push(thattime);    zigzag.push(highest);
      }
    } else {
      if ($low[i] < lowest) {   thattime = $time[i];    lowest = $low[i]; }      if ($high[i] > lowest + (highest - lowest) * percent / 100) {
        isUp = true;            time.push(thattime);    zigzag.push(lowest);
      }
    }
  }  return { time : time, price : zigzag};
}

function macd($close, wshort, wlong, wsig) {
  const line = pointwise(ema($close, wshort), ema($close, wlong), (a, b) => a - b);
  const signal = ema(line, wsig);
  const hist = pointwise(line, signal, (a, b) => a - b);
  return { line : line, signal : signal, hist : hist };
}

function rsi($close, window) {
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

function obv($close, $volume) {
  let obv = [0];
  for (let i = 1; i < $close.length; i++) {
    obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
  }
  return obv;
}

function adl($high, $low, $close, $volume) {
  let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1; i < $high.length; i++) {
    adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
  }
  return adl;
}

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
        if (key == 'length') {                 //length
          return this.format(ohlcv).length;
        } else if (key == 'slice') {          //slice
          return (start, end) => {
            var result = [];
            for (var i = start; i < end; i++) { result.push(obj(i)); }
            return result;
          }
        } else {
          try {
            if (key === parseInt(key).toString()) {   //operator[]
              return obj(key);
            }
          } catch(er) {}
        }
      }
    });

    this.$ = ['time', 'open', 'high', 'low', 'close', 'volume'];
    this.$.forEach(prop => this.$[prop] = proxy(prop));


    /* TECHNICAL ANALYSYS METHOD DEFENITION */

    return {
      sma:    (window = 15)                           =>    sma(this.$.close, window),
      ema:    (window = 10)                           =>    ema(this.$.close, window),
      std:    (window = 15)                           =>    std(this.$.close, window),
      bband:  (window = 15, mult = 2)                 =>    bband(this.$.close, window, mult),
      macd:   (wshort = 12, wlong = 26, wsig = 9)     =>    macd(this.$.close, wshort, wlong, wsig),
      rsi:    (window = 14)                           =>    rsi(this.$.close, window),
      psar:   (factor = 0.02, maxfactor = 0.2)        =>    psar(this.$.high, this.$.low, factor, maxfactor),
      obv:    ()                                      =>    obv(this.$.close, this.$.volume),
      adl:    ()                                      =>    adl(this.$.high, this.$.low, this.$.close, this.$.volume),
      vbp:    (zones = 12, left = 0, right = null)    =>    vbp(this.$.close, this.$.volume, zones, left, right),
      zigzag: (percent = 15)                          =>    zigzag(this.$.time, this.$.high, this.$.low, percent),
    }
  }
}

module.exports = TA;
