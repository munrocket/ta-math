import * as indicators from './indicators.mjs';
import * as overlays from './overlays.mjs';

const ohlcvGetter = {
  time: (i) => data[i][0],
  open: (i) => data[i][1],
  high: (i) => data[i][2],
  low: (i) => data[i][3],
  close: (i) => data[i][4],
  volume: (i) => data[i][5]
}

export default function TA(data, priceGetter = ohlcvGetter) {
  TA.data = data;
  TA.$ = priceGetter;
}

TA.sma = (window = 15)                          =>   overlays.sma($.close, window);
TA.ema = (window = 10)                          =>  overlays.ema($.close, window);
TA.std = (window = 15)                          =>  overlays.std($.close, window);
TA.bband = (window = 15, mult = 2)              =>  overlays.bband($.close, window, mult);
TA.macd = (wshort = 12, wlong = 26, wsig = 9)   =>  indicators.macd($.close, wshort, wlong, wsig);
TA.rsi = (window = 14)                          =>  indicators.rsi($.close, window);
TA.vbp = (zones = 12, left = 0, right = null)   =>  overlays.vbp($.close, $.volume, zones, left, right);
TA.zigzag = (percent = 15)                      =>  overlays.zigzag($.time, $.high, $.low, percent);