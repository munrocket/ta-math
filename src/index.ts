import * as core from './core';
import * as indicators from './indicators';
import * as overlays from './overlays';
import * as formats from './formats';
import { Format } from './formats';

interface ILookup                 { [index: string]: any; }
class CLookup implements ILookup  { [index: string]: any; }

export default class TA extends CLookup {

  format: Format;
  ohlcv: any;
  time: Array<number>;
  open: Array<number>;
  high: Array<number>;
  low: Array<number>;
  close: Array<number>;
  volume: Array<number>;

  constructor(ohlcv: any, format: Format) {
    super();
    this.ohlcv = ohlcv;
    this.format = (format === undefined) ? TA.exchangeFormat : format;
  }

  /* price getters */
  initGetter(name: string) {
    let result = [], length = this.format(this.ohlcv)['length'];
    for(let i = 0; i < length; i++) { result.push(this.format(this.ohlcv)[name](i)) }
    this[name] = result;
    return result;
  }
  get $time() { return (this.time === undefined) ? this.initGetter('time') : this.time }
  get $open() { return (this.open === undefined) ? this.initGetter('open') : this.open }
  get $high() { return (this.high === undefined) ? this.initGetter('high') : this.high }
  get $low() { return (this.low === undefined) ? this.initGetter('low') : this.low }
  get $close() { return (this.close === undefined) ? this.initGetter('close') : this.close }
  get $volume() { return (this.volume === undefined) ? this.initGetter('volume') : this.volume }

  /* formats */
  static get simpleFormat() {
    return formats.simpleFormat }
  static get exchangeFormat() {
    return formats.exchangeFormat }
  static get objectFormat() {
    return formats.objectFormat }
  
  /* correlation and covariance */
  static cov(f: Array<number>, g: Array<number>) {
    return core.cov(f, g) }
  static cor(f: Array<number>, g: Array<number>) {
    return core.cor(f, g) }
  
  /* member defenition of technical analysis methods */
  adl() {
    return TA.adl(this.$high, this.$low, this.$close, this.$volume) }
  atr(window = 14) {
    return TA.atr(this.$high, this.$low, this.$close, window) }
  adx(window = 14) {
    return TA.adx(this.$high, this.$low, this.$close, window) }
  bb(window = 15, mult = 2) {
    return TA.bb(this.$close, window, mult) }
  bbp(window = 15, mult = 2) {
    return TA.bbp(this.$close, window, mult) }
  cci(window = 20, mult = 0.015) {
    return TA.cci(this.$high, this.$low, this.$close, window, mult) }
  cho(winshort = 3, winlong = 10) {
    return TA.cho(this.$high, this.$low, this.$close, this.$volume, winshort, winlong) }
  dema(window = 10) {
    return TA.dema(this.$close, window) }
  ebb(window = 10, mult = 2) {
    return TA.ebb(this.$close, window, mult) }
  ema(window = 10) {
    return TA.ema(this.$close, window) }
  expdev(window = 15) {
    return TA.expdev(this.$close, window) }
  fi(window = 13) {
    return TA.fi(this.$close, this.$volume, window) }
  keltner(window = 14, mult = 2) {
    return TA.keltner(this.$high, this.$low, this.$close, window, mult) }
  kst(w1=10, w2=15, w3=20, w4=30, s1=10, s2=10, s3=10, s4=15, sig=9) {
    return TA.kst(this.$close, w1, w2, w3, w4, s1, s2, s3, s4, sig) }
  macd(winshort = 12, winlong = 26, winsig = 9) {
    return TA.macd(this.$close, winshort, winlong, winsig) }
  madev(window = 15) {
    return TA.madev(this.$close, window) }
  mfi(window = 14) {
    return TA.mfi(this.$high, this.$low, this.$close, this.$volume, window) }
  obv(signal = 10) {
    return TA.obv(this.$close, this.$volume, signal) }  
  psar(factor = 0.02, maxfactor = 0.2) {
    return TA.psar(this.$high, this.$low, factor, maxfactor) }
  roc(window = 14) {
    return TA.roc(this.$close, window) }
  rsi(window = 14) {
    return TA.rsi(this.$close, window) }
  sma(window = 15) {
    return TA.sma(this.$close, window) }
  stdev(window = 15) {
    return TA.stdev(this.$close, window) }
  stoch(window = 14, signal = 3, smooth = 1) {
    return TA.stoch(this.$high, this.$low, this.$close, window, signal, smooth) }
  stochRsi(window = 14, signal = 3, smooth = 1) {
    return TA.stochRsi(this.$close, window, signal, smooth) }
  tema(window = 10) {
    return TA.tema(this.$close, window) }
  vbp(zones = 12, left = 0, right = NaN) {
    return TA.vbp(this.$close, this.$volume, zones, left, right) }
  vi(window = 14) {
    return TA.vi(this.$high, this.$low, this.$close, window) }
  vwap() {
    return TA.vwap(this.$high, this.$low, this.$close, this.$volume) }
  williams(window = 14) {
    return TA.williams(this.$high, this.$low, this.$close, window) }
  zigzag(percent = 15) {
    return TA.zigzag(this.$time, this.$high, this.$low, percent) }

  /* static defenition of technical analysis methods */
  static adl($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>) {
    return indicators.adl($high, $low, $close, $volume) }
  static atr($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 14) {
    return core.atr($high, $low, $close, window) }
  static adx($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 14) {
    return indicators.adx($high, $low, $close, window) }
  static bb($close: Array<number>, window = 15, mult = 2) {
    return overlays.bb($close, window, mult) }
  static bbp($close: Array<number>, window = 15, mult = 2) {
    return indicators.bbp($close, window, mult) }
  static cci($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 20, mult = 0.015) {
    return indicators.cci($high, $low, $close, window, mult) }
  static cho($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>, winshort = 3, winlong = 10) {
    return indicators.cho($high, $low, $close, $volume, winshort, winlong) }
  static dema($close: Array<number>, window = 10) {
    return overlays.dema($close, window) }
  static ebb($close: Array<number>, window = 10, mult = 2) {
    return overlays.ebb($close, window, mult) }
  static ema($close: Array<number>, window = 10) {
    return core.ema($close, window) }
  static expdev($close: Array<number>, window = 15) {
    return core.expdev($close, window) }  
  static fi($close: Array<number>, $volume: Array<number>, window = 13) {
    return indicators.fi($close, $volume, window) }
  static keltner($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 14, mult = 2) {
    return overlays.keltner($high, $low, $close, window, mult) }
  static kst($close: Array<number>, w1=10, w2=15, w3=20, w4=30, s1=10, s2=10, s3=10, s4=15, sig=9) {
    return indicators.kst($close, w1, w2, w3, w4, s1, s2, s3, s4, sig) }
  static macd($close: Array<number>, winshort = 12, winlong = 26, winsig = 9) {
    return indicators.macd($close, winshort, winlong, winsig) }
  static madev($close: Array<number>, window = 15) {
    return core.madev($close, window) }
  static mfi($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>, window = 14) {
    return indicators.mfi($high, $low, $close, $volume, window) }
  static obv($close: Array<number>, $volume: Array<number>, signal = 10) {
    return indicators.obv($close, $volume, signal) }
  static psar($high: Array<number>, $low: Array<number>, factor = 0.02, maxfactor = 0.2) {
    return overlays.psar($high, $low, factor, maxfactor) }
  static roc($close: Array<number>, window = 14) {
    return indicators.roc($close, window) }
  static rsi($close: Array<number>, window = 14) {
    return indicators.rsi($close, window) }
  static sma($close: Array<number>, window = 15) {
    return core.sma($close, window) }
  static stdev($close: Array<number>, window = 15) {
    return core.stdev($close, window) }
  static stoch($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 14, signal = 3, smooth = 1) {
    return indicators.stoch($high, $low, $close, window, signal, smooth) }
  static stochRsi($close: Array<number>, window = 14, signal = 3, smooth = 1) {
    return indicators.stochRsi($close, window, signal, smooth) }
  static tema($close: Array<number>, window = 10) {
    return overlays.tema($close, window) }
  static vbp($close: Array<number>, $volume: Array<number>, zones = 12, left = 0, right = NaN) {
    return overlays.vbp($close, $volume, zones, left, right) }
  static vi($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 14) {
    return indicators.vi($high, $low, $close, window) }
  static vwap($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>) {
    return overlays.vwap($high, $low, $close, $volume) }
  static williams($high: Array<number>, $low: Array<number>, $close: Array<number>, window = 14) {
    return indicators.williams($high, $low, $close, window) }
  static zigzag($time: Array<number>, $high: Array<number>, $low: Array<number>, percent = 15) {
    return overlays.zigzag($time, $high, $low, percent) }        

}