import * as indicators from './indicators';
import * as overlays from './overlays';
import { generify } from './core';
import { exchangeFormat } from './formats';

/**
 * Class for calculating technical analysis indicators and overlays
 */
export default class TA {
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
      sma:    (window = 15)                           =>    generify(overlays.sma(this.$.close, window), this.$.close),
      ema:    (window = 10)                           =>    generify(overlays.ema(this.$.close, window), this.$.close),
      bb:     (window = 15, mult = 2)                 =>    generify(overlays.bb(this.$.close, window, mult), this.$.close),
      ebb:    (window = 10, mult = 2)                 =>    generify(overlays.ebb(this.$.close, window, mult), this.$.close),
      psar:   (factor = 0.02, maxfactor = 0.2)        =>    generify(overlays.psar(this.$.high, this.$.low, factor, maxfactor), this.$.high),
      vbp:    (zones = 12, left = 0, right = null)    =>    generify(overlays.vbp(this.$.close, this.$.volume, zones, left, right), this.$.close),
      keltner:(wmiddle = 20, wchannel = 10, mult = 2) =>    generify(overlays.keltner(this.$.high, this.$.low, this.$.close, wmiddle, wchannel, mult), this.$.high),
      zigzag: (percent = 15)                          =>    generify(overlays.zigzag(this.$.time, this.$.high, this.$.low, percent), this.$.high),

      stddev: (window = 15)                           =>    generify(indicators.stddev(this.$.close, window), this.$.close),
      expdev: (window = 15)                           =>    generify(indicators.expdev(this.$.close, window), this.$.close),
      macd:   (wshort = 12, wlong = 26, wsig = 9)     =>    generify(indicators.macd(this.$.close, wshort, wlong, wsig), this.$.close),
      rsi:    (window = 14)                           =>    generify(indicators.rsi(this.$.close, window), this.$.close),
      stoch:  (window = 14, signal = 3, smooth = 1)   =>    generify(indicators.stoch(this.$.high, this.$.low, this.$.close, window, signal, smooth), this.$.close),
      obv:    ()                                      =>    generify(indicators.obv(this.$.close, this.$.volume), this.$.close),
      adl:    ()                                      =>    generify(indicators.adl(this.$.high, this.$.low, this.$.close, this.$.volume), this.$.close),
      atr:    (window = 14)                           =>    generify(indicators.atr(this.$.high, this.$.low, this.$.close, window), this.$.close),
      vi:     (window = 14)                           =>    generify(indicators.vi(this.$.high, this.$.low, this.$.close, window), this.$.close)
    }
  }
}