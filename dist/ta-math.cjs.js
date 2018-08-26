'use strict';

var util = require('util');

/* basic math */

function mean(series) {
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
  }
  return sum / series.length;
}

function sd(series) {
  return rmse(series, new Array(series.length).fill(mean(series)));
}

function mad(array) {
  return mae(array, new Array(array.length).fill(mean(array)));
}

/* scaled and percentage errors */

function mae(f, g) {
  const absDiff = pointwise((a, b) => Math.abs(a - b), f, g);
  return (f.length != g.length) ? Infinity : mean(absDiff);
}

function rmse(f, g) {
  const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

/* functional programming */

function pointwise(operation, ...serieses) {
  let result = [];
  for (let i = 0, len = serieses[0].length; i < len; i++) {
    let iseries = (i) => serieses.map(x => x[i]);
    result[i] = operation(...iseries(i));
  }
  return result;
}

function rolling(operation, window, series) {
  let result = [];
  for (let i = 0, len = series.length; i < len; i++) {
    let j = i + 1 - window;
    result.push(operation(series.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

/* core indicators & overlays */

function sma($close, window) {
  return rolling(x => mean(x), window, $close);
}

function ema($close, window, weight = null, start = null) {
  weight = weight ? weight : 2 / (window + 1);
  let ema = [ start ? start : mean($close.slice(0, window)) ];
  for (let i = 1, len = $close.length; i < len; i++) {
    ema.push($close[i] * weight + (1 - weight) * ema[i - 1]);
  }
  return ema;
}

function stdev($close, window) {
  return rolling(x => sd(x), window, $close);
}

function madev($close, window) {
  return rolling(x => mad(x), window, $close);
}

function expdev($close, window) {
  let sqrDiff = pointwise((a, b) => (a - b) * (a - b), $close, ema($close, window));
  return pointwise(x => Math.sqrt(x), ema(sqrDiff, window));
}

function atr($high, $low, $close, window) {
  let tr = trueRange($high, $low, $close);
  return ema(tr, window, 1 / window);
}

/* price transformations */

function typicalPrice($high, $low, $close) {
  return pointwise((a, b, c) => (a + b + c) / 3, $high, $low, $close);
}

function trueRange($high, $low, $close) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1, len = $low.length; i < len; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
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
  for (let i = 1, len = $close.length; i < len; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, window, 1 / window), ema(loss, window, 1 / window));
}

function mfi($high, $low, $close, $volume, window) {
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

function stoch($high, $low, $close, window, signal, smooth) {
  let lowest = rolling(x => Math.min(...x), window, $low);
  let highest = rolling(x => Math.max(...x), window, $high);
  let K = pointwise((h, l, c) => 100 * (c - l) / (h - l), highest, lowest, $close); 
  if (smooth > 1) { K = sma(K, smooth); }
  return { line : K, signal : sma(K, signal) };
}

function stochRsi($close, window, signal, smooth) {
  let _rsi = rsi($close, window);
  let extreme = rolling(x => {return {low: Math.min(...x), high: Math.max(...x)}}, window, _rsi);
  let K = pointwise((rsi, e) => (rsi - e.low) / (e.high - e.low), _rsi, extreme);
  K[0] = 0; if (smooth > 1) { K = sma(K, smooth); }
  return { line : K, signal : sma(K, signal) };
}

function vi($high, $low, $close, window) {
  let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
  for(let i = 1, len = $high.length; i < len; i++) {
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
  for (let i = 1, len = $close.length; i < len; i++) {
    obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
  }
  return {line: obv, signal: sma(obv, signal)};
}

function adl($high, $low, $close, $volume) {
  let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
  for (let i = 1, len = $high.length; i < len; i++) {
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

function dema($close, window) {
  let ema1 = ema($close, window);
  return pointwise((a, b) => 2 * a - b, ema1, ema(ema1, window));
}

function tema($close, window) {
  let ema1 = ema($close, window);
  let ema2 = ema(ema1, window);
  return pointwise((a, b, c) => 3 * a - 3 * b + c, ema1, ema2, ema(ema2, window));
}

function bb($close, window, mult) {
  const middle = sma($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, stdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, stdev($close, window));
  return { lower : lower, middle : middle, upper : upper };
}

function ebb($close, window, mult) {
  const middle = ema($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, expdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, expdev($close, window));
  return { lower : lower, middle : middle, upper : upper };
}

function psar($high, $low, stepfactor, maxfactor) {
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
      //extreme = (isUp) ? $high[i] : $low[i];
    }
    //console.log(`isUp=${isUp}, c=${$low[i]}, extreme=${extreme.toFixed(2)}, factor=${factor}, sar=${cursar.toFixed(2)}`);
    psar.push(cursar);
  }
  return psar;
}

function vbp($close, $volume, zones, left, right) {
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

function keltner($high, $low, $close, window, mult) {
  let middle = ema($close, window);
  let upper = pointwise((a, b) => a + mult * b, middle, atr($high, $low, $close, window));
  let lower = pointwise((a, b) => a - mult * b, middle, atr($high, $low, $close, window));
  return { lower: lower, middle: middle, upper: upper };
}

function vwap($high, $low, $close, $volume) {
  let tp = typicalPrice($high, $low, $close), cumulVTP = [$volume[0] * tp[0]], cumulV = [$volume[0]];
  for(let i = 1, len = $close.length; i < len; i++) {
    cumulVTP[i] = cumulVTP[i - 1] + $volume[i] * tp[i];
    cumulV[i] = cumulV[i - 1] + $volume[i];
  }
  return pointwise((a, b) => a / b, cumulVTP, cumulV)
}

function zigzag($time, $high, $low, percent) {
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

/* data formats */

let simpleFormat = (x) => {
  return {
    length: x[4].length,
    time: (i) => x[0][i],
    open: (i) => x[1][i],
    high: (i) => x[2][i],
    low: (i) => x[3][i],
    close: (i) => x[4][i],
    volume: (i) => x[5][i]
  }
};

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

let objectFormat = (x) => {
  return {
    length: x.close.length,
    time: (i) => x.time[i],
    open: (i) => x.open[i],
    high: (i) => x.high[i],
    low: (i) => x.low[i],
    close: (i) => x.close[i],
    volume: (i) => x.volume[i]
  }
};

/**
 * Class for calculating technical analysis indicators and overlays
 */
class TA {
  constructor(ohlcv, format = null) {
    this.time = null;
    this.open = null;
    this.high = null;
    this.low = null;
    this.close = null;
    this.volume = null;

    this.ohlcv = ohlcv;
    this.format = (format == null) ? exchangeFormat : format;
  }

  /* price getters */
  initGetter(name) {
    let result = [], length = this.format(this.ohlcv)['length'];
    for(let i = 0; i < length; i++) { result.push(this.format(this.ohlcv)[name](i)); }
    return result;
  }
  get $time() { return util.isNull(this['time']) ? this.initGetter('time') : this['time'] }
  get $open() { return util.isNull(this['open']) ? this.initGetter('open') : this['open'] }
  get $high() { return util.isNull(this['high']) ? this.initGetter('high') : this['high'] }
  get $low() { return util.isNull(this['low']) ? this.initGetter('low') : this['low'] }
  get $close() { return util.isNull(this['close']) ? this.initGetter('close') : this['close'] }
  get $volume() { return util.isNull(this['volume']) ? this.initGetter('volume') : this['volume'] }
  
  /* formats */
  static simpleFormat()                                                 { return simpleFormat }
  static exchangeFormat()                                               { return exchangeFormat }
  static objectFormat()                                                 { return objectFormat }

  /* static defenition of technical analysis methods */
  static sma($close, window = 15)                                       { return sma($close, window) }
  static ema($close, window = 10)                                       { return ema($close, window) }
  static dema($close, window = 10)                                      { return dema($close, window) }
  static tema($close, window = 10)                                      { return tema($close, window) }
  static bb($close, window = 15, mult = 2)                              { return bb($close, window, mult) }
  static ebb($close, window = 10, mult = 2)                             { return ebb($close, window, mult) }
  static psar($high, $low, factor = 0.02, maxfactor = 0.2)              { return psar($high, $low, factor, maxfactor) }
  static vbp($close, $volume, zones = 12, left = 0, right = NaN)        { return vbp($close, $volume, zones, left, right) }
  static keltner($high, $low, $close, window = 14, mult = 2)            { return keltner($high, $low, $close, window, mult) }
  static vwap($high, $low, $close, $volume)                             { return vwap($high, $low, $close, $volume) }
  static zigzag($time, $high, $low, percent = 15)                       { return zigzag($time, $high, $low, percent) }    
  static stdev($close, window = 15)                                     { return stdev($close, window) }
  static madev($close, window = 15)                                     { return madev($close, window) }
  static expdev($close, window = 15)                                    { return expdev($close, window) }
  static macd($close, wshort = 12, wlong = 26, wsig = 9)                { return macd($close, wshort, wlong, wsig) }
  static rsi($close, window = 14)                                       { return rsi($close, window) }
  static mfi($high, $low, $close, $volume, window = 14)                 { return mfi($high, $low, $close, $volume, window) }
  static stoch($high, $low, $close, window = 14, signal = 3, smooth = 1){ return stoch($high, $low, $close, window, signal, smooth) }
  static stochRsi($close, window = 14, signal = 3, smooth = 1)          { return stochRsi($close, window, signal, smooth) }
  static vi($high, $low, $close, window = 14)                           { return vi($high, $low, $close, window) }
  static cci($high, $low, $close, window = 20, mult = 0.015)            { return cci($high, $low, $close, window, mult) }
  static obv($close, $volume, signal = 10)                              { return obv($close, $volume, signal) }
  static adl($high, $low, $close, $volume)                              { return adl($high, $low, $close, $volume) }
  static atr($high, $low, $close, window = 14)                          { return atr($high, $low, $close, window) }
  static williams($high, $low, $close, window = 14)                     { return williams($high, $low, $close, window) }
  static roc($close, window = 14)                                       { return roc($close, window) }

  /* member defenition of technical analysis methods */
  sma(window = 15)                                                      { return TA.sma(this.$close, window) }
  ema(window = 10)                                                      { return TA.ema(this.$close, window) }
  dema(window = 10)                                                     { return TA.dema(this.$close, window) }
  tema(window = 10)                                                     { return TA.tema(this.$close, window) }
  bb(window = 15, mult = 2)                                             { return TA.bb(this.$close, window, mult) }
  ebb(window = 10, mult = 2)                                            { return TA.ebb(this.$close, window, mult) }
  psar(factor = 0.02, maxfactor = 0.2)                                  { return TA.psar(this.$high, this.$low, factor, maxfactor) }
  vbp(zones = 12, left = 0, right = NaN)                                { return TA.vbp(this.$close, this.$volume, zones, left, right) }
  keltner(window = 14, mult = 2)                                        { return TA.keltner(this.$high, this.$low, this.$close, window, mult) }
  vwap()                                                                { return TA.vwap(this.$high, this.$low, this.$close, this.$volume) }
  zigzag(percent = 15)                                                  { return TA.zigzag(this.$time, this.$high, this.$low, percent) }    
  stdev(window = 15)                                                    { return TA.stdev(this.$close, window) }
  madev(window = 15)                                                    { return TA.madev(this.$close, window) }
  expdev(window = 15)                                                   { return TA.expdev(this.$close, window) }
  macd(wshort = 12, wlong = 26, wsig = 9)                               { return TA.macd(this.$close, wshort, wlong, wsig) }
  rsi(window = 14)                                                      { return TA.rsi(this.$close, window) }
  mfi(window = 14)                                                      { return TA.mfi(this.$high, this.$low, this.$close, this.$volume, window) }
  stoch(window = 14, signal = 3, smooth = 1)                            { return TA.stoch(this.$high, this.$low, this.$close, window, signal, smooth) }
  stochRsi(window = 14, signal = 3, smooth = 1)                         { return TA.stochRsi(this.$close, window, signal, smooth) }
  vi(window = 14)                                                       { return TA.vi(this.$high, this.$low, this.$close, window) }
  cci(window = 20, mult = 0.015)                                        { return TA.cci(this.$high, this.$low, this.$close, window, mult) }
  obv(signal = 10)                                                      { return TA.obv(this.$close, this.$volume, signal) }
  adl()                                                                 { return TA.adl(this.$high, this.$low, this.$close, this.$volume) }
  atr(window = 14)                                                      { return TA.atr(this.$high, this.$low, this.$close, window) }
  williams(window = 14)                                                 { return TA.williams(this.$high, this.$low, this.$close, window) }
  roc(window = 14)                                                      { return TA.roc(this.$close, window) }
}

module.exports = TA;
