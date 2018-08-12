import * as core from './core';
import * as indicators from './indicators';
import * as overlays from './overlays';
import * as formats from './formats';

/**
 * Class for calculating technical analysis indicators and overlays
 */
export default class TA {
  constructor(ohlcv, format = null) {
    this.format = (format == null) ? formats.objectFormat : format;

    let proxy = (prop) => new Proxy(this.format(ohlcv)[prop], {
      get: (obj, key) => {
        if (key == 'length') {
          return this.format(ohlcv).length;
        } else if (key == 'slice') {
          return (start, end) => {
            let result = [];
            for (let i = start; i < end; i++) { result.push(obj(i)); }
            return result;
          }
        } else {
          if (key === parseInt(key).toString()) { return obj(key); }
        }
      }
    });

    this.$ = ['time', 'open', 'high', 'low', 'close', 'volume'];
    this.$.forEach(prop => this.$[prop] = proxy(prop));
  }
  
  /* formats */
  static simpleFormat()                             { return formats.simpleFormat }
  static exchangeFormat()                           { return formats.exchangeFormat }
  static objectFormat()                             { return formats.objectFormat }

  /* price getters */
  get $time()                                       { return this.$.time }
  get $open()                                       { return this.$.open }
  get $high()                                       { return this.$.high }
  get $low()                                        { return this.$.low }
  get $close()                                      { return this.$.close }
  get $volume()                                     { return this.$.volume }

  /* defenition of technical analysis methods */
  sma(window = 15)                                  { return core.sma(this.$close, window) }
  ema(window = 10)                                  { return core.ema(this.$close, window) }
  bb(window = 15, mult = 2)                         { return overlays.bb(this.$close, window, mult) }
  ebb(window = 10, mult = 2)                        { return overlays.ebb(this.$close, window, mult) }
  psar(factor = 0.02, maxfactor = 0.2)              { return overlays.psar(this.$high, this.$low, factor, maxfactor) }
  vbp(zones = 12, left = 0, right = NaN)            { return overlays.vbp(this.$close, this.$volume, zones, left, right) }
  keltner(window = 14, mult = 2)                    { return overlays.keltner(this.$high, this.$low, this.$close, window, mult) }
  zigzag(percent = 15)                              { return overlays.zigzag(this.$time, this.$high, this.$low, percent) }    
  stdev(window = 15)                                { return core.stdev(this.$close, window) }
  madev(window = 15)                                { return core.madev(this.$close, window) }
  expdev(window = 15)                               { return core.expdev(this.$close, window) }
  macd(wshort = 12, wlong = 26, wsig = 9)           { return indicators.macd(this.$close, wshort, wlong, wsig) }
  rsi(window = 14)                                  { return indicators.rsi(this.$close, window) }
  mfi(window = 14)                                  { return indicators.mfi(this.$high, this.$low, this.$close, this.$volume, window) }
  stoch(window = 14, signal = 3, smooth = 1)        { return indicators.stoch(this.$high, this.$low, this.$close, window, signal, smooth) }
  stochRsi(window = 14, signal = 3, smooth = 1)     { return indicators.stochRsi(this.$close, window, signal, smooth) }
  vi(window = 14)                                   { return indicators.vi(this.$high, this.$low, this.$close, window) }
  cci(window = 20, mult = 0.015)                    { return indicators.cci(this.$high, this.$low, this.$close, window, mult) }
  obv(signal = 10)                                  { return indicators.obv(this.$close, this.$volume, signal) }
  adl()                                             { return indicators.adl(this.$high, this.$low, this.$close, this.$volume) }
  atr(window = 14)                                  { return core.atr(this.$high, this.$low, this.$close, window) }
  williams(window = 14)                             { return indicators.williams(this.$high, this.$low, this.$close, window) }
  roc(window = 14)                                  { return indicators.roc(this.$close, window) }
}