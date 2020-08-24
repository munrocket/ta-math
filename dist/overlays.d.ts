export declare function bb($close: Array<number>, window: number, mult: number): {
    lower: any[];
    middle: any[];
    upper: any[];
};
export declare function dema($close: Array<number>, window: number): any[];
export declare function ebb($close: Array<number>, window: number, mult: number): {
    lower: any[];
    middle: number[];
    upper: any[];
};
export declare function keltner($high: Array<number>, $low: Array<number>, $close: Array<number>, window: number, mult: number): {
    lower: any[];
    middle: number[];
    upper: any[];
};
export declare function psar($high: Array<number>, $low: Array<number>, stepfactor: number, maxfactor: number): number[];
export declare function tema($close: Array<number>, window: number): any[];
export declare function vbp($close: Array<number>, $volume: Array<number>, zones: number, left: number, right: number): {
    bottom: number;
    top: number;
    volumes: number[];
};
export declare function vwap($high: Array<number>, $low: Array<number>, $close: Array<number>, $volume: Array<number>): any[];
export declare function zigzag($time: Array<number>, $high: Array<number>, $low: Array<number>, percent: number): {
    time: number[];
    price: number[];
};
