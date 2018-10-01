import * as core from './core';
import * as indicators from './indicators';
import * as overlays from './overlays';
import * as formats from './formats';

/**
 * Class for calculating technical analysis indicators and overlays
 */
export default class TA {
  constructor(ohlcv, format) {
    this.ohlcv = ohlcv;
    this.format = (format === undefined) ? TA.exchangeFormat : format;
  }

  /* price getters */
  initGetter(name) {
    let result = [], length = this.format(this.ohlcv)['length'];
    for(let i = 0; i < length; i++) { result.push(this.format(this.ohlcv)[name](i)) }
    this[name] = result;
    return result;
  }
  get $time()   { return (this.time === undefined) ? this.initGetter('time') : this.time }
  get $open()   { return (this.open === undefined) ? this.initGetter('open') : this.open }
  get $high()   { return (this.high === undefined) ? this.initGetter('high') : this.high }
  get $low()    { return (this.low === undefined) ? this.initGetter('low') : this.low }
  get $close()  { return (this.close === undefined) ? this.initGetter('close') : this.close }
  get $volume() { return (this.volume === undefined) ? this.initGetter('volume') : this.volume }

  /* formats */
  static get simpleFormat()   { return formats.simpleFormat }
  static get exchangeFormat() { return formats.exchangeFormat }
  static get objectFormat()   { return formats.objectFormat }

  /* static defenition of technical analysis methods */
  static sma($close, window = 15)                                       { return core.sma($close, window) }
  static ema($close, window = 10)                                       { return core.ema($close, window) }
  static dema($close, window = 10)                                      { return overlays.dema($close, window) }
  static tema($close, window = 10)                                      { return overlays.tema($close, window) }
  static bb($close, window = 15, mult = 2)                              { return overlays.bb($close, window, mult) }
  static ebb($close, window = 10, mult = 2)                             { return overlays.ebb($close, window, mult) }
  static psar($high, $low, factor = 0.02, maxfactor = 0.2)              { return overlays.psar($high, $low, factor, maxfactor) }
  static vbp($close, $volume, zones = 12, left = 0, right = NaN)        { return overlays.vbp($close, $volume, zones, left, right) }
  static keltner($high, $low, $close, window = 14, mult = 2)            { return overlays.keltner($high, $low, $close, window, mult) }
  static vwap($high, $low, $close, $volume)                             { return overlays.vwap($high, $low, $close, $volume) }
  static zigzag($time, $high, $low, percent = 15)                       { return overlays.zigzag($time, $high, $low, percent) }    
  static stdev($close, window = 15)                                     { return core.stdev($close, window) }
  static madev($close, window = 15)                                     { return core.madev($close, window) }
  static expdev($close, window = 15)                                    { return core.expdev($close, window) }
  static macd($close, wshort = 12, wlong = 26, wsig = 9)                { return indicators.macd($close, wshort, wlong, wsig) }
  static rsi($close, window = 14)                                       { return indicators.rsi($close, window) }
  static mfi($high, $low, $close, $volume, window = 14)                 { return indicators.mfi($high, $low, $close, $volume, window) }
  static stoch($high, $low, $close, window = 14, signal = 3, smooth = 1){ return indicators.stoch($high, $low, $close, window, signal, smooth) }
  static stochRsi($close, window = 14, signal = 3, smooth = 1)          { return indicators.stochRsi($close, window, signal, smooth) }
  static vi($high, $low, $close, window = 14)                           { return indicators.vi($high, $low, $close, window) }
  static cci($high, $low, $close, window = 20, mult = 0.015)            { return indicators.cci($high, $low, $close, window, mult) }
  static obv($close, $volume, signal = 10)                              { return indicators.obv($close, $volume, signal) }
  static adl($high, $low, $close, $volume)                              { return indicators.adl($high, $low, $close, $volume) }
  static atr($high, $low, $close, window = 14)                          { return core.atr($high, $low, $close, window) }
  static williams($high, $low, $close, window = 14)                     { return indicators.williams($high, $low, $close, window) }
  static roc($close, window = 14)                                       { return indicators.roc($close, window) }

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

  /* correlation functions */

  static cov(f, g)                                                      { return core.cov(f, g) }
  static cor(f, g)                                                      { return core.cor(f, g) }
}