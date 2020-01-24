import { test } from 'zora';

function mean(series) {
    let sum = 0;
    for (let i = 0; i < series.length; i++) {
        sum += series[i];
    }
    return sum / series.length;
}
function sd(series) {
    let E = mean(series);
    let E2 = mean(pointwise((x) => x * x, series));
    return Math.sqrt(E2 - E * E);
}
function cov(f, g) {
    let Ef = mean(f), Eg = mean(g);
    let Efg = mean(pointwise((a, b) => a * b, f, g));
    return Efg - Ef * Eg;
}
function cor(f, g) {
    let Ef = mean(f), Eg = mean(g);
    let Ef2 = mean(pointwise((a) => a * a, f));
    let Eg2 = mean(pointwise((a) => a * a, g));
    let Efg = mean(pointwise((a, b) => a * b, f, g));
    return (Efg - Ef * Eg) / Math.sqrt((Ef2 - Ef * Ef) * (Eg2 - Eg * Eg));
}
function mad(array) {
    return mae(array, new Array(array.length).fill(mean(array)));
}
function pointwise(operation, ...serieses) {
    let result = [];
    for (let i = 0, len = serieses[0].length; i < len; i++) {
        let iseries = (i) => serieses.map(x => x[i]);
        result[i] = operation(...iseries(i));
    }
    return result;
}
function rolling(operation, series, window) {
    let result = [];
    for (let i = 0, len = series.length; i < len; i++) {
        let j = i + 1 - window;
        result.push(operation(series.slice((j > 0) ? j : 0, i + 1)));
    }
    return result;
}
function mae(f, g) {
    const absDiff = pointwise((a, b) => Math.abs(a - b), f, g);
    return (f.length != g.length) ? Infinity : mean(absDiff);
}
function rmse(f, g) {
    const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
    return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}
function nrmse(f, g) {
    return rmse(f, g) / (Math.max(...f) - Math.min(...f));
}
function mape(f, g) {
    const frac = pointwise((a, b) => Math.abs((a - b) / a), f, g);
    return (f.length != g.length) ? Infinity : mean(frac) * 100;
}
function sma(series, window) {
    return rolling((s) => mean(s), series, window);
}
function ema(series, window, start) {
    let weight = 2 / (window + 1);
    let ema = [start ? start : mean(series.slice(0, window))];
    for (let i = 1, len = series.length; i < len; i++) {
        ema.push(series[i] * weight + (1 - weight) * ema[i - 1]);
    }
    return ema;
}
function stdev(series, window) {
    return rolling((s) => sd(s), series, window);
}
function madev(series, window) {
    return rolling((s) => mad(s), series, window);
}
function expdev(series, window) {
    let sqrDiff = pointwise((a, b) => (a - b) * (a - b), series, ema(series, window));
    return pointwise((x) => Math.sqrt(x), ema(sqrDiff, window));
}
function atr($high, $low, $close, window) {
    let tr = trueRange($high, $low, $close);
    return ema(tr, 2 * window - 1);
}
function wilderSmooth(series, window) {
    let result = new Array(window).fill(NaN);
    result.push(series.slice(1, window + 1).reduce((sum, item) => { return sum += item; }, 0));
    for (let i = window + 1; i < series.length; i++) {
        result.push((1 - 1 / window) * result[i - 1] + series[i]);
    }
    return result;
}
function typicalPrice($high, $low, $close) {
    return pointwise((a, b, c) => (a + b + c) / 3, $high, $low, $close);
}
function trueRange($high, $low, $close) {
    let tr = [$high[0] - $low[0]];
    for (let i = 1, len = $low.length; i < len; i++) {
        tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
    }
    return tr;
}

function bb($close, window, mult) {
    let ma = sma($close, window);
    let dev = stdev($close, window);
    let upper = pointwise((a, b) => a + b * mult, ma, dev);
    let lower = pointwise((a, b) => a - b * mult, ma, dev);
    return { lower: lower, middle: ma, upper: upper };
}
function dema($close, window) {
    let ema1 = ema($close, window);
    return pointwise((a, b) => 2 * a - b, ema1, ema(ema1, window));
}
function ebb($close, window, mult) {
    let ma = ema($close, window);
    let dev = expdev($close, window);
    let upper = pointwise((a, b) => a + b * mult, ma, dev);
    let lower = pointwise((a, b) => a - b * mult, ma, dev);
    return { lower: lower, middle: ma, upper: upper };
}
function keltner($high, $low, $close, window, mult) {
    let middle = ema($close, window);
    let upper = pointwise((a, b) => a + mult * b, middle, atr($high, $low, $close, window));
    let lower = pointwise((a, b) => a - mult * b, middle, atr($high, $low, $close, window));
    return { lower: lower, middle: middle, upper: upper };
}
function psar($high, $low, stepfactor, maxfactor) {
    let isUp = true;
    let factor = stepfactor;
    let extreme = Math.max($high[0], $high[1]);
    let psar = [$low[0], Math.min($low[0], $low[1])];
    let cursar = psar[1];
    for (let i = 2, len = $high.length; i < len; i++) {
        cursar = cursar + factor * (extreme - cursar);
        if ((isUp && $high[i] > extreme) || (!isUp && $low[i] < extreme)) {
            factor = ((factor <= maxfactor) ? factor + stepfactor : maxfactor);
            extreme = (isUp) ? $high[i] : $low[i];
        }
        if ((isUp && $low[i] < cursar) || (!isUp && cursar > $high[i])) {
            isUp = !isUp;
            factor = stepfactor;
            cursar = (isUp) ? Math.min(...$low.slice(i - 2, i + 1)) : Math.max(...$high.slice(i - 2, i + 1));
        }
        psar.push(cursar);
    }
    return psar;
}
function tema($close, window) {
    let ema1 = ema($close, window);
    let ema2 = ema(ema1, window);
    return pointwise((a, b, c) => 3 * a - 3 * b + c, ema1, ema2, ema(ema2, window));
}
function vbp($close, $volume, zones, left, right) {
    let total = 0;
    let bottom = Infinity;
    let top = -Infinity;
    let vbp = new Array(zones).fill(0);
    right = !isNaN(right) ? right : $close.length;
    for (let i = left; i < right; i++) {
        total += $volume[i];
        top = (top < $close[i]) ? $close[i] : top;
        bottom = (bottom > $close[i]) ? $close[i] : bottom;
    }
    for (let i = left; i < right; i++) {
        vbp[Math.floor(($close[i] - bottom) / (top - bottom) * (zones - 1))] += $volume[i];
    }
    return { bottom: bottom, top: top, volumes: vbp.map((x) => { return x / total; }) };
}
function vwap($high, $low, $close, $volume) {
    let tp = typicalPrice($high, $low, $close), cumulVTP = [$volume[0] * tp[0]], cumulV = [$volume[0]];
    for (let i = 1, len = $close.length; i < len; i++) {
        cumulVTP[i] = cumulVTP[i - 1] + $volume[i] * tp[i];
        cumulV[i] = cumulV[i - 1] + $volume[i];
    }
    return pointwise((a, b) => a / b, cumulVTP, cumulV);
}
function zigzag($time, $high, $low, percent) {
    let lowest = $low[0], thattime = $time[0], isUp = false;
    let highest = $high[0], time = [], zigzag = [];
    for (let i = 1, len = $time.length; i < len; i++) {
        if (isUp) {
            if ($high[i] > highest) {
                thattime = $time[i];
                highest = $high[i];
            }
            else if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
                isUp = false;
                time.push(thattime);
                zigzag.push(highest);
                lowest = $low[i];
            }
        }
        else {
            if ($low[i] < lowest) {
                thattime = $time[i];
                lowest = $low[i];
            }
            else if ($high[i] > lowest + (highest - lowest) * percent / 100) {
                isUp = true;
                time.push(thattime);
                zigzag.push(lowest);
                highest = $high[i];
            }
        }
    }
    return { time: time, price: zigzag };
}

function adl($high, $low, $close, $volume) {
    let adl = [$volume[0] * (2 * $close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
    for (let i = 1, len = $high.length; i < len; i++) {
        adl[i] = adl[i - 1] + $volume[i] * (2 * $close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
    }
    return adl;
}
function adx($high, $low, $close, window) {
    let dmp = [0], dmm = [0];
    for (let i = 1, len = $low.length; i < len; i++) {
        let hd = $high[i] - $high[i - 1];
        let ld = $low[i - 1] - $low[i];
        dmp.push((hd > ld) ? Math.max(hd, 0) : 0);
        dmm.push((ld > hd) ? Math.max(ld, 0) : 0);
    }
    let str = wilderSmooth(trueRange($high, $low, $close), window);
    dmp = wilderSmooth(dmp, window);
    dmm = wilderSmooth(dmm, window);
    let dip = pointwise((a, b) => 100 * a / b, dmp, str);
    let dim = pointwise((a, b) => 100 * a / b, dmm, str);
    let dx = pointwise((a, b) => 100 * Math.abs(a - b) / (a + b), dip, dim);
    return { dip: dip, dim: dim, adx: new Array(14).fill(NaN).concat(ema(dx.slice(14), 2 * window - 1)) };
}
function bbp($close, window, mult) {
    let band = bb($close, window, mult);
    return pointwise((p, u, l) => (p - l) / (u - l), $close, band.upper, band.lower);
}
function cci($high, $low, $close, window, mult) {
    let tp = typicalPrice($high, $low, $close);
    let tpsma = sma(tp, window);
    let tpmad = madev(tp, window);
    tpmad[0] = Infinity;
    return pointwise((a, b, c) => (a - b) / (c * mult), tp, tpsma, tpmad);
}
function cho($high, $low, $close, $volume, winshort, winlong) {
    let adli = adl($high, $low, $close, $volume);
    return pointwise((s, l) => s - l, ema(adli, winshort), ema(adli, winlong));
}
function fi($close, $volume, window) {
    let delta = rolling((s) => s[s.length - 1] - s[0], $close, 2);
    return ema(pointwise((a, b) => a * b, delta, $volume), window);
}
function kst($close, w1, w2, w3, w4, s1, s2, s3, s4, sig) {
    let rcma1 = sma(roc($close, w1), s1);
    let rcma2 = sma(roc($close, w2), s2);
    let rcma3 = sma(roc($close, w3), s3);
    let rcma4 = sma(roc($close, w4), s4);
    let line = pointwise((a, b, c, d) => a + b * 2 + c * 3 + d * 4, rcma1, rcma2, rcma3, rcma4);
    return { line: line, signal: sma(line, sig) };
}
function macd($close, winshort, winlong, winsig) {
    const line = pointwise((a, b) => a - b, ema($close, winshort), ema($close, winlong));
    const signal = ema(line, winsig);
    const hist = pointwise((a, b) => a - b, line, signal);
    return { line: line, signal: signal, hist: hist };
}
function mfi($high, $low, $close, $volume, window) {
    let pmf = [0], nmf = [0];
    let tp = typicalPrice($high, $low, $close);
    for (let i = 1, len = $close.length; i < len; i++) {
        let diff = tp[i] - tp[i - 1];
        pmf.push(diff >= 0 ? tp[i] * $volume[i] : 0);
        nmf.push(diff < 0 ? tp[i] * $volume[i] : 0);
    }
    pmf = rolling((s) => s.reduce((sum, x) => { return sum + x; }, 0), pmf, window);
    nmf = rolling((s) => s.reduce((sum, x) => { return sum + x; }, 0), nmf, window);
    return pointwise((a, b) => 100 - 100 / (1 + a / b), pmf, nmf);
}
function obv($close, $volume, signal) {
    let obv = [0];
    for (let i = 1, len = $close.length; i < len; i++) {
        obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
    }
    return { line: obv, signal: sma(obv, signal) };
}
function roc($close, window) {
    let result = new Array(window).fill(NaN);
    for (let i = window, len = $close.length; i < len; i++) {
        result.push(100 * ($close[i] - $close[i - window]) / $close[i - window]);
    }
    return result;
}
function rsi($close, window) {
    let gains = [0], loss = [1e-14];
    for (let i = 1, len = $close.length; i < len; i++) {
        let diff = $close[i] - $close[i - 1];
        gains.push(diff >= 0 ? diff : 0);
        loss.push(diff < 0 ? -diff : 0);
    }
    return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, 2 * window - 1), ema(loss, 2 * window - 1));
}
function stoch($high, $low, $close, window, signal, smooth) {
    let lowest = rolling((s) => Math.min(...s), $low, window);
    let highest = rolling((s) => Math.max(...s), $high, window);
    let K = pointwise((h, l, c) => 100 * (c - l) / (h - l), highest, lowest, $close);
    if (smooth > 1) {
        K = sma(K, smooth);
    }
    return { line: K, signal: sma(K, signal) };
}
function stochRsi($close, window, signal, smooth) {
    let _rsi = rsi($close, window);
    let extreme = rolling((s) => { return { low: Math.min(...s), high: Math.max(...s) }; }, _rsi, window);
    let K = pointwise((rsi, e) => (rsi - e.low) / (e.high - e.low), _rsi, extreme);
    K[0] = 0;
    if (smooth > 1) {
        K = sma(K, smooth);
    }
    return { line: K, signal: sma(K, signal) };
}
function vi($high, $low, $close, window) {
    let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
    for (let i = 1, len = $high.length; i < len; i++) {
        pv.push(Math.abs($high[i] - $low[i - 1]));
        nv.push(Math.abs($high[i - 1] - $low[i]));
    }
    let apv = rolling((s) => s.reduce((sum, x) => { return sum + x; }, 0), pv, window);
    let anv = rolling((s) => s.reduce((sum, x) => { return sum + x; }, 0), nv, window);
    let atr = rolling((s) => s.reduce((sum, x) => { return sum + x; }, 0), trueRange($high, $low, $close), window);
    return { plus: pointwise((a, b) => a / b, apv, atr), minus: pointwise((a, b) => a / b, anv, atr) };
}
function williams($high, $low, $close, window) {
    return pointwise((x) => x - 100, stoch($high, $low, $close, window, 1, 1).line);
}

let simpleFormat = (x) => {
    return {
        length: x[4].length,
        time: (i) => x[0][i],
        open: (i) => x[1][i],
        high: (i) => x[2][i],
        low: (i) => x[3][i],
        close: (i) => x[4][i],
        volume: (i) => x[5][i]
    };
};
let exchangeFormat = (x) => {
    return {
        length: x.length,
        time: (i) => x[i][0],
        open: (i) => x[i][1],
        high: (i) => x[i][2],
        low: (i) => x[i][3],
        close: (i) => x[i][4],
        volume: (i) => x[i][5]
    };
};
let objectFormat = (x) => {
    return {
        length: x.close.length,
        time: (i) => x.time[i],
        open: (i) => x.open[i],
        high: (i) => x.high[i],
        low: (i) => x.low[i],
        close: (i) => x.close[i],
        volume: (i) => x.volume[i]
    };
};

class CLookup {
}
class TA extends CLookup {
    constructor(ohlcv, format) {
        super();
        this.ohlcv = ohlcv;
        this.format = (format === undefined) ? TA.exchangeFormat : format;
    }
    initGetter(name) {
        let result = [], length = this.format(this.ohlcv)['length'];
        for (let i = 0; i < length; i++) {
            result.push(this.format(this.ohlcv)[name](i));
        }
        this[name] = result;
        return result;
    }
    get $time() { return (this.time === undefined) ? this.initGetter('time') : this.time; }
    get $open() { return (this.open === undefined) ? this.initGetter('open') : this.open; }
    get $high() { return (this.high === undefined) ? this.initGetter('high') : this.high; }
    get $low() { return (this.low === undefined) ? this.initGetter('low') : this.low; }
    get $close() { return (this.close === undefined) ? this.initGetter('close') : this.close; }
    get $volume() { return (this.volume === undefined) ? this.initGetter('volume') : this.volume; }
    static get simpleFormat() {
        return simpleFormat;
    }
    static get exchangeFormat() {
        return exchangeFormat;
    }
    static get objectFormat() {
        return objectFormat;
    }
    static cov(f, g) {
        return cov(f, g);
    }
    static cor(f, g) {
        return cor(f, g);
    }
    adl() {
        return TA.adl(this.$high, this.$low, this.$close, this.$volume);
    }
    atr(window = 14) {
        return TA.atr(this.$high, this.$low, this.$close, window);
    }
    adx(window = 14) {
        return TA.adx(this.$high, this.$low, this.$close, window);
    }
    bb(window = 15, mult = 2) {
        return TA.bb(this.$close, window, mult);
    }
    bbp(window = 15, mult = 2) {
        return TA.bbp(this.$close, window, mult);
    }
    cci(window = 20, mult = 0.015) {
        return TA.cci(this.$high, this.$low, this.$close, window, mult);
    }
    cho(winshort = 3, winlong = 10) {
        return TA.cho(this.$high, this.$low, this.$close, this.$volume, winshort, winlong);
    }
    dema(window = 10) {
        return TA.dema(this.$close, window);
    }
    ebb(window = 10, mult = 2) {
        return TA.ebb(this.$close, window, mult);
    }
    ema(window = 10) {
        return TA.ema(this.$close, window);
    }
    expdev(window = 15) {
        return TA.expdev(this.$close, window);
    }
    fi(window = 13) {
        return TA.fi(this.$close, this.$volume, window);
    }
    keltner(window = 14, mult = 2) {
        return TA.keltner(this.$high, this.$low, this.$close, window, mult);
    }
    kst(w1 = 10, w2 = 15, w3 = 20, w4 = 30, s1 = 10, s2 = 10, s3 = 10, s4 = 15, sig = 9) {
        return TA.kst(this.$close, w1, w2, w3, w4, s1, s2, s3, s4, sig);
    }
    macd(winshort = 12, winlong = 26, winsig = 9) {
        return TA.macd(this.$close, winshort, winlong, winsig);
    }
    madev(window = 15) {
        return TA.madev(this.$close, window);
    }
    mfi(window = 14) {
        return TA.mfi(this.$high, this.$low, this.$close, this.$volume, window);
    }
    obv(signal = 10) {
        return TA.obv(this.$close, this.$volume, signal);
    }
    psar(factor = 0.02, maxfactor = 0.2) {
        return TA.psar(this.$high, this.$low, factor, maxfactor);
    }
    roc(window = 14) {
        return TA.roc(this.$close, window);
    }
    rsi(window = 14) {
        return TA.rsi(this.$close, window);
    }
    sma(window = 15) {
        return TA.sma(this.$close, window);
    }
    stdev(window = 15) {
        return TA.stdev(this.$close, window);
    }
    stoch(window = 14, signal = 3, smooth = 1) {
        return TA.stoch(this.$high, this.$low, this.$close, window, signal, smooth);
    }
    stochRsi(window = 14, signal = 3, smooth = 1) {
        return TA.stochRsi(this.$close, window, signal, smooth);
    }
    tema(window = 10) {
        return TA.tema(this.$close, window);
    }
    vbp(zones = 12, left = 0, right = NaN) {
        return TA.vbp(this.$close, this.$volume, zones, left, right);
    }
    vi(window = 14) {
        return TA.vi(this.$high, this.$low, this.$close, window);
    }
    vwap() {
        return TA.vwap(this.$high, this.$low, this.$close, this.$volume);
    }
    williams(window = 14) {
        return TA.williams(this.$high, this.$low, this.$close, window);
    }
    zigzag(percent = 15) {
        return TA.zigzag(this.$time, this.$high, this.$low, percent);
    }
    static adl($high, $low, $close, $volume) {
        return adl($high, $low, $close, $volume);
    }
    static atr($high, $low, $close, window = 14) {
        return atr($high, $low, $close, window);
    }
    static adx($high, $low, $close, window = 14) {
        return adx($high, $low, $close, window);
    }
    static bb($close, window = 15, mult = 2) {
        return bb($close, window, mult);
    }
    static bbp($close, window = 15, mult = 2) {
        return bbp($close, window, mult);
    }
    static cci($high, $low, $close, window = 20, mult = 0.015) {
        return cci($high, $low, $close, window, mult);
    }
    static cho($high, $low, $close, $volume, winshort = 3, winlong = 10) {
        return cho($high, $low, $close, $volume, winshort, winlong);
    }
    static dema($close, window = 10) {
        return dema($close, window);
    }
    static ebb($close, window = 10, mult = 2) {
        return ebb($close, window, mult);
    }
    static ema($close, window = 10) {
        return ema($close, window);
    }
    static expdev($close, window = 15) {
        return expdev($close, window);
    }
    static fi($close, $volume, window = 13) {
        return fi($close, $volume, window);
    }
    static keltner($high, $low, $close, window = 14, mult = 2) {
        return keltner($high, $low, $close, window, mult);
    }
    static kst($close, w1 = 10, w2 = 15, w3 = 20, w4 = 30, s1 = 10, s2 = 10, s3 = 10, s4 = 15, sig = 9) {
        return kst($close, w1, w2, w3, w4, s1, s2, s3, s4, sig);
    }
    static macd($close, winshort = 12, winlong = 26, winsig = 9) {
        return macd($close, winshort, winlong, winsig);
    }
    static madev($close, window = 15) {
        return madev($close, window);
    }
    static mfi($high, $low, $close, $volume, window = 14) {
        return mfi($high, $low, $close, $volume, window);
    }
    static obv($close, $volume, signal = 10) {
        return obv($close, $volume, signal);
    }
    static psar($high, $low, factor = 0.02, maxfactor = 0.2) {
        return psar($high, $low, factor, maxfactor);
    }
    static roc($close, window = 14) {
        return roc($close, window);
    }
    static rsi($close, window = 14) {
        return rsi($close, window);
    }
    static sma($close, window = 15) {
        return sma($close, window);
    }
    static stdev($close, window = 15) {
        return stdev($close, window);
    }
    static stoch($high, $low, $close, window = 14, signal = 3, smooth = 1) {
        return stoch($high, $low, $close, window, signal, smooth);
    }
    static stochRsi($close, window = 14, signal = 3, smooth = 1) {
        return stochRsi($close, window, signal, smooth);
    }
    static tema($close, window = 10) {
        return tema($close, window);
    }
    static vbp($close, $volume, zones = 12, left = 0, right = NaN) {
        return vbp($close, $volume, zones, left, right);
    }
    static vi($high, $low, $close, window = 14) {
        return vi($high, $low, $close, window);
    }
    static vwap($high, $low, $close, $volume) {
        return vwap($high, $low, $close, $volume);
    }
    static williams($high, $low, $close, window = 14) {
        return williams($high, $low, $close, window);
    }
    static zigzag($time, $high, $low, percent = 15) {
        return zigzag($time, $high, $low, percent);
    }
}

let randomize = (tleft, right) => {
    return (right - tleft) * Math.random() + tleft;
};
let random = [];
for (let i = 0; i < 50; i++) {
    let tick = [];
    tick.push(new Date('2018-01-01').getTime() + i * 60000);
    let lcoh = [randomize(5000, 20000), randomize(5000, 20000), randomize(5000, 20000), randomize(5000, 20000)].sort();
    if (randomize(0, 1)) {
        let temp = lcoh[1];
        lcoh[1] = lcoh[2];
        lcoh[2] = temp;
    }
    tick.push(lcoh[1]);
    tick.push(lcoh[0]);
    tick.push(lcoh[3]);
    tick.push(lcoh[2]);
    tick.push(randomize(10, 1000));
    random.push(tick);
}
let noize = new TA(random, TA.exchangeFormat);
test('Getters formats', (T) => {
    let ta = new TA([[0], [1], [2], [3], [4], [5]], TA.simpleFormat);
    let delta = Math.abs(0 - ta.$time[0]) + Math.abs(1 - ta.$open[0]) + Math.abs(2 - ta.$high[0]) +
        Math.abs(3 - ta.$low[0]) + Math.abs(4 - ta.$close[0]) + Math.abs(5 - ta.$volume[0]);
    T.ok(delta < 1e-2, `simpleFormat`);
    ta = new TA([[0, 1, 2, 3, 4, 5]], TA.exchangeFormat);
    delta = Math.abs(0 - ta.$time[0]) + Math.abs(1 - ta.$open[0]) + Math.abs(2 - ta.$high[0]) +
        Math.abs(3 - ta.$low[0]) + Math.abs(4 - ta.$close[0]) + Math.abs(5 - ta.$volume[0]);
    T.ok(delta < 1e-2, `exchangeFormat`);
    ta = new TA({ time: [0], open: [1], high: [2], low: [3], close: [4], volume: [5] }, TA.objectFormat);
    delta = Math.abs(0 - ta.$time[0]) + Math.abs(1 - ta.$open[0]) + Math.abs(2 - ta.$high[0]) +
        Math.abs(3 - ta.$low[0]) + Math.abs(4 - ta.$close[0]) + Math.abs(5 - ta.$volume[0]);
    T.ok(delta < 1e-2, `objectFormat`);
});
test('Mean, SD', (T) => {
    let f = [21.40, 21.71, 21.20, 21.34, 21.49, 21.39, 22.16, 22.53, 22.44, 22.75,
        23.23, 23.09, 22.85, 22.45, 22.48, 22.27, 22.37, 22.28, 23.06, 22.99];
    let expected = 22.2738;
    let actual = mean(f);
    let delta = Math.abs(expected - actual);
    T.ok(delta < 1e-2, `Direct mean test (${delta.toFixed(5)})`);
    expected = Math.sqrt(0.3985);
    actual = sd(f);
    delta = Math.abs(expected - actual);
    T.ok(delta < 1e-2, `Direct sd test (${delta.toFixed(5)})`);
});
test('Cov, Cor', (T) => {
    let f = [21.40, 21.71, 21.20, 21.34, 21.49, 21.39, 22.16, 22.53, 22.44, 22.75,
        23.23, 23.09, 22.85, 22.45, 22.48, 22.27, 22.37, 22.28, 23.06, 22.99];
    let g = [54.83, 55.34, 54.38, 55.25, 56.07, 56.30, 57.05, 57.91, 58.20, 58.39,
        59.19, 59.03, 57.96, 57.52, 57.76, 57.09, 57.85, 57.54, 58.85, 58.60];
    let expected = 0.8484;
    let actual = TA.cov(f, g);
    let delta = Math.abs(expected - actual);
    T.ok(delta < 1e-2, `Direct Cov test (${delta.toFixed(5)})`);
    expected = 0.9582;
    actual = TA.cor(f, g);
    delta = Math.abs(expected - actual);
    T.ok(delta < 1e-2, `Direct Cor test (${delta.toFixed(5)})`);
});
test('MAE', (T) => {
    T.ok(mae([-2, 5, -8, 9, -4], [-2, 5, -8, 9, -4]) < 1e-12, 'Equal test');
    let data = [23.98, 23.92, 23.79, 23.67, 23.54, 23.36, 23.65, 23.72, 24.16, 23.91, 23.81,
        23.92, 23.74, 24.68, 24.94, 24.93, 25.10, 25.12, 25.20, 25.06];
    let delta = Math.abs(mae(data, new Array(data.length).fill(mean(data))) - 0.55);
    T.ok(delta < 1e-2, `Direct test (${delta.toFixed(5)})`);
});
test('MAPE', (T) => {
    let actual = mape([112.3, 108.4, 148.9, 117.4], [124.7, 103.7, 116.6, 78.5]);
    let expected = mean([11, 4.3, 21.7, 33.1]);
    let delta = Math.abs(actual - expected);
    T.ok(delta < 1e-1, `Direct test (${delta.toFixed(5)})`);
});
test('(N)RMSE', (T) => {
    T.ok(rmse([-2, 5, -8, 9, -4], [-2, 5, -8, 9, -4]) < 1e-12, 'Equal test');
    let delta = Math.abs(rmse([-2, 5, -8, 9, -4], [0, 0, 0, 0, 0]) - 6.16);
    T.ok(delta < 1e-2, `Direct test (RMSE=${delta.toFixed(5)})`);
    delta = Math.abs(nrmse([-2, 5, -8, 9, -4], [0, 0, 0, 0, 0]) - 6.16 / (9 + 8));
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('SMA', (T) => {
    let c = [22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29, 22.15, 22.39, 22.38, 22.61, 23.36,
        24.05, 23.75, 23.83, 23.95, 23.63, 23.82, 23.87, 23.65, 23.19, 23.10, 23.33, 22.68, 23.10, 22.40, 22.17];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 22.22, 22.21, 22.23, 22.26, 22.31, 22.42, 22.61,
        22.77, 22.91, 23.08, 23.21, 23.38, 23.53, 23.65, 23.71, 23.69, 23.61, 23.51, 23.43, 23.28, 23.13];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).sma();
    T.ok(actual.every(isFinite), 'Finite test');
    actual = new TA([c, c, c, c, c, c], TA.simpleFormat).sma(10);
    let delta = nrmse(expected.slice(9), actual.slice(9));
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('EMA', (T) => {
    let c = [22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29, 22.15, 22.39, 22.38, 22.61, 23.36,
        24.05, 23.75, 23.83, 23.95, 23.63, 23.82, 23.87, 23.65, 23.19, 23.10, 23.33, 22.68, 23.10, 22.40, 22.17];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 22.22, 22.21, 22.24, 22.27, 22.33, 22.52, 22.80,
        22.97, 23.13, 23.28, 23.34, 23.43, 23.51, 23.54, 23.47, 23.40, 23.39, 23.26, 23.23, 23.08, 22.92];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).ema();
    T.ok(actual.every(isFinite), 'Finite test');
    actual = new TA([c, c, c, c, c, c], TA.simpleFormat).ema(10);
    let delta = nrmse(expected.slice(9), actual.slice(9));
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('DEMA', (T) => {
    let c = [0.00538239, 0.84339777, 0.86927437, 0.31924023, 0.12201374, 0.07550434, 0.41570588, 0.91353791, 0.7736791, 0.76823038,
        0.6982075, 0.03588361, 0.17369301, 0.18780441, 0.47262338, 0.62557742, 0.47361914, 0.32567783, 0.97971771, 0.81200196,
        0.68398998, 0.12635276, 0.86515361, 0.84587914, 0.92645571, 0.86366806, 0.24659213, 0.45445402, 0.04104703, 0.38195752,
        0.74852279, 0.10760785, 0.6406224, 0.92948624, 0.3422517, 0.27272847, 0.83295665, 0.35548816, 0.09350672, 0.50006735,
        0.62052226, 0.11668694, 0.09588492, 0.24512228, 0.69843441, 0.15775824, 0.91848258, 0.85879644, 0.07942072, 0.92170842,
        0.45120693, 0.73117409, 0.65203293, 0.03226302, 0.38359369, 0.41626146, 0.91271837, 0.32441678, 0.08506846, 0.15326203,
        0.71587408, 0.5866244, 0.33246292, 0.15037903, 0.24132456, 0.04685455, 0.68110035, 0.44075099, 0.01500359, 0.72791364,
        0.86883588, 0.45297367, 0.2093929, 0.04604388, 0.09596711, 0.95676931, 0.05257892, 0.91342419, 0.01437425, 0.21196185];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
        NaN, NaN, NaN, NaN, NaN, NaN, NaN, 0.50244717, 0.47191376, 0.53304478, 0.43300062, 0.47624534, 0.57962543, 0.52660929, 0.46684371,
        0.54935612, 0.50505427, 0.40739679, 0.4230109, 0.46440108, 0.38044342, 0.30716668, 0.28274039, 0.36969627, 0.31468742, 0.44841402, 0.54415432,
        0.4397056, 0.55151877, 0.53263615, 0.58252412, 0.60449355, 0.47679812, 0.45442857, 0.44385159, 0.55167959, 0.50199345, 0.4050806, 0.34186437,
        0.42237974, 0.45831727, 0.42826765, 0.36108804, 0.32767669, 0.25516796, 0.34504993, 0.36278472, 0.27779659, 0.37570971,
        0.48920627, 0.48456609, 0.42343058, 0.33499443, 0.27447141, 0.42709486, 0.34030373, 0.47111918, 0.36747095, 0.32890773];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).dema(15);
    let delta = nrmse(expected.slice(29), actual.slice(29));
    T.ok(actual.every(isFinite), 'Finite test');
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('TEMA', (T) => {
    let c = [7.84090894e-01, 6.89609697e-01, 3.35015182e-01, 5.38412345e-01, 3.82601344e-01, 9.76651481e-01, 2.27132380e-01, 1.08623756e-01,
        2.67416509e-01, 9.76533857e-01, 2.98816654e-01, 1.70440985e-01, 9.33716042e-01, 9.49590722e-02, 2.97554880e-01, 3.41572916e-01,
        6.97506127e-01, 7.11564491e-01, 1.97148092e-02, 6.11278963e-02, 8.85803385e-01, 5.16950342e-01, 6.08442404e-01, 6.20483052e-01,
        9.43229901e-01, 8.06367096e-01, 4.88659785e-01, 1.54462826e-01, 1.59678909e-01, 2.15554283e-01, 3.12858984e-01, 3.32732910e-02,
        7.29550902e-01, 8.43492055e-01, 5.80419679e-01, 9.41481099e-01, 2.92356392e-01, 5.46929097e-01, 3.42553994e-01, 4.71695899e-01,
        7.17072901e-01, 4.56039560e-02, 4.97578743e-02, 8.52353806e-01, 3.46647094e-01, 8.70405632e-01, 6.95269654e-01, 9.21956219e-01,
        5.54612078e-01, 5.04047371e-01, 4.30421967e-01, 3.82460201e-01, 3.29388376e-01, 2.49494488e-02, 7.19300721e-01, 7.44559885e-01,
        9.55135224e-01, 4.23355532e-01, 9.53649771e-01, 1.90102461e-02, 9.50650494e-02, 6.06285918e-01, 7.22112999e-01, 1.75358972e-01,
        8.11588712e-01, 3.15314112e-01, 1.78194657e-01, 2.48391580e-01, 7.17012180e-01, 3.96922785e-01, 2.08147293e-01, 3.08851029e-01,
        7.43013424e-01, 8.30656467e-01, 8.86791586e-01, 1.10926714e-01, 2.88359765e-01, 4.18069556e-04, 9.11266873e-01, 1.15019872e-02];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
        NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 0.27477721, 0.44518421,
        0.40980158, 0.55602735, 0.6100629, 0.72529024, 0.69060813, 0.64550068, 0.58528646, 0.52254416, 0.45678303, 0.30632516,
        0.42163996, 0.51961084, 0.66444651, 0.59903525, 0.72295997, 0.50809417, 0.36799024, 0.43036476, 0.51750313, 0.40416016,
        0.52791742, 0.45927274, 0.36162716, 0.31092944, 0.4282666, 0.41349625, 0.34041649, 0.3185951, 0.44642595, 0.5738756,
        0.68946089, 0.5203039, 0.44818557, 0.29787629, 0.48438484, 0.33084879];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).tema(15);
    let delta = nrmse(expected.slice(42), actual.slice(42));
    T.ok(actual.every(isFinite), 'Finite test');
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('BB', (T) => {
    let c = [86.16, 89.09, 88.78, 90.32, 89.07, 91.15, 89.44, 89.18, 86.93, 87.68, 86.96, 89.43, 89.32, 88.72,
        87.45, 87.26, 89.50, 87.90, 89.13, 90.70, 92.90, 92.98, 91.80, 92.66, 92.68, 92.30, 92.77, 92.54, 92.95,
        93.20, 91.07, 89.83, 89.74, 90.40, 90.74, 88.02, 88.09, 88.84, 90.78, 90.54, 91.39, 90.65];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 86.12,
        86.14, 85.87, 85.85, 85.70, 85.65, 85.59, 85.56, 85.60, 85.98, 86.27, 86.82, 86.87, 86.91, 87.12, 87.63, 87.83,
        87.56, 87.76, 87.97, 87.95, 87.96, 87.95];
    let bb = new TA([c, c, c, c, c, c], TA.simpleFormat).bb();
    T.ok((bb.lower.every(isFinite) && bb.middle.every(isFinite) && bb.upper.every(isFinite)), 'Finite test');
    bb = new TA([c, c, c, c, c, c], TA.simpleFormat).bb(20, 2);
    let delta = nrmse(expected.slice(19), bb.lower.slice(19));
    T.ok(delta < 1e-2, `Precision test on lower (NRMSE=${delta.toFixed(5)})`);
});
test('EBB', (T) => {
    let c = [11671, 11691, 11723, 11697, 11675, 11637, 11672, 11755, 11732, 11787, 11838, 11825, 11823, 11872, 11981, 11977, 11985, 11990, 11892, 12040, 12042,
        12062, 12092, 12162, 12233, 12240, 12229, 12273, 12268, 12227, 12288, 12318, 12213, 12106, 12069, 12130, 12226, 12058, 12067, 12258, 12090, 12214, 12213,
        12024, 12044, 11993, 11891, 11613, 11775, 11859, 12037, 12019, 12086, 12171, 12221, 12198, 12279, 12351, 12320, 12377, 12400, 12394, 12427, 12409, 11953,
        12076, 11897, 11962, 12004, 12190, 12110, 12050, 11935, 12044, 12189, 12261, 12414, 12583, 12570, 12626, 12719, 12657, 12506, 12447, 12492, 12437, 12480,
        12385, 12587, 12572, 12724, 12681, 12593, 12501, 12303, 12240, 12143, 12132, 11867, 11896];
    let expected = [11670.75, 11686.40, 11713.58, 11715.42, 11712.49, 11715.65, 11712.47, 11747.44, 11756.34, 11789.78, 11838.17, 11862.04, 11877.11,
        11908.09, 11984.58, 12030.61, 12064.94, 12089.86, 12079.20, 12116.70, 12142.76, 12167.87, 12195.99, 12243.37, 12306.98, 12352.41, 12379.09, 12412.84,
        12433.59, 12434.18, 12450.84, 12471.24, 12456.81, 12432.07, 12408.82, 12388.49, 12386.81, 12367.71, 12348.20, 12363.96, 12345.09, 12345.53, 12343.93,
        12334.35, 12318.81, 12307.94, 12312.56, 12386.42, 12362.18, 12328.54, 12315.26, 12298.31, 12297.17, 12320.18, 12353.44, 12367.83, 12405.66, 12460.26,
        12485.42, 12522.63, 12556.27, 12576.50, 12600.30, 12610.01, 12607.86, 12575.71, 12564.73, 12533.51, 12498.82, 12483.84, 12456.76, 12427.82, 12405.19,
        12378.76, 12379.30, 12400.33, 12478.96, 12615.49, 12696.70, 12775.37, 12868.57, 12907.34, 12890.25, 12861.74, 12842.89, 12815.19, 12796.28, 12766.17,
        12779.01, 12781.61, 12836.08, 12856.77, 12845.66, 12820.50, 12806.31, 12794.68, 12790.72, 12772.73, 12803.05, 12785.13];
    let ebb = new TA([c, c, c, c, c, c], TA.simpleFormat).ebb();
    T.ok((ebb.lower.every(isFinite) && ebb.middle.every(isFinite) && ebb.upper.every(isFinite)), 'Finite test');
    ebb = new TA([c, c, c, c, c, c], TA.simpleFormat).ebb(14, 2);
    let delta = nrmse(expected.slice(19), ebb.upper.slice(19));
    T.ok(delta < 1e-2, `Precision test on upper (NRMSE=${delta.toFixed(5)})`);
});
test('PSAR', (T) => {
    let h = [9.8, 9.6, 9.9, 9.8, 9.2, 9.4, 9.5, 9.3, 9.9, 10.2, 10.1, 10.5, 11.3, 11.6, 11.6, 11.8, 11.9, 11.9, 11.6, 11.4, 11.2, 11.4,
        11.3, 11.3, 10.9, 10.8, 10.7, 10.8, 10.0, 10.1, 9.8, 9.8, 9.5, 9.4, 9.5, 9.4, 9.6, 10.0, 10.0, 9.8, 10.1, 10.0, 9.4, 9.5, 9.3, 9.4, 9.4, 10.1];
    let l = [9.6, 9.4, 9.5, 9.3, 9.0, 9.2, 9.1, 8.9, 9.6, 9.8, 9.6, 9.5, 10.8, 11.3, 11.2, 11.3, 11.7, 11.6, 11.3, 11.1, 10.9, 11.1,
        11.1, 11.0, 10.8, 10.5, 10.6, 10.1, 9.8, 9.8, 9.5, 9.6, 9.3, 9.1, 9.1, 9.0, 9.3, 9.8, 9.9, 9.6, 9.7, 9.3, 9.1, 9.2, 9.1, 8.8, 9.3, 9.3];
    let c = [9.76, 9.41, 9.85, 9.33, 9.06, 9.40, 9.22, 9.31, 9.76, 10.00, 9.59, 10.40, 11.23, 11.44, 11.44, 11.78, 11.88, 11.67, 11.33, 11.05,
        11.09, 11.35, 11.27, 11.00, 10.76, 10.54, 10.68, 10.09, 9.89, 10.04, 9.63, 9.66, 9.36, 9.37, 9.10, 9.43, 9.52, 9.81, 9.91, 9.76, 9.96, 9.26, 9.40, 9.22, 9.20, 9.37, 9.35, 10.08];
    let actual = new TA([c, c, h, l, c, c], TA.simpleFormat).psar();
    T.ok(actual.every(isFinite), 'Finite test');
});
test('VBP', (T) => {
    let c = [0, 1, 2, 2, 4, 5, 5, 7, 9, 9];
    let v = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    let expected = [0.1, 0.1, 0.2, 0, 0.1, 0.2, 0, 0.1, 0, 0.2];
    let actual = new TA([c, c, c, c, c, v], TA.simpleFormat).vbp();
    T.ok([actual.bottom, actual.top].every(isFinite) && actual.volumes.every(isFinite), 'Finite test');
    actual = new TA([c, c, c, c, c, v], TA.simpleFormat).vbp(10);
    let delta = nrmse(expected, actual.volumes) + Math.abs(actual.bottom) + Math.abs(actual.top - 9);
    T.ok(delta < 0.1, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('Keltner channel', (T) => {
    let h = [11711, 11698, 11743, 11737, 11727, 11677, 11704, 11782, 11757, 11794, 11859, 11861, 11845, 11905, 11983, 11986,
        12021, 12020, 11892, 12051, 12058, 12081, 12092, 12189, 12239, 12254, 12240, 12286, 12276, 12268, 12303, 12331, 12390,
        12221, 12130, 12151, 12235, 12261, 12115, 12283, 12243, 12251, 12258, 12211, 12087, 12042, 11989, 11857, 11801, 11927,
        12078, 12051, 12116, 12191, 12260, 12273, 12285, 12383, 12382, 12420, 12407, 12438, 12451, 12441, 12012, 12121,
        12075, 11990, 12073, 12217, 12208, 12109, 12057, 12099, 12190, 12284, 12427, 12596, 12602, 12643, 12754, 12718];
    let l = [11577, 11636, 11653, 11667, 11600, 11574, 11635, 11674, 11701, 11699, 11778, 11798, 11745, 11823, 11868, 11899,
        11962, 11972, 11818, 11893, 12019, 11981, 12026, 12092, 12150, 12188, 12157, 12180, 12236, 12193, 12220, 12253, 12176,
        12063, 11983, 12061, 12130, 12055, 12019, 12068, 12042, 12072, 12157, 11974, 11936, 11897, 11696, 11555, 11615, 11777,
        11860, 12003, 11973, 12088, 12171, 12198, 12174, 12280, 12319, 12321, 12369, 12353, 12387, 12328, 11918, 11951,
        11863, 11876, 11963, 12081, 12106, 11875, 11925, 11934, 12042, 12176, 12262, 12404, 12541, 12539, 12627, 12567];
    let c = [11671, 11691, 11723, 11697, 11675, 11637, 11672, 11755, 11732, 11787, 11838, 11825, 11823, 11872, 11981, 11977,
        11985, 11990, 11892, 12040, 12042, 12062, 12092, 12162, 12233, 12240, 12229, 12273, 12268, 12227, 12288, 12318, 12213,
        12106, 12069, 12130, 12226, 12058, 12067, 12258, 12090, 12214, 12213, 12024, 12044, 11993, 11891, 11613, 11775, 11859,
        12037, 12019, 12086, 12171, 12221, 12198, 12279, 12351, 12320, 12377, 12400, 12394, 12427, 12409, 11953, 12076,
        11897, 11962, 12004, 12190, 12110, 12050, 11935, 12044, 12189, 12261, 12414, 12583, 12570, 12626, 12719, 12657];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 12057.39,
        12072.61, 12096.61, 12116.78, 12147.59, 12182.78, 12210.92, 12236.10, 12266.96, 12283.88, 12297.52, 12318.65,
        12340.20, 12364.12, 12363.76, 12357.43, 12352.59, 12363.19, 12364.48, 12351.99, 12383.71, 12389.77, 12407.13,
        12411.39, 12409.27, 12398.61, 12382.17, 12375.86, 12340.30, 12311.45, 12292.92, 12310.11, 12298.63, 12310.25,
        12325.99, 12343.57, 12353.19, 12376.97, 12405.79, 12420.36, 12445.25, 12460.82, 12479.33, 12496.48, 12515.38,
        12525.07, 12507.17, 12474.34, 12440.87, 12416.85, 12434.98, 12424.74, 12426.44, 12398.59, 12393.51, 12406.21,
        12421.22, 12462.39, 12524.45, 12558.20, 12600.24, 12652.16, 12692.18];
    let actual = new TA([h, h, h, l, c, c], TA.simpleFormat).keltner();
    T.ok(actual.lower.every(isFinite) && actual.middle.every(isFinite) && actual.upper.every(isFinite), 'Finite test');
    actual = new TA([h, h, h, l, c, c], TA.simpleFormat).keltner(14, 2);
    let delta = nrmse(expected.slice(20), actual.upper.slice(20));
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('VWAP', (T) => {
    let h = [12736, 12731, 12721, 12715, 12708, 12719, 12709, 12708, 12718, 12716, 12731, 12735, 12734, 12729, 12736,
        12730, 12724, 12723, 12725, 12713, 12709, 12709, 12709, 12714, 12714, 12712, 12692, 12690, 12694, 12695, 12678];
    let l = [12699, 12710, 12711, 12693, 12698, 12699, 12682, 12695, 12705, 12705, 12708, 12720, 12725, 12717, 12725,
        12719, 12711, 12717, 12710, 12705, 12704, 12704, 12705, 12707, 12707, 12690, 12687, 12684, 12684, 12669, 12667];
    let c = [12728, 12711, 12715, 12704, 12698, 12707, 12693, 12705, 12711, 12715, 12730, 12728, 12728, 12729, 12725,
        12722, 12719, 12720, 12710, 12706, 12706, 12707, 12709, 12714, 12713, 12690, 12689, 12684, 12694, 12669, 12674];
    let v = [89329, 16137, 23945, 20679, 27252, 20915, 17372, 17600, 13896, 6700, 13848, 9925, 5540, 10803, 19400,
        9322, 9982, 8723, 7735, 30330, 8486, 9885, 10728, 10796, 21740, 43638, 8000, 10340, 10515, 26587, 11731];
    let expected = [12721, 12720, 12720, 12717, 12715, 12714, 12713, 12712, 12712, 12712, 12712, 12713, 12713, 12714, 12715,
        12715, 12715, 12715, 12715, 12715, 12714, 12714, 12714, 12714, 12714, 12712, 12712, 12711, 12711, 12709, 12709];
    let actual = new TA([c, c, h, l, c, v], TA.simpleFormat).vwap();
    let delta = nrmse(expected, actual);
    T.ok(actual.every(isFinite), 'Finite test');
    T.ok(delta < 0.1, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('ZigZag', (T) => {
    let t = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
    let h = [-8, -4, -1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 22, 33, 44, 55, 66, 77, 88, 88, 71, 61, 51, 41, 51, 61, 71, 81, 91, 11];
    let l = [-9, -5, -2, 8, 7, 6, 5, 4, 3, 2, 1, 0, 10, 20, 30, 40, 50, 60, 70, 80, 85, 70, 60, 50, 40, 50, 60, 70, 80, 90, 10];
    let expected = [-9, 9, 0, 88, 40, 91];
    let actual = new TA([t, h, h, l, l, l], TA.simpleFormat).zigzag();
    T.ok(actual.time.every(isFinite) && actual.price.every(isFinite), 'Finite test');
    actual = new TA([t, h, h, l, l, l], TA.simpleFormat).zigzag(10);
    let delta = nrmse(expected, actual.price);
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('STDDEV', (T) => {
    let c = [52.22, 52.78, 53.02, 53.67, 53.67, 53.74, 53.45, 53.72, 53.39, 52.51, 52.32, 51.45, 51.60, 52.43, 52.47,
        52.91, 52.07, 53.12, 52.77, 52.73, 52.09, 53.19, 53.73, 53.87, 53.85, 53.88, 54.08, 54.14, 54.50, 54.30, 54.40, 54.16];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 0.51, 0.73, 0.86, 0.83, 0.79, 0.72, 0.68,
        0.58, 0.51, 0.52, 0.53, 0.48, 0.49, 0.58, 0.62, 0.67, 0.62, 0.66, 0.69, 0.65, 0.36, 0.24];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).stdev();
    T.ok(actual.every(isFinite), 'Finite test');
    actual = new TA([c, c, c, c, c, c], TA.simpleFormat).stdev(10);
    let delta = nrmse(expected.slice(10), actual.slice(10));
    T.ok(delta < 1e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('MADEV', (T) => {
    let c = [23.98, 23.92, 23.79, 23.67, 23.54, 23.36, 23.65, 23.72, 24.16, 23.91, 23.81, 23.92, 23.74, 24.68, 24.94, 24.93,
        25.10, 25.12, 25.20, 25.06, 24.50, 24.31, 24.57, 24.62, 24.49, 24.37, 24.41, 24.35, 23.75, 24.09, 23.98, 23.92,
        23.79, 23.67, 23.54, 23.36, 23.65, 23.72, 24.16, 23.91, 23.81, 23.92, 23.74, 24.68, 24.94, 24.93, 25.10, 25.12];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 0.55, 0.56,
        0.55, 0.54, 0.53, 0.49, 0.44, 0.39, 0.36, 0.38, 0.37, 0.37, 0.37, 0.36, 0.39, 0.41, 0.44, 0.44, 0.42, 0.37, 0.33,
        0.32, 0.30, 0.28, 0.28, 0.31, 0.34, 0.39, 0.44];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).madev();
    T.ok(actual.every(isFinite), 'Finite test');
    actual = new TA([c, c, c, c, c, c], TA.simpleFormat).madev(20);
    let delta = nrmse(expected.slice(20), actual.slice(20));
    T.ok(delta < 2e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('EXPDEV', (T) => {
    let c = [11671, 11691, 11723, 11697, 11675, 11637, 11672, 11755, 11732, 11787, 11838, 11825, 11823, 11872, 11981, 11977, 11985,
        11990, 11892, 12040, 12042, 12062, 12092, 12162, 12233, 12240, 12229, 12273, 12268, 12227, 12288, 12318, 12213, 12106, 12069,
        12130, 12226, 12058, 12067, 12258, 12090, 12214, 12213, 12024, 12044, 11993, 11891, 11613, 11775, 11859, 12037, 12019, 12086,
        12171, 12221, 12198, 12279, 12351, 12320, 12377, 12400, 12394, 12427, 12409, 11953, 12076, 11897, 11962, 12004, 12190, 12110,
        12050, 11935, 12044, 12189, 12261, 12414, 12583, 12570, 12626, 12719, 12657, 12506, 12447, 12492, 12437, 12480, 12385, 12587,
        12572, 12724, 12681, 12593, 12501, 12303, 12240, 12143, 12132, 11867, 11896];
    let expected = [0.00, 6.47, 16.76, 16.53, 15.57, 20.08, 18.73, 30.85, 32.22, 42.58, 57.89, 62.96, 64.72, 71.93, 95.76, 106.50, 112.47,
        114.94, 107.48, 114.51, 117.25, 119.54, 122.71, 132.33, 147.17, 154.73, 155.65, 158.83, 157.67, 150.74, 148.70, 147.92, 138.22, 130.82,
        125.99, 117.58, 111.88, 109.33, 105.05, 104.93, 99.76, 95.40, 90.71, 95.16, 94.03, 97.77, 114.82, 183.06, 187.32, 179.10, 168.05, 156.94,
        149.60, 149.60, 152.92, 150.10, 154.92, 165.23, 165.15, 168.99, 171.45, 169.52, 168.81, 163.87, 184.75, 179.49, 195.30, 193.87, 185.95,
        174.25, 162.42, 153.41, 154.53, 144.81, 138.45, 138.36, 158.29, 198.53, 215.71, 231.00, 250.52, 250.59, 235.41, 219.33, 205.33, 191.16,
        178.57, 167.12, 163.17, 156.52, 166.70, 165.15, 155.17, 144.86, 152.98, 164.51, 184.03, 194.38, 244.03, 262.97];
    let actual = new TA([c, c, c, c, c, c], TA.simpleFormat).expdev();
    T.ok(actual.every(isFinite), 'Finite test');
    actual = new TA([c, c, c, c, c, c], TA.simpleFormat).expdev(14);
    let delta = nrmse(expected.slice(14), actual.slice(14));
    T.ok(delta < 2e-2, `Precision test (NRMSE=${delta.toFixed(5)})`);
});
test('MACD', (T) => {
    let c = [16.39, 16.50, 16.45, 16.43, 16.52, 16.51, 16.423, 16.41, 16.47, 16.45, 16.32, 16.36, 16.34, 16.59, 16.54, 16.52,
        16.44, 16.47, 16.5, 16.45, 16.28, 16.07, 16.08, 16.1, 16.1, 16.09, 16.43, 16.49, 16.59, 16.65, 16.78, 16.86, 16.86, 16.76];
    let expected = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 0.05, 0.01, -0.01, -0.02, -0.01, 0.00, -0.01, 0.00,
        0.03, 0.09, 0.12, 0.13, 0.13, 0.12, 0.05, -0.01, -0.06, -0.10, -0.14, -0.17, -0.18, -0.16];
    let macd = new TA([c, c, c, c, c, c], TA.simpleFormat).macd();
    T.ok(macd.line.every(isFinite) && macd.signal.every(isFinite) && macd.hist.every(isFinite), 'Finite test');
    macd = new TA([c, c, c, c, c, c], TA.simpleFormat).macd(13, 5, 6);
    let delta = nrmse(expected.slice(19), macd.line.slice(19));
    T.ok(delta < 2e-2, `NRMSE test on macd line (${delta.toFixed(5)})`);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZXMiOltdLCJzb3VyY2VzQ29udGVudCI6W10sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsifQ==
