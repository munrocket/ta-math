import * as indicators from './indicators.mjs';
import * as overlays from './overlays.mjs';

export default function TA(ohlcv) {

  let _ohlcv = [[],[],[],[],[],[]];

  let $ = {
    get time()    { return getAndSave(0) },
    get open()    { return getAndSave(1) },
    get high()    { return getAndSave(2) },
    get low()     { return getAndSave(3) },
    get close()   { return getAndSave(4) },
    get volume()  { return getAndSave(5) },
  }

  let getAndSave = function(i) {
    if (_ohlcv[i].length == 0) {
      for (let j = 0; j < ohlcv.length; j++) {
        _ohlcv[i].push(ohlcv[j][i]);
      }
    }
    return _ohlcv[i];
  }  

  return {
    $:$,
    sma:    (window = 15)                           =>  overlays.sma($.close, window),
    ema:    (window = 10)                           =>  overlays.ema($.close, window),
    std:    (window = 15)                           =>  overlays.std($.close, window),
    bband:  (window = 15, mult = 2)                 =>  overlays.bband($.close, window, mult),
    macd:   (wshort = 12, wlong = 26, wsig = 9)     =>  indicators.macd($.close, wshort, wlong, wsig),
    rsi:    (window = 14)                           =>  indicators.rsi($.close, window),
    vbp:    (zones = 12, left = 0, right = null)    =>  overlays.vbp($.close, $.volume, zones, left, right),
    zigzag: (percent = 15)                          =>  overlays.zigzag($.time, $.high, $.low, percent),
  }
}