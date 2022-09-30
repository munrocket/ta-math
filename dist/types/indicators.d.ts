export declare function adl($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>): number[];
export declare function adx($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number): {
    dip: any[];
    dim: any[];
    adx: any[];
};
export declare function ao($high: Array<number>, $low: Array<number>, winshort: number, winlong: number): any[];
export declare function ac($high: Array<number>, $low: Array<number>, winsma: number, winshort: number, winlong: number): any[];
export declare function bbp($close: Array<number>, window: number, mult: number): any[];
export declare function cci($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number, mult: number): any[];
export declare function cho($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>, winshort: number, winlong: number): any[];
export declare function fi($close: Array<number>, $volume: Array<number>, window: number): number[];
export declare function kst($close: Array<number>, w1: number, w2: number, w3: number, w4: number, s1: number, s2: number, s3: number, s4: number, sig: number): {
    line: any[];
    signal: any[];
};
export declare function macd($close: Array<number>, winshort: number, winlong: number, winsig: number): {
    line: any[];
    signal: number[];
    hist: any[];
};
export declare function mfi($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>, window: number): any[];
export declare function obv($close: Array<number>, $volume: Array<number>, signal: number): {
    line: number[];
    signal: any[];
};
export declare function roc($close: Array<number>, window: number): any[];
export declare function rsi($close: Array<number>, window: number): any[];
export declare function stoch($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number, signal: number, smooth: number): {
    line: any[];
    signal: any[];
};
export declare function stochRsi($close: Array<number>, window: number, signal: number, smooth: number): {
    line: any[];
    signal: any[];
};
export declare function vi($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number): {
    plus: any[];
    minus: any[];
};
export declare function williams($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number): any[];
