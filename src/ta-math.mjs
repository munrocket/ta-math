import * as indicators from './indicators';
import * as overlays from './overlays';
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
      sma:    (window = 15)                           =>    overlays.sma(this.$.close, window),
      ema:    (window = 10)                           =>    overlays.ema(this.$.close, window),
      bb:     (window = 15, mult = 2)                 =>    overlays.bb(this.$.close, window, mult),
      ebb:    (window = 10, mult = 2)                 =>    overlays.ebb(this.$.close, window, mult),
      psar:   (factor = 0.02, maxfactor = 0.2)        =>    overlays.psar(this.$.high, this.$.low, factor, maxfactor),
      vbp:    (zones = 12, left = 0, right = null)    =>    overlays.vbp(this.$.close, this.$.volume, zones, left, right),
      keltner:(wmiddle = 20, wchannel = 10, mult = 2) =>    overlays.keltner(this.$.high, this.$.low, this.$.close, wmiddle, wchannel, mult),
      zigzag: (percent = 15)                          =>    overlays.zigzag(this.$.time, this.$.high, this.$.low, percent),

      stddev: (window = 15)                           =>    indicators.stddev(this.$.close, window),
      expdev: (window = 15)                           =>    indicators.expdev(this.$.close, window),
      macd:   (wshort = 12, wlong = 26, wsig = 9)     =>    indicators.macd(this.$.close, wshort, wlong, wsig),
      rsi:    (window = 14)                           =>    indicators.rsi(this.$.close, window),
      stoch:  (window = 14, signal = 3, smooth = 1)   =>    indicators.stoch(this.$.high, this.$.low, this.$.close, window, signal, smooth),
      obv:    ()                                      =>    indicators.obv(this.$.close, this.$.volume),
      adl:    ()                                      =>    indicators.adl(this.$.high, this.$.low, this.$.close, this.$.volume),
      atr:    (window = 14)                           =>    indicators.atr(this.$.high, this.$.low, this.$.close, window),
      vi:     (window = 14)                           =>    indicators.vi(this.$.high, this.$.low, this.$.close, window),
    }
  }
}