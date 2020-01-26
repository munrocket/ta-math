
import { TA } from '../index';
import { AdxStruct, BandStruct, LineSignalStruct, MacdStruct, VbpStruct, PlusMinusStruct, ZigzagStruct } from '../structs';

export interface LTOHLCV {      [key: string]: any;
  length: number;
  time: (i: number) => number;
  open: (i: number) => number;
  high: (i: number) => number;
  low: (i: number) => number;
  close: (i: number) => number;
  volume: (i: number) => number;
}

////////////////////////////////
/* Data format from providers */
////////////////////////////////

export type Format = (x: any) => LTOHLCV;

export let simpleFormat: Format = (x: any) => {
  return {
    length: x[4].length,
    time: (i: number) => x[0][i],
    open: (i: number) => x[1][i],
    high: (i: number) => x[2][i],
    low: (i: number) => x[3][i],
    close: (i: number) => x[4][i],
    volume: (i: number) => x[5][i]
  }
}

export let exchangeFormat: Format = (x: any) => {
  return {
    length: x.length,
    time: (i: number) => x[i][0],
    open: (i: number) => x[i][1],
    high: (i: number) => x[i][2],
    low: (i: number) => x[i][3],
    close: (i: number) => x[i][4],
    volume: (i: number) => x[i][5]
  }
};

export let objectFormat: Format = (x: any) => {
  return {
    length: x.close.length,
    time: (i: number) => x.time[i],
    open: (i: number) => x.open[i],
    high: (i: number) => x.high[i],
    low: (i: number) => x.low[i],
    close: (i: number) => x.close[i],
    volume: (i: number) => x.volume[i]
  }
}

interface ILookup                 { [key: string]: any; }
class CLookup implements ILookup  { [key: string]: any; }

export default class TAProvider extends CLookup {  

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
    this.format = (format === undefined) ? this.exchangeFormat : format;
  }

  /* */
  static get simpleFormat(): Format {
    return simpleFormat }
  static get exchangeFormat(): Format {
    return exchangeFormat }
  static get objectFormat(): Format {
    return objectFormat }

  /* price getters */
  initGetter(name: string): Array<number> {
    let result = [], length = this.format(this.ohlcv)['length'];
    for(let i = 0; i < length; i++) { result.push(this.format(this.ohlcv)[name](i)) }
    this[name] = result;
    return result;
  }
  get $time(): Array<number> { return (this.time === undefined) ? this.initGetter('time') : this.time }
  get $open(): Array<number> { return (this.open === undefined) ? this.initGetter('open') : this.open }
  get $high(): Array<number> { return (this.high === undefined) ? this.initGetter('high') : this.high }
  get $low(): Array<number> { return (this.low === undefined) ? this.initGetter('low') : this.low }
  get $close(): Array<number> { return (this.close === undefined) ? this.initGetter('close') : this.close }
  get $volume(): Array<number> { return (this.volume === undefined) ? this.initGetter('volume') : this.volume }

  /////////////////////////////////////////////////////
  /* member defenition of technical analysis methods */
  /////////////////////////////////////////////////////

  adl(): Array<number> {
    return TA.adl(this.$high, this.$low, this.$close, this.$volume) }
  atr(window = 14): Array<number> {
    return TA.atr(this.$high, this.$low, this.$close, window) }
  adx(window = 14): AdxStruct {
    return TA.adx(this.$high, this.$low, this.$close, window) }
  bb(window = 15, mult = 2): BandStruct {
    return TA.bb(this.$close, window, mult) }
  bbp(window = 15, mult = 2): Array<number> {
    return TA.bbp(this.$close, window, mult) }
  cci(window = 20, mult = 0.015): Array<number> {
    return TA.cci(this.$high, this.$low, this.$close, window, mult) }
  cho(winshort = 3, winlong = 10): Array<number> {
    return TA.cho(this.$high, this.$low, this.$close, this.$volume, winshort, winlong) }
  dema(window = 10): Array<number> {
    return TA.dema(this.$close, window) }
  ebb(window = 10, mult = 2): BandStruct {
    return TA.ebb(this.$close, window, mult) }
  ema(window = 10): Array<number> {
    return TA.ema(this.$close, window) }
  expdev(window = 15): Array<number> {
    return TA.expdev(this.$close, window) }
  fi(window = 13): Array<number> {
    return TA.fi(this.$close, this.$volume, window) }
  keltner(window = 14, mult = 2): BandStruct {
    return TA.keltner(this.$high, this.$low, this.$close, window, mult) }
  kst(w1=10, w2=15, w3=20, w4=30, s1=10, s2=10, s3=10, s4=15, sig=9): LineSignalStruct {
    return TA.kst(this.$close, w1, w2, w3, w4, s1, s2, s3, s4, sig) }
  macd(winshort = 12, winlong = 26, winsig = 9): MacdStruct {
    return TA.macd(this.$close, winshort, winlong, winsig) }
  madev(window = 15): Array<number> {
    return TA.madev(this.$close, window) }
  mfi(window = 14): Array<number> {
    return TA.mfi(this.$high, this.$low, this.$close, this.$volume, window) }
  obv(signal = 10): LineSignalStruct {
    return TA.obv(this.$close, this.$volume, signal) }  
  psar(factor = 0.02, maxfactor = 0.2): Array<number> {
    return TA.psar(this.$high, this.$low, factor, maxfactor) }
  roc(window = 14): Array<number> {
    return TA.roc(this.$close, window) }
  rsi(window = 14): Array<number> {
    return TA.rsi(this.$close, window) }
  sma(window = 15): Array<number> {
    return TA.sma(this.$close, window) }
  stdev(window = 15): Array<number> {
    return TA.stdev(this.$close, window) }
  stoch(window = 14, signal = 3, smooth = 1): LineSignalStruct {
    return TA.stoch(this.$high, this.$low, this.$close, window, signal, smooth) }
  stochRsi(window = 14, signal = 3, smooth = 1): LineSignalStruct {
    return TA.stochRsi(this.$close, window, signal, smooth) }
  tema(window = 10): Array<number> {
    return TA.tema(this.$close, window) }
  vbp(zones = 12, left = 0, right = NaN): VbpStruct {
    return TA.vbp(this.$close, this.$volume, zones, left, right) }
  vi(window = 14): PlusMinusStruct {
    return TA.vi(this.$high, this.$low, this.$close, window) }
  vwap(): Array<number> {
    return TA.vwap(this.$high, this.$low, this.$close, this.$volume) }
  williams(window = 14): Array<number> {
    return TA.williams(this.$high, this.$low, this.$close, window) }
  zigzag(percent = 15): ZigzagStruct {
    return TA.zigzag(this.$time, this.$high, this.$low, percent) }
}