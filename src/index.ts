import * as core from './core';
import * as indicators from './indicators';
import * as overlays from './overlays';
import * as structs from './types';
import { float, int } from './types';

export class TA {
  
  /* correlation and covariance */
  static cov(f: Array<float>, g: Array<float>): float {
    return core.cov(f, g) }
  static cor(f: Array<float>, g: Array<float>): float {
    return core.cor(f, g) }

  /* technical analysis methods */
  
  static adl($high: Array<float>, $low: Array<float>, $close: Array<float>, $volume: Array<float>): Array<float> {
    return indicators.adl($high, $low, $close, $volume) }
  // static atr($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 14): Array<float> {
  //   return core.atr($high, $low, $close, window) }
  // static adx($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 14): structs.AdxStruct {
  //   return indicators.adx($high, $low, $close, window) }
  static bb($close: Array<float>, window: int = 15, mult: float = 2.): structs.BandStruct {
    return overlays.bb($close, window, mult) }
  // static bbp($close: Array<float>, window: int = 15, mult: float = 2.): Array<float> {
  //   return indicators.bbp($close, window, mult) }
  // static cci($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 20, mult: float = 0.015): Array<float> {
  //   return indicators.cci($high, $low, $close, window, mult) }
  // static cho($high: Array<float>, $low: Array<float>, $close: Array<float>, $volume: Array<float>, winshort: int = 3, winlong: int = 10): Array<float> {
  //   return indicators.cho($high, $low, $close, $volume, winshort, winlong) }
  // static dema($close: Array<float>, window: int = 10): Array<float> {
  //   return overlays.dema($close, window) }
  // static ebb($close: Array<float>, window: int = 10, mult: float = 2.): structs.BandStruct {
  //   return overlays.ebb($close, window, mult) }
  // static ema($close: Array<float>, window: int = 10): Array<float> {
  //   return core.ema($close, window) }
  // static expdev($close: Array<float>, window: int = 15): Array<float> {
  //   return core.expdev($close, window) }  
  // static fi($close: Array<float>, $volume: Array<float>, window: int = 13): Array<float> {
  //   return indicators.fi($close, $volume, window) }
  // static keltner($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 14, mult: float = 2.): structs.BandStruct {
  //   return overlays.keltner($high, $low, $close, window, mult) }
  // static kst($close: Array<float>, w1: int = 10, w2: int = 15, w3: int = 20, w4: int = 30, s1: int = 10, s2: int = 10, s3: int = 10, s4: int = 15, sig: int = 9): structs.LineSignalStruct {
  //   return indicators.kst($close, w1, w2, w3, w4, s1, s2, s3, s4, sig) }
  // static macd($close: Array<float>, winshort: int = 12, winlong: int = 26, winsig: int = 9): structs.MacdStruct {
  //   return indicators.macd($close, winshort, winlong, winsig) }
  // static madev($close: Array<float>, window: int = 15): Array<float> {
  //   return core.madev($close, window) }
  // static mfi($high: Array<float>, $low: Array<float>, $close: Array<float>, $volume: Array<float>, window: int = 14): Array<float> {
  //   return indicators.mfi($high, $low, $close, $volume, window) }
  // static obv($close: Array<float>, $volume: Array<float>, signal: int = 10): structs.LineSignalStruct {
  //   return indicators.obv($close, $volume, signal) }
  // static psar($high: Array<float>, $low: Array<float>, factor = 0.02, maxfactor = 0.2): Array<float> {
  //   return overlays.psar($high, $low, factor, maxfactor) }
  // static roc($close: Array<float>, window: int = 14): Array<float> {
  //   return indicators.roc($close, window) }
  // static rsi($close: Array<float>, window: int = 14): Array<float> {
  //   return indicators.rsi($close, window) }
  // static sma($close: Array<float>, window: int = 15): Array<float> {
  //   return core.sma($close, window) }
  // static stdev($close: Array<float>, window: int = 15): Array<float> {
  //   return core.stdev($close, window) }
  // static stoch($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 14, signal: float = 3, smooth: float = 1): structs.LineSignalStruct {
  //   return indicators.stoch($high, $low, $close, window, signal, smooth) }
  // static stochRsi($close: Array<float>, window: int = 14, signal: float = 3, smooth: float = 1): structs.LineSignalStruct {
  //   return indicators.stochRsi($close, window, signal, smooth) }
  // static tema($close: Array<float>, window: int = 10): Array<float> {
  //   return overlays.tema($close, window) }
  // static vbp($close: Array<float>, $volume: Array<float>, zones: float = 12, left: float = 0, right: float = NaN): structs.VbpStruct {
  //   return overlays.vbp($close, $volume, zones, left, right) }
  // static vi($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 14): structs.PlusMinusStruct {
  //   return indicators.vi($high, $low, $close, window) }
  // static vwap($high: Array<float>, $low: Array<float>, $close: Array<float>, $volume: Array<float>): Array<float> {
  //   return overlays.vwap($high, $low, $close, $volume) }
  // static williams($high: Array<float>, $low: Array<float>, $close: Array<float>, window: int = 14): Array<float> {
  //   return indicators.williams($high, $low, $close, window) }
  // static zigzag($time: Array<float>, $high: Array<float>, $low: Array<float>, percent: float = 15): structs.ZigzagStruct {
  //   return overlays.zigzag($time, $high, $low, percent) }        

}