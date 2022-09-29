import * as formats from './formats';
import { Format } from './formats';
interface ILookup {
    [index: string]: any;
}
declare class CLookup implements ILookup {
    [index: string]: any;
}
export default class TA extends CLookup {
    format: Format;
    ohlcv: any;
    time: Array<number>;
    open: Array<number>;
    high: Array<number>;
    low: Array<number>;
    close: Array<number>;
    volume: Array<number>;
    constructor(ohlcv: any, format: Format);
    initGetter(name: string): any[];
    get $time(): any[];
    get $open(): any[];
    get $high(): any[];
    get $low(): any[];
    get $close(): any[];
    get $volume(): any[];
    static get simpleFormat(): formats.Format;
    static get exchangeFormat(): formats.Format;
    static get objectFormat(): formats.Format;
    static cov(f: Array<number>, g: Array<number>): number;
    static cor(f: Array<number>, g: Array<number>): number;
    adl(): number[];
    atr(window?: number): number[];
    adx(window?: number): {
        dip: any[];
        dim: any[];
        adx: any[];
    };
    bb(window?: number, mult?: number): {
        lower: any[];
        middle: any[];
        upper: any[];
    };
    bbp(window?: number, mult?: number): any[];
    cci(window?: number, mult?: number): any[];
    cho(winshort?: number, winlong?: number): any[];
    dema(window?: number): any[];
    ebb(window?: number, mult?: number): {
        lower: any[];
        middle: number[];
        upper: any[];
    };
    ema(window?: number): number[];
    expdev(window?: number): any[];
    fi(window?: number): number[];
    hma(window?: number): any;
    keltner(window?: number, mult?: number): {
        lower: any[];
        middle: number[];
        upper: any[];
    };
    kst(w1?: number, w2?: number, w3?: number, w4?: number, s1?: number, s2?: number, s3?: number, s4?: number, sig?: number): {
        line: any[];
        signal: any[];
    };
    macd(winshort?: number, winlong?: number, winsig?: number): {
        line: any[];
        signal: number[];
        hist: any[];
    };
    madev(window?: number): any[];
    mfi(window?: number): any[];
    obv(signal?: number): {
        line: number[];
        signal: any[];
    };
    psar(factor?: number, maxfactor?: number): number[];
    roc(window?: number): any[];
    rsi(window?: number): any[];
    sma(window?: number): any[];
    stdev(window?: number): any[];
    stoch(window?: number, signal?: number, smooth?: number): {
        line: any[];
        signal: any[];
    };
    stochRsi(window?: number, signal?: number, smooth?: number): {
        line: any[];
        signal: any[];
    };
    tema(window?: number): any[];
    vbp(zones?: number, left?: number, right?: number): {
        bottom: number;
        top: number;
        volumes: number[];
    };
    vi(window?: number): {
        plus: any[];
        minus: any[];
    };
    vwap(): any[];
    williams(window?: number): any[];
    wma(window?: number): number[];
    zigzag(percent?: number): {
        time: number[];
        price: number[];
    };
    static adl($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>): number[];
    static atr($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number): number[];
    static adx($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number): {
        dip: any[];
        dim: any[];
        adx: any[];
    };
    static bb($close: Array<number>, window?: number, mult?: number): {
        lower: any[];
        middle: any[];
        upper: any[];
    };
    static bbp($close: Array<number>, window?: number, mult?: number): any[];
    static cci($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number, mult?: number): any[];
    static cho($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>, winshort?: number, winlong?: number): any[];
    static dema($close: Array<number>, window?: number): any[];
    static ebb($close: Array<number>, window?: number, mult?: number): {
        lower: any[];
        middle: number[];
        upper: any[];
    };
    static ema($close: Array<number>, window?: number): number[];
    static expdev($close: Array<number>, window?: number): any[];
    static fi($close: Array<number>, $volume: Array<number>, window?: number): number[];
    static hma($close: Array<number>, window?: number): any;
    static keltner($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number, mult?: number): {
        lower: any[];
        middle: number[];
        upper: any[];
    };
    static kst($close: Array<number>, w1?: number, w2?: number, w3?: number, w4?: number, s1?: number, s2?: number, s3?: number, s4?: number, sig?: number): {
        line: any[];
        signal: any[];
    };
    static macd($close: Array<number>, winshort?: number, winlong?: number, winsig?: number): {
        line: any[];
        signal: number[];
        hist: any[];
    };
    static madev($close: Array<number>, window?: number): any[];
    static mfi($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>, window?: number): any[];
    static obv($close: Array<number>, $volume: Array<number>, signal?: number): {
        line: number[];
        signal: any[];
    };
    static psar($high: Array<number>, $low: Array<number>, factor?: number, maxfactor?: number): number[];
    static roc($close: Array<number>, window?: number): any[];
    static rsi($close: Array<number>, window?: number): any[];
    static sma($close: Array<number>, window?: number): any[];
    static stdev($close: Array<number>, window?: number): any[];
    static stoch($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number, signal?: number, smooth?: number): {
        line: any[];
        signal: any[];
    };
    static stochRsi($close: Array<number>, window?: number, signal?: number, smooth?: number): {
        line: any[];
        signal: any[];
    };
    static tema($close: Array<number>, window?: number): any[];
    static vbp($close: Array<number>, $volume: Array<number>, zones?: number, left?: number, right?: number): {
        bottom: number;
        top: number;
        volumes: number[];
    };
    static vi($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number): {
        plus: any[];
        minus: any[];
    };
    static vwap($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>): any[];
    static williams($high: Array<number>, $low: Array<number>, $close: Array<number>, window?: number): any[];
    static wma($close: Array<number>, window?: number): number[];
    static zigzag($time: Array<number>, $high: Array<number>, $low: Array<number>, percent?: number): {
        time: number[];
        price: number[];
    };
}
export {};
