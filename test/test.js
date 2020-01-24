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

const startTestMessage = (test, offset) => ({
    type: "TEST_START" /* TEST_START */,
    data: test,
    offset
});
const assertionMessage = (assertion, offset) => ({
    type: "ASSERTION" /* ASSERTION */,
    data: assertion,
    offset
});
const endTestMessage = (test, offset) => ({
    type: "TEST_END" /* TEST_END */,
    data: test,
    offset
});
const bailout = (error, offset) => ({
    type: "BAIL_OUT" /* BAIL_OUT */,
    data: error,
    offset
});

const delegateToCounter = (counter) => (target) => Object.defineProperties(target, {
    skipCount: {
        get() {
            return counter.skipCount;
        }
    },
    failureCount: {
        get() {
            return counter.failureCount;
        }
    },
    successCount: {
        get() {
            return counter.successCount;
        }
    },
    count: {
        get() {
            return counter.count;
        }
    }
});
const counter = () => {
    let success = 0;
    let failure = 0;
    let skip = 0;
    return Object.defineProperties({
        update(assertion) {
            const { pass, skip: isSkipped } = assertion;
            if (isSkipped) {
                skip++;
            }
            else if (!isAssertionResult(assertion)) {
                skip += assertion.skipCount;
                success += assertion.successCount;
                failure += assertion.failureCount;
            }
            else if (pass) {
                success++;
            }
            else {
                failure++;
            }
        }
    }, {
        successCount: {
            get() {
                return success;
            }
        },
        failureCount: {
            get() {
                return failure;
            }
        },
        skipCount: {
            get() {
                return skip;
            }
        },
        count: {
            get() {
                return skip + success + failure;
            }
        }
    });
};

const defaultTestOptions = Object.freeze({
    offset: 0,
    skip: false,
    runOnly: false
});
const noop = () => {
};
const TesterPrototype = {
    [Symbol.asyncIterator]: async function* () {
        await this.routine;
        for (const assertion of this.assertions) {
            if (assertion[Symbol.asyncIterator]) {
                // Sub test
                yield startTestMessage({ description: assertion.description }, this.offset);
                yield* assertion;
                if (assertion.error !== null) {
                    // Bubble up the error and return
                    this.error = assertion.error;
                    this.pass = false;
                    return;
                }
            }
            yield assertionMessage(assertion, this.offset);
            this.pass = this.pass && assertion.pass;
            this.counter.update(assertion);
        }
        return this.error !== null ?
            yield bailout(this.error, this.offset) :
            yield endTestMessage(this, this.offset);
    }
};
const testerLikeProvider = (BaseProto = TesterPrototype) => (assertions, routine, offset) => {
    const testCounter = counter();
    const withTestCounter = delegateToCounter(testCounter);
    let pass = true;
    return withTestCounter(Object.create(BaseProto, {
        routine: {
            value: routine
        },
        assertions: {
            value: assertions
        },
        offset: {
            value: offset
        },
        counter: {
            value: testCounter
        },
        length: {
            get() {
                return assertions.length;
            }
        },
        pass: {
            enumerable: true,
            get() {
                return pass;
            },
            set(val) {
                pass = val;
            }
        }
    }));
};
const testerFactory = testerLikeProvider();

const tester = (description, spec, { offset = 0, skip = false, runOnly = false } = defaultTestOptions) => {
    let executionTime = 0;
    let error = null;
    let done = false;
    const assertions = [];
    const collect = item => {
        if (done) {
            throw new Error(`test "${description}" 
tried to collect an assertion after it has run to its completion. 
You might have forgotten to wait for an asynchronous task to complete
------
${spec.toString()}
`);
        }
        assertions.push(item);
    };
    const specFunction = skip === true ? noop : function zora_spec_fn() {
        return spec(assert(collect, offset, runOnly));
    };
    const testRoutine = (async function () {
        try {
            const start = Date.now();
            const result = await specFunction();
            executionTime = Date.now() - start;
            return result;
        }
        catch (e) {
            error = e;
        }
        finally {
            done = true;
        }
    })();
    return Object.defineProperties(testerFactory(assertions, testRoutine, offset), {
        error: {
            get() {
                return error;
            },
            set(val) {
                error = val;
            }
        },
        executionTime: {
            enumerable: true,
            get() {
                return executionTime;
            }
        },
        skip: {
            value: skip
        },
        description: {
            enumerable: true,
            value: description
        }
    });
};

// do not edit .js files directly - edit src/index.jst



var fastDeepEqual = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};

const isAssertionResult = (result) => {
    return 'operator' in result;
};
const specFnRegexp = /zora_spec_fn/;
const zoraInternal = /zora\/dist\/bundle/;
const filterStackLine = l => (l && !zoraInternal.test(l) && !l.startsWith('Error') || specFnRegexp.test(l));
const getAssertionLocation = () => {
    const err = new Error();
    const stack = (err.stack || '')
        .split('\n')
        .map(l => l.trim())
        .filter(filterStackLine);
    const userLandIndex = stack.findIndex(l => specFnRegexp.test(l));
    const stackline = userLandIndex >= 1 ? stack[userLandIndex - 1] : (stack[0] || 'N/A');
    return stackline
        .replace(/^at|^@/, '');
};
const assertMethodHook = (fn) => function (...args) {
    // @ts-ignore
    return this.collect(fn(...args));
};
const aliasMethodHook = (methodName) => function (...args) {
    return this[methodName](...args);
};
const AssertPrototype = {
    equal: assertMethodHook((actual, expected, description = 'should be equivalent') => ({
        pass: fastDeepEqual(actual, expected),
        actual,
        expected,
        description,
        operator: "equal" /* EQUAL */
    })),
    equals: aliasMethodHook('equal'),
    eq: aliasMethodHook('equal'),
    deepEqual: aliasMethodHook('equal'),
    notEqual: assertMethodHook((actual, expected, description = 'should not be equivalent') => ({
        pass: !fastDeepEqual(actual, expected),
        actual,
        expected,
        description,
        operator: "notEqual" /* NOT_EQUAL */
    })),
    notEquals: aliasMethodHook('notEqual'),
    notEq: aliasMethodHook('notEqual'),
    notDeepEqual: aliasMethodHook('notEqual'),
    is: assertMethodHook((actual, expected, description = 'should be the same') => ({
        pass: Object.is(actual, expected),
        actual,
        expected,
        description,
        operator: "is" /* IS */
    })),
    same: aliasMethodHook('is'),
    isNot: assertMethodHook((actual, expected, description = 'should not be the same') => ({
        pass: !Object.is(actual, expected),
        actual,
        expected,
        description,
        operator: "isNot" /* IS_NOT */
    })),
    notSame: aliasMethodHook('isNot'),
    ok: assertMethodHook((actual, description = 'should be truthy') => ({
        pass: Boolean(actual),
        actual,
        expected: 'truthy value',
        description,
        operator: "ok" /* OK */
    })),
    truthy: aliasMethodHook('ok'),
    notOk: assertMethodHook((actual, description = 'should be falsy') => ({
        pass: !Boolean(actual),
        actual,
        expected: 'falsy value',
        description,
        operator: "notOk" /* NOT_OK */
    })),
    falsy: aliasMethodHook('notOk'),
    fail: assertMethodHook((description = 'fail called') => ({
        pass: false,
        actual: 'fail called',
        expected: 'fail not called',
        description,
        operator: "fail" /* FAIL */
    })),
    throws: assertMethodHook((func, expected, description) => {
        let caught;
        let pass;
        let actual;
        if (typeof expected === 'string') {
            [expected, description] = [description, expected];
        }
        try {
            func();
        }
        catch (err) {
            caught = { error: err };
        }
        pass = caught !== undefined;
        actual = caught && caught.error;
        if (expected instanceof RegExp) {
            pass = expected.test(actual) || expected.test(actual && actual.message);
            actual = actual && actual.message || actual;
            expected = String(expected);
        }
        else if (typeof expected === 'function' && caught) {
            pass = actual instanceof expected;
            actual = actual.constructor;
        }
        return {
            pass,
            actual,
            expected,
            description: description || 'should throw',
            operator: "throws" /* THROWS */
        };
    }),
    doesNotThrow: assertMethodHook((func, expected, description) => {
        let caught;
        if (typeof expected === 'string') {
            [expected, description] = [description, expected];
        }
        try {
            func();
        }
        catch (err) {
            caught = { error: err };
        }
        return {
            pass: caught === undefined,
            expected: 'no thrown error',
            actual: caught && caught.error,
            operator: "doesNotThrow" /* DOES_NOT_THROW */,
            description: description || 'should not throw'
        };
    })
};
const assert = (collect, offset, runOnly = false) => {
    const actualCollect = item => {
        if (!item.pass) {
            item.at = getAssertionLocation();
        }
        collect(item);
        return item;
    };
    const test = (description, spec, opts) => {
        const options = Object.assign({}, defaultTestOptions, opts, { offset: offset + 1, runOnly });
        const subTest = tester(description, spec, options);
        collect(subTest);
        return subTest.routine;
    };
    const skip = (description, spec, opts) => {
        return test(description, spec, Object.assign({}, opts, { skip: true }));
    };
    return Object.assign(Object.create(AssertPrototype, { collect: { value: actualCollect } }), {
        test(description, spec, opts = {}) {
            if (runOnly) {
                return skip(description, spec, opts);
            }
            return test(description, spec, opts);
        },
        skip(description, spec = noop, opts = {}) {
            return skip(description, spec, opts);
        },
        only(description, spec, opts = {}) {
            const specFn = runOnly === false ? _ => {
                throw new Error(`Can not use "only" method when not in run only mode`);
            } : spec;
            return test(description, specFn, opts);
        }
    });
};

const map = (fn) => async function* (stream) {
    for await (const m of stream) {
        yield fn(m);
    }
};
// ! it mutates the underlying structure yet it is more efficient regarding performances
const flatten = map((m) => {
    m.offset = 0;
    return m;
});
const isAssertionResult$1 = (result) => {
    return 'operator' in result;
};
const stringifySymbol = (key, value) => {
    if (typeof value === 'symbol') {
        return value.toString();
    }
    return value;
};

// @ts-ignore
const flatDiagnostic = ({ pass, description, ...rest }) => rest;
const Tap = {
    print(message, offset = 0) {
        this.log(message.padStart(message.length + (offset * 4))); // 4 white space used as indent (see tap-parser)
    },
    printYAML(obj, offset = 0) {
        const YAMLOffset = offset + 0.5;
        this.print('---', YAMLOffset);
        for (const [prop, value] of Object.entries(obj)) {
            this.print(`${prop}: ${JSON.stringify(value, stringifySymbol)}`, YAMLOffset + 0.5);
        }
        this.print('...', YAMLOffset);
    },
    printComment(comment, offset = 0) {
        this.print(`# ${comment}`, offset);
    },
    printBailOut(message) {
        this.print('Bail out! Unhandled error.');
    },
    printTestStart(message) {
        const { data: { description }, offset } = message;
        this.printComment(description, offset);
    },
    printTestEnd(message) {
        // do nothing
    },
    printAssertion(message) {
        const { data, offset } = message;
        const { pass, description } = data;
        const label = pass === true ? 'ok' : 'not ok';
        if (isAssertionResult$1(data)) {
            const id = this.nextId();
            this.print(`${label} ${id} - ${description}`, offset);
            if (pass === false) {
                this.printYAML(flatDiagnostic(data), offset);
            }
        }
        else if (data.skip) {
            const id = this.nextId();
            this.print(`${pass ? 'ok' : 'not ok'} ${id} - ${description} # SKIP`, offset);
        }
    },
    printSummary(endMessage) {
        this.print('', 0);
        this.printComment(endMessage.data.pass ? 'ok' : 'not ok', 0);
        this.printComment(`success: ${endMessage.data.successCount}`, 0);
        this.printComment(`skipped: ${endMessage.data.skipCount}`, 0);
        this.printComment(`failure: ${endMessage.data.failureCount}`, 0);
    },
    async report(stream) {
        const src = flatten(stream);
        let lastMessage = null;
        this.print('TAP version 13');
        for await (const message of src) {
            lastMessage = message;
            switch (message.type) {
                case "TEST_START" /* TEST_START */:
                    this.printTestStart(message);
                    break;
                case "ASSERTION" /* ASSERTION */:
                    this.printAssertion(message);
                    break;
                case "BAIL_OUT" /* BAIL_OUT */:
                    this.printBailOut(message);
                    throw message.data;
            }
        }
        this.print(`1..${lastMessage.data.count}`, 0);
        this.printSummary(lastMessage);
    }
};
const factory = (log) => {
    let i = 0;
    return Object.create(Tap, {
        nextId: {
            enumerable: true,
            value: () => {
                return ++i;
            }
        },
        log: { value: log }
    });
};

const indentedDiagnostic = ({ expected, pass, description, actual, operator, at = 'N/A', ...rest }) => ({
    wanted: expected,
    found: actual,
    at,
    operator,
    ...rest
});
const id = function* () {
    let i = 0;
    while (true) {
        yield ++i;
    }
};
const idGen = () => {
    let stack = [id()];
    return {
        [Symbol.iterator]() {
            return this;
        },
        next() {
            return stack[0].next();
        },
        fork() {
            stack.unshift(id());
        },
        merge() {
            stack.shift();
        }
    };
};
const IndentedTap = Object.assign({}, Tap, {
    printTestStart(message) {
        const { data: { description }, offset } = message;
        this.printComment(`Subtest: ${description}`, offset);
    },
    printAssertion(message) {
        const { data, offset } = message;
        const { pass, description } = data;
        const label = pass === true ? 'ok' : 'not ok';
        const id = this.nextId();
        if (isAssertionResult$1(data)) {
            this.print(`${label} ${id} - ${description}`, offset);
            if (pass === false) {
                this.printYAML(indentedDiagnostic(data), offset);
            }
        }
        else {
            const comment = data.skip === true ? 'SKIP' : `${data.executionTime}ms`;
            this.print(`${pass ? 'ok' : 'not ok'} ${id} - ${description} # ${comment}`, message.offset);
        }
    },
    printTestEnd(message) {
        const length = message.data.length;
        const { offset } = message;
        this.print(`1..${length}`, offset);
    }
});
const factory$1 = (log) => {
    const id = idGen();
    return Object.create(IndentedTap, {
        nextId: {
            enumerable: true,
            value: () => {
                return id.next().value;
            }
        },
        report: {
            enumerable: true,
            value: async function (stream) {
                this.print('TAP version 13');
                let lastMessage = null;
                for await (const message of stream) {
                    lastMessage = message;
                    switch (message.type) {
                        case "TEST_START" /* TEST_START */:
                            id.fork();
                            this.printTestStart(message);
                            break;
                        case "ASSERTION" /* ASSERTION */:
                            this.printAssertion(message);
                            break;
                        case "TEST_END" /* TEST_END */:
                            id.merge();
                            this.printTestEnd(message);
                            break;
                        case "BAIL_OUT" /* BAIL_OUT */:
                            this.printBailOut(message);
                            throw message.data;
                    }
                }
                this.printSummary(lastMessage);
            }
        },
        log: { value: log }
    });
};

const report = (factory) => (logger = console) => {
    const log = logger.log.bind(logger);
    return async (stream) => factory(log).report(stream);
};
const tapReporter = report(factory);
const indentedTapReporter = report(factory$1);

//@ts-ignore
const mochaTapLike = indentedTapReporter();
//@ts-ignore
const tapeTapLike = tapReporter();

const harnessFactory = ({ runOnly = false, indent = false } = {
    runOnly: false,
    indent: false
}) => {
    const tests = [];
    const rootOffset = 0;
    const collect = item => tests.push(item);
    const api = assert(collect, rootOffset, runOnly);
    let error = null;
    const factory = testerLikeProvider(Object.assign(api, TesterPrototype, {
        report: async function (reporter) {
            const rep = reporter || (indent ? mochaTapLike : tapeTapLike);
            return rep(this);
        }
    }));
    return Object.defineProperties(factory(tests, Promise.resolve(), rootOffset), {
        error: {
            get() {
                return error;
            },
            set(val) {
                error = val;
            }
        }
    });
};

const findConfigurationFlag = (name) => {
    if (typeof process !== 'undefined') {
        return process.env[name] === 'true';
        // @ts-ignore
    }
    else if (typeof window !== 'undefined') {
        // @ts-ignore
        return Boolean(window[name]);
    }
    return false;
};
const defaultTestHarness = harnessFactory({
    runOnly: findConfigurationFlag('RUN_ONLY')
});
let autoStart = true;
let indent = findConfigurationFlag('INDENT');
const rootTest = defaultTestHarness.test.bind(defaultTestHarness);
rootTest.indent = () => {
    console.warn('indent function is deprecated, use "INDENT" configuration flag instead');
    indent = true;
};
const test = rootTest;
const skip = defaultTestHarness.skip.bind(defaultTestHarness);
const only = defaultTestHarness.only.bind(defaultTestHarness);
rootTest.skip = skip;
const equal = defaultTestHarness.equal.bind(defaultTestHarness);
const notEqual = defaultTestHarness.notEqual.bind(defaultTestHarness);
const is = defaultTestHarness.is.bind(defaultTestHarness);
const isNot = defaultTestHarness.isNot.bind(defaultTestHarness);
const ok = defaultTestHarness.ok.bind(defaultTestHarness);
const notOk = defaultTestHarness.notOk.bind(defaultTestHarness);
const fail = defaultTestHarness.fail.bind(defaultTestHarness);
const throws = defaultTestHarness.throws.bind(defaultTestHarness);
const doesNotThrow = defaultTestHarness.doesNotThrow.bind(defaultTestHarness);
const start = () => {
    if (autoStart) {
        defaultTestHarness.report(indent ? mochaTapLike : tapeTapLike);
    }
};
// on next tick start reporting
// @ts-ignore
if (typeof window === 'undefined') {
    setTimeout(start, 0);
}
else {
    // @ts-ignore
    window.addEventListener('load', start);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3pvcmEvZGlzdC9idW5kbGUvbW9kdWxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHN0YXJ0VGVzdE1lc3NhZ2UgPSAodGVzdCwgb2Zmc2V0KSA9PiAoe1xuICAgIHR5cGU6IFwiVEVTVF9TVEFSVFwiIC8qIFRFU1RfU1RBUlQgKi8sXG4gICAgZGF0YTogdGVzdCxcbiAgICBvZmZzZXRcbn0pO1xuY29uc3QgYXNzZXJ0aW9uTWVzc2FnZSA9IChhc3NlcnRpb24sIG9mZnNldCkgPT4gKHtcbiAgICB0eXBlOiBcIkFTU0VSVElPTlwiIC8qIEFTU0VSVElPTiAqLyxcbiAgICBkYXRhOiBhc3NlcnRpb24sXG4gICAgb2Zmc2V0XG59KTtcbmNvbnN0IGVuZFRlc3RNZXNzYWdlID0gKHRlc3QsIG9mZnNldCkgPT4gKHtcbiAgICB0eXBlOiBcIlRFU1RfRU5EXCIgLyogVEVTVF9FTkQgKi8sXG4gICAgZGF0YTogdGVzdCxcbiAgICBvZmZzZXRcbn0pO1xuY29uc3QgYmFpbG91dCA9IChlcnJvciwgb2Zmc2V0KSA9PiAoe1xuICAgIHR5cGU6IFwiQkFJTF9PVVRcIiAvKiBCQUlMX09VVCAqLyxcbiAgICBkYXRhOiBlcnJvcixcbiAgICBvZmZzZXRcbn0pO1xuXG5jb25zdCBkZWxlZ2F0ZVRvQ291bnRlciA9IChjb3VudGVyKSA9PiAodGFyZ2V0KSA9PiBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHtcbiAgICBza2lwQ291bnQ6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50ZXIuc2tpcENvdW50O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBmYWlsdXJlQ291bnQ6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50ZXIuZmFpbHVyZUNvdW50O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzdWNjZXNzQ291bnQ6IHtcbiAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50ZXIuc3VjY2Vzc0NvdW50O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBjb3VudDoge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICByZXR1cm4gY291bnRlci5jb3VudDtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuY29uc3QgY291bnRlciA9ICgpID0+IHtcbiAgICBsZXQgc3VjY2VzcyA9IDA7XG4gICAgbGV0IGZhaWx1cmUgPSAwO1xuICAgIGxldCBza2lwID0gMDtcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoe1xuICAgICAgICB1cGRhdGUoYXNzZXJ0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB7IHBhc3MsIHNraXA6IGlzU2tpcHBlZCB9ID0gYXNzZXJ0aW9uO1xuICAgICAgICAgICAgaWYgKGlzU2tpcHBlZCkge1xuICAgICAgICAgICAgICAgIHNraXArKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCFpc0Fzc2VydGlvblJlc3VsdChhc3NlcnRpb24pKSB7XG4gICAgICAgICAgICAgICAgc2tpcCArPSBhc3NlcnRpb24uc2tpcENvdW50O1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgKz0gYXNzZXJ0aW9uLnN1Y2Nlc3NDb3VudDtcbiAgICAgICAgICAgICAgICBmYWlsdXJlICs9IGFzc2VydGlvbi5mYWlsdXJlQ291bnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChwYXNzKSB7XG4gICAgICAgICAgICAgICAgc3VjY2VzcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICBzdWNjZXNzQ291bnQ6IHtcbiAgICAgICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZmFpbHVyZUNvdW50OiB7XG4gICAgICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhaWx1cmU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNraXBDb3VudDoge1xuICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBza2lwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb3VudDoge1xuICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBza2lwICsgc3VjY2VzcyArIGZhaWx1cmU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbmNvbnN0IGRlZmF1bHRUZXN0T3B0aW9ucyA9IE9iamVjdC5mcmVlemUoe1xuICAgIG9mZnNldDogMCxcbiAgICBza2lwOiBmYWxzZSxcbiAgICBydW5Pbmx5OiBmYWxzZVxufSk7XG5jb25zdCBub29wID0gKCkgPT4ge1xufTtcbmNvbnN0IFRlc3RlclByb3RvdHlwZSA9IHtcbiAgICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdOiBhc3luYyBmdW5jdGlvbiogKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnJvdXRpbmU7XG4gICAgICAgIGZvciAoY29uc3QgYXNzZXJ0aW9uIG9mIHRoaXMuYXNzZXJ0aW9ucykge1xuICAgICAgICAgICAgaWYgKGFzc2VydGlvbltTeW1ib2wuYXN5bmNJdGVyYXRvcl0pIHtcbiAgICAgICAgICAgICAgICAvLyBTdWIgdGVzdFxuICAgICAgICAgICAgICAgIHlpZWxkIHN0YXJ0VGVzdE1lc3NhZ2UoeyBkZXNjcmlwdGlvbjogYXNzZXJ0aW9uLmRlc2NyaXB0aW9uIH0sIHRoaXMub2Zmc2V0KTtcbiAgICAgICAgICAgICAgICB5aWVsZCogYXNzZXJ0aW9uO1xuICAgICAgICAgICAgICAgIGlmIChhc3NlcnRpb24uZXJyb3IgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQnViYmxlIHVwIHRoZSBlcnJvciBhbmQgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBhc3NlcnRpb24uZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeWllbGQgYXNzZXJ0aW9uTWVzc2FnZShhc3NlcnRpb24sIHRoaXMub2Zmc2V0KTtcbiAgICAgICAgICAgIHRoaXMucGFzcyA9IHRoaXMucGFzcyAmJiBhc3NlcnRpb24ucGFzcztcbiAgICAgICAgICAgIHRoaXMuY291bnRlci51cGRhdGUoYXNzZXJ0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5lcnJvciAhPT0gbnVsbCA/XG4gICAgICAgICAgICB5aWVsZCBiYWlsb3V0KHRoaXMuZXJyb3IsIHRoaXMub2Zmc2V0KSA6XG4gICAgICAgICAgICB5aWVsZCBlbmRUZXN0TWVzc2FnZSh0aGlzLCB0aGlzLm9mZnNldCk7XG4gICAgfVxufTtcbmNvbnN0IHRlc3Rlckxpa2VQcm92aWRlciA9IChCYXNlUHJvdG8gPSBUZXN0ZXJQcm90b3R5cGUpID0+IChhc3NlcnRpb25zLCByb3V0aW5lLCBvZmZzZXQpID0+IHtcbiAgICBjb25zdCB0ZXN0Q291bnRlciA9IGNvdW50ZXIoKTtcbiAgICBjb25zdCB3aXRoVGVzdENvdW50ZXIgPSBkZWxlZ2F0ZVRvQ291bnRlcih0ZXN0Q291bnRlcik7XG4gICAgbGV0IHBhc3MgPSB0cnVlO1xuICAgIHJldHVybiB3aXRoVGVzdENvdW50ZXIoT2JqZWN0LmNyZWF0ZShCYXNlUHJvdG8sIHtcbiAgICAgICAgcm91dGluZToge1xuICAgICAgICAgICAgdmFsdWU6IHJvdXRpbmVcbiAgICAgICAgfSxcbiAgICAgICAgYXNzZXJ0aW9uczoge1xuICAgICAgICAgICAgdmFsdWU6IGFzc2VydGlvbnNcbiAgICAgICAgfSxcbiAgICAgICAgb2Zmc2V0OiB7XG4gICAgICAgICAgICB2YWx1ZTogb2Zmc2V0XG4gICAgICAgIH0sXG4gICAgICAgIGNvdW50ZXI6IHtcbiAgICAgICAgICAgIHZhbHVlOiB0ZXN0Q291bnRlclxuICAgICAgICB9LFxuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXNzZXJ0aW9ucy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHBhc3M6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhc3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0KHZhbCkge1xuICAgICAgICAgICAgICAgIHBhc3MgPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KSk7XG59O1xuY29uc3QgdGVzdGVyRmFjdG9yeSA9IHRlc3Rlckxpa2VQcm92aWRlcigpO1xuXG5jb25zdCB0ZXN0ZXIgPSAoZGVzY3JpcHRpb24sIHNwZWMsIHsgb2Zmc2V0ID0gMCwgc2tpcCA9IGZhbHNlLCBydW5Pbmx5ID0gZmFsc2UgfSA9IGRlZmF1bHRUZXN0T3B0aW9ucykgPT4ge1xuICAgIGxldCBleGVjdXRpb25UaW1lID0gMDtcbiAgICBsZXQgZXJyb3IgPSBudWxsO1xuICAgIGxldCBkb25lID0gZmFsc2U7XG4gICAgY29uc3QgYXNzZXJ0aW9ucyA9IFtdO1xuICAgIGNvbnN0IGNvbGxlY3QgPSBpdGVtID0+IHtcbiAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdGVzdCBcIiR7ZGVzY3JpcHRpb259XCIgXG50cmllZCB0byBjb2xsZWN0IGFuIGFzc2VydGlvbiBhZnRlciBpdCBoYXMgcnVuIHRvIGl0cyBjb21wbGV0aW9uLiBcbllvdSBtaWdodCBoYXZlIGZvcmdvdHRlbiB0byB3YWl0IGZvciBhbiBhc3luY2hyb25vdXMgdGFzayB0byBjb21wbGV0ZVxuLS0tLS0tXG4ke3NwZWMudG9TdHJpbmcoKX1cbmApO1xuICAgICAgICB9XG4gICAgICAgIGFzc2VydGlvbnMucHVzaChpdGVtKTtcbiAgICB9O1xuICAgIGNvbnN0IHNwZWNGdW5jdGlvbiA9IHNraXAgPT09IHRydWUgPyBub29wIDogZnVuY3Rpb24gem9yYV9zcGVjX2ZuKCkge1xuICAgICAgICByZXR1cm4gc3BlYyhhc3NlcnQoY29sbGVjdCwgb2Zmc2V0LCBydW5Pbmx5KSk7XG4gICAgfTtcbiAgICBjb25zdCB0ZXN0Um91dGluZSA9IChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzcGVjRnVuY3Rpb24oKTtcbiAgICAgICAgICAgIGV4ZWN1dGlvblRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnQ7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBlcnJvciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRlc3RlckZhY3RvcnkoYXNzZXJ0aW9ucywgdGVzdFJvdXRpbmUsIG9mZnNldCksIHtcbiAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0KHZhbCkge1xuICAgICAgICAgICAgICAgIGVycm9yID0gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBleGVjdXRpb25UaW1lOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleGVjdXRpb25UaW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBza2lwOiB7XG4gICAgICAgICAgICB2YWx1ZTogc2tpcFxuICAgICAgICB9LFxuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlOiBkZXNjcmlwdGlvblxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vLyBkbyBub3QgZWRpdCAuanMgZmlsZXMgZGlyZWN0bHkgLSBlZGl0IHNyYy9pbmRleC5qc3RcblxuXG5cbnZhciBmYXN0RGVlcEVxdWFsID0gZnVuY3Rpb24gZXF1YWwoYSwgYikge1xuICBpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XG5cbiAgaWYgKGEgJiYgYiAmJiB0eXBlb2YgYSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiA9PSAnb2JqZWN0Jykge1xuICAgIGlmIChhLmNvbnN0cnVjdG9yICE9PSBiLmNvbnN0cnVjdG9yKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgbGVuZ3RoLCBpLCBrZXlzO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGEpKSB7XG4gICAgICBsZW5ndGggPSBhLmxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggIT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tICE9PSAwOylcbiAgICAgICAgaWYgKCFlcXVhbChhW2ldLCBiW2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cblxuICAgIGlmIChhLmNvbnN0cnVjdG9yID09PSBSZWdFeHApIHJldHVybiBhLnNvdXJjZSA9PT0gYi5zb3VyY2UgJiYgYS5mbGFncyA9PT0gYi5mbGFncztcbiAgICBpZiAoYS52YWx1ZU9mICE9PSBPYmplY3QucHJvdG90eXBlLnZhbHVlT2YpIHJldHVybiBhLnZhbHVlT2YoKSA9PT0gYi52YWx1ZU9mKCk7XG4gICAgaWYgKGEudG9TdHJpbmcgIT09IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpIHJldHVybiBhLnRvU3RyaW5nKCkgPT09IGIudG9TdHJpbmcoKTtcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyhhKTtcbiAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSBPYmplY3Qua2V5cyhiKS5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tICE9PSAwOylcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIGtleXNbaV0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSAhPT0gMDspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICBpZiAoIWVxdWFsKGFba2V5XSwgYltrZXldKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gdHJ1ZSBpZiBib3RoIE5hTiwgZmFsc2Ugb3RoZXJ3aXNlXG4gIHJldHVybiBhIT09YSAmJiBiIT09Yjtcbn07XG5cbmNvbnN0IGlzQXNzZXJ0aW9uUmVzdWx0ID0gKHJlc3VsdCkgPT4ge1xuICAgIHJldHVybiAnb3BlcmF0b3InIGluIHJlc3VsdDtcbn07XG5jb25zdCBzcGVjRm5SZWdleHAgPSAvem9yYV9zcGVjX2ZuLztcbmNvbnN0IHpvcmFJbnRlcm5hbCA9IC96b3JhXFwvZGlzdFxcL2J1bmRsZS87XG5jb25zdCBmaWx0ZXJTdGFja0xpbmUgPSBsID0+IChsICYmICF6b3JhSW50ZXJuYWwudGVzdChsKSAmJiAhbC5zdGFydHNXaXRoKCdFcnJvcicpIHx8IHNwZWNGblJlZ2V4cC50ZXN0KGwpKTtcbmNvbnN0IGdldEFzc2VydGlvbkxvY2F0aW9uID0gKCkgPT4ge1xuICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGNvbnN0IHN0YWNrID0gKGVyci5zdGFjayB8fCAnJylcbiAgICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgICAubWFwKGwgPT4gbC50cmltKCkpXG4gICAgICAgIC5maWx0ZXIoZmlsdGVyU3RhY2tMaW5lKTtcbiAgICBjb25zdCB1c2VyTGFuZEluZGV4ID0gc3RhY2suZmluZEluZGV4KGwgPT4gc3BlY0ZuUmVnZXhwLnRlc3QobCkpO1xuICAgIGNvbnN0IHN0YWNrbGluZSA9IHVzZXJMYW5kSW5kZXggPj0gMSA/IHN0YWNrW3VzZXJMYW5kSW5kZXggLSAxXSA6IChzdGFja1swXSB8fCAnTi9BJyk7XG4gICAgcmV0dXJuIHN0YWNrbGluZVxuICAgICAgICAucmVwbGFjZSgvXmF0fF5ALywgJycpO1xufTtcbmNvbnN0IGFzc2VydE1ldGhvZEhvb2sgPSAoZm4pID0+IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiB0aGlzLmNvbGxlY3QoZm4oLi4uYXJncykpO1xufTtcbmNvbnN0IGFsaWFzTWV0aG9kSG9vayA9IChtZXRob2ROYW1lKSA9PiBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzW21ldGhvZE5hbWVdKC4uLmFyZ3MpO1xufTtcbmNvbnN0IEFzc2VydFByb3RvdHlwZSA9IHtcbiAgICBlcXVhbDogYXNzZXJ0TWV0aG9kSG9vaygoYWN0dWFsLCBleHBlY3RlZCwgZGVzY3JpcHRpb24gPSAnc2hvdWxkIGJlIGVxdWl2YWxlbnQnKSA9PiAoe1xuICAgICAgICBwYXNzOiBmYXN0RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpLFxuICAgICAgICBhY3R1YWwsXG4gICAgICAgIGV4cGVjdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgb3BlcmF0b3I6IFwiZXF1YWxcIiAvKiBFUVVBTCAqL1xuICAgIH0pKSxcbiAgICBlcXVhbHM6IGFsaWFzTWV0aG9kSG9vaygnZXF1YWwnKSxcbiAgICBlcTogYWxpYXNNZXRob2RIb29rKCdlcXVhbCcpLFxuICAgIGRlZXBFcXVhbDogYWxpYXNNZXRob2RIb29rKCdlcXVhbCcpLFxuICAgIG5vdEVxdWFsOiBhc3NlcnRNZXRob2RIb29rKChhY3R1YWwsIGV4cGVjdGVkLCBkZXNjcmlwdGlvbiA9ICdzaG91bGQgbm90IGJlIGVxdWl2YWxlbnQnKSA9PiAoe1xuICAgICAgICBwYXNzOiAhZmFzdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSxcbiAgICAgICAgYWN0dWFsLFxuICAgICAgICBleHBlY3RlZCxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIG9wZXJhdG9yOiBcIm5vdEVxdWFsXCIgLyogTk9UX0VRVUFMICovXG4gICAgfSkpLFxuICAgIG5vdEVxdWFsczogYWxpYXNNZXRob2RIb29rKCdub3RFcXVhbCcpLFxuICAgIG5vdEVxOiBhbGlhc01ldGhvZEhvb2soJ25vdEVxdWFsJyksXG4gICAgbm90RGVlcEVxdWFsOiBhbGlhc01ldGhvZEhvb2soJ25vdEVxdWFsJyksXG4gICAgaXM6IGFzc2VydE1ldGhvZEhvb2soKGFjdHVhbCwgZXhwZWN0ZWQsIGRlc2NyaXB0aW9uID0gJ3Nob3VsZCBiZSB0aGUgc2FtZScpID0+ICh7XG4gICAgICAgIHBhc3M6IE9iamVjdC5pcyhhY3R1YWwsIGV4cGVjdGVkKSxcbiAgICAgICAgYWN0dWFsLFxuICAgICAgICBleHBlY3RlZCxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIG9wZXJhdG9yOiBcImlzXCIgLyogSVMgKi9cbiAgICB9KSksXG4gICAgc2FtZTogYWxpYXNNZXRob2RIb29rKCdpcycpLFxuICAgIGlzTm90OiBhc3NlcnRNZXRob2RIb29rKChhY3R1YWwsIGV4cGVjdGVkLCBkZXNjcmlwdGlvbiA9ICdzaG91bGQgbm90IGJlIHRoZSBzYW1lJykgPT4gKHtcbiAgICAgICAgcGFzczogIU9iamVjdC5pcyhhY3R1YWwsIGV4cGVjdGVkKSxcbiAgICAgICAgYWN0dWFsLFxuICAgICAgICBleHBlY3RlZCxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIG9wZXJhdG9yOiBcImlzTm90XCIgLyogSVNfTk9UICovXG4gICAgfSkpLFxuICAgIG5vdFNhbWU6IGFsaWFzTWV0aG9kSG9vaygnaXNOb3QnKSxcbiAgICBvazogYXNzZXJ0TWV0aG9kSG9vaygoYWN0dWFsLCBkZXNjcmlwdGlvbiA9ICdzaG91bGQgYmUgdHJ1dGh5JykgPT4gKHtcbiAgICAgICAgcGFzczogQm9vbGVhbihhY3R1YWwpLFxuICAgICAgICBhY3R1YWwsXG4gICAgICAgIGV4cGVjdGVkOiAndHJ1dGh5IHZhbHVlJyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIG9wZXJhdG9yOiBcIm9rXCIgLyogT0sgKi9cbiAgICB9KSksXG4gICAgdHJ1dGh5OiBhbGlhc01ldGhvZEhvb2soJ29rJyksXG4gICAgbm90T2s6IGFzc2VydE1ldGhvZEhvb2soKGFjdHVhbCwgZGVzY3JpcHRpb24gPSAnc2hvdWxkIGJlIGZhbHN5JykgPT4gKHtcbiAgICAgICAgcGFzczogIUJvb2xlYW4oYWN0dWFsKSxcbiAgICAgICAgYWN0dWFsLFxuICAgICAgICBleHBlY3RlZDogJ2ZhbHN5IHZhbHVlJyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIG9wZXJhdG9yOiBcIm5vdE9rXCIgLyogTk9UX09LICovXG4gICAgfSkpLFxuICAgIGZhbHN5OiBhbGlhc01ldGhvZEhvb2soJ25vdE9rJyksXG4gICAgZmFpbDogYXNzZXJ0TWV0aG9kSG9vaygoZGVzY3JpcHRpb24gPSAnZmFpbCBjYWxsZWQnKSA9PiAoe1xuICAgICAgICBwYXNzOiBmYWxzZSxcbiAgICAgICAgYWN0dWFsOiAnZmFpbCBjYWxsZWQnLFxuICAgICAgICBleHBlY3RlZDogJ2ZhaWwgbm90IGNhbGxlZCcsXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBvcGVyYXRvcjogXCJmYWlsXCIgLyogRkFJTCAqL1xuICAgIH0pKSxcbiAgICB0aHJvd3M6IGFzc2VydE1ldGhvZEhvb2soKGZ1bmMsIGV4cGVjdGVkLCBkZXNjcmlwdGlvbikgPT4ge1xuICAgICAgICBsZXQgY2F1Z2h0O1xuICAgICAgICBsZXQgcGFzcztcbiAgICAgICAgbGV0IGFjdHVhbDtcbiAgICAgICAgaWYgKHR5cGVvZiBleHBlY3RlZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIFtleHBlY3RlZCwgZGVzY3JpcHRpb25dID0gW2Rlc2NyaXB0aW9uLCBleHBlY3RlZF07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjYXVnaHQgPSB7IGVycm9yOiBlcnIgfTtcbiAgICAgICAgfVxuICAgICAgICBwYXNzID0gY2F1Z2h0ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIGFjdHVhbCA9IGNhdWdodCAmJiBjYXVnaHQuZXJyb3I7XG4gICAgICAgIGlmIChleHBlY3RlZCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgcGFzcyA9IGV4cGVjdGVkLnRlc3QoYWN0dWFsKSB8fCBleHBlY3RlZC50ZXN0KGFjdHVhbCAmJiBhY3R1YWwubWVzc2FnZSk7XG4gICAgICAgICAgICBhY3R1YWwgPSBhY3R1YWwgJiYgYWN0dWFsLm1lc3NhZ2UgfHwgYWN0dWFsO1xuICAgICAgICAgICAgZXhwZWN0ZWQgPSBTdHJpbmcoZXhwZWN0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBleHBlY3RlZCA9PT0gJ2Z1bmN0aW9uJyAmJiBjYXVnaHQpIHtcbiAgICAgICAgICAgIHBhc3MgPSBhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZDtcbiAgICAgICAgICAgIGFjdHVhbCA9IGFjdHVhbC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzcyxcbiAgICAgICAgICAgIGFjdHVhbCxcbiAgICAgICAgICAgIGV4cGVjdGVkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uIHx8ICdzaG91bGQgdGhyb3cnLFxuICAgICAgICAgICAgb3BlcmF0b3I6IFwidGhyb3dzXCIgLyogVEhST1dTICovXG4gICAgICAgIH07XG4gICAgfSksXG4gICAgZG9lc05vdFRocm93OiBhc3NlcnRNZXRob2RIb29rKChmdW5jLCBleHBlY3RlZCwgZGVzY3JpcHRpb24pID0+IHtcbiAgICAgICAgbGV0IGNhdWdodDtcbiAgICAgICAgaWYgKHR5cGVvZiBleHBlY3RlZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIFtleHBlY3RlZCwgZGVzY3JpcHRpb25dID0gW2Rlc2NyaXB0aW9uLCBleHBlY3RlZF07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjYXVnaHQgPSB7IGVycm9yOiBlcnIgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogY2F1Z2h0ID09PSB1bmRlZmluZWQsXG4gICAgICAgICAgICBleHBlY3RlZDogJ25vIHRocm93biBlcnJvcicsXG4gICAgICAgICAgICBhY3R1YWw6IGNhdWdodCAmJiBjYXVnaHQuZXJyb3IsXG4gICAgICAgICAgICBvcGVyYXRvcjogXCJkb2VzTm90VGhyb3dcIiAvKiBET0VTX05PVF9USFJPVyAqLyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbiB8fCAnc2hvdWxkIG5vdCB0aHJvdydcbiAgICAgICAgfTtcbiAgICB9KVxufTtcbmNvbnN0IGFzc2VydCA9IChjb2xsZWN0LCBvZmZzZXQsIHJ1bk9ubHkgPSBmYWxzZSkgPT4ge1xuICAgIGNvbnN0IGFjdHVhbENvbGxlY3QgPSBpdGVtID0+IHtcbiAgICAgICAgaWYgKCFpdGVtLnBhc3MpIHtcbiAgICAgICAgICAgIGl0ZW0uYXQgPSBnZXRBc3NlcnRpb25Mb2NhdGlvbigpO1xuICAgICAgICB9XG4gICAgICAgIGNvbGxlY3QoaXRlbSk7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH07XG4gICAgY29uc3QgdGVzdCA9IChkZXNjcmlwdGlvbiwgc3BlYywgb3B0cykgPT4ge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFRlc3RPcHRpb25zLCBvcHRzLCB7IG9mZnNldDogb2Zmc2V0ICsgMSwgcnVuT25seSB9KTtcbiAgICAgICAgY29uc3Qgc3ViVGVzdCA9IHRlc3RlcihkZXNjcmlwdGlvbiwgc3BlYywgb3B0aW9ucyk7XG4gICAgICAgIGNvbGxlY3Qoc3ViVGVzdCk7XG4gICAgICAgIHJldHVybiBzdWJUZXN0LnJvdXRpbmU7XG4gICAgfTtcbiAgICBjb25zdCBza2lwID0gKGRlc2NyaXB0aW9uLCBzcGVjLCBvcHRzKSA9PiB7XG4gICAgICAgIHJldHVybiB0ZXN0KGRlc2NyaXB0aW9uLCBzcGVjLCBPYmplY3QuYXNzaWduKHt9LCBvcHRzLCB7IHNraXA6IHRydWUgfSkpO1xuICAgIH07XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShBc3NlcnRQcm90b3R5cGUsIHsgY29sbGVjdDogeyB2YWx1ZTogYWN0dWFsQ29sbGVjdCB9IH0pLCB7XG4gICAgICAgIHRlc3QoZGVzY3JpcHRpb24sIHNwZWMsIG9wdHMgPSB7fSkge1xuICAgICAgICAgICAgaWYgKHJ1bk9ubHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2tpcChkZXNjcmlwdGlvbiwgc3BlYywgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGVzdChkZXNjcmlwdGlvbiwgc3BlYywgb3B0cyk7XG4gICAgICAgIH0sXG4gICAgICAgIHNraXAoZGVzY3JpcHRpb24sIHNwZWMgPSBub29wLCBvcHRzID0ge30pIHtcbiAgICAgICAgICAgIHJldHVybiBza2lwKGRlc2NyaXB0aW9uLCBzcGVjLCBvcHRzKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25seShkZXNjcmlwdGlvbiwgc3BlYywgb3B0cyA9IHt9KSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjRm4gPSBydW5Pbmx5ID09PSBmYWxzZSA/IF8gPT4ge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCB1c2UgXCJvbmx5XCIgbWV0aG9kIHdoZW4gbm90IGluIHJ1biBvbmx5IG1vZGVgKTtcbiAgICAgICAgICAgIH0gOiBzcGVjO1xuICAgICAgICAgICAgcmV0dXJuIHRlc3QoZGVzY3JpcHRpb24sIHNwZWNGbiwgb3B0cyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbmNvbnN0IG1hcCA9IChmbikgPT4gYXN5bmMgZnVuY3Rpb24qIChzdHJlYW0pIHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IG0gb2Ygc3RyZWFtKSB7XG4gICAgICAgIHlpZWxkIGZuKG0pO1xuICAgIH1cbn07XG4vLyAhIGl0IG11dGF0ZXMgdGhlIHVuZGVybHlpbmcgc3RydWN0dXJlIHlldCBpdCBpcyBtb3JlIGVmZmljaWVudCByZWdhcmRpbmcgcGVyZm9ybWFuY2VzXG5jb25zdCBmbGF0dGVuID0gbWFwKChtKSA9PiB7XG4gICAgbS5vZmZzZXQgPSAwO1xuICAgIHJldHVybiBtO1xufSk7XG5jb25zdCBpc0Fzc2VydGlvblJlc3VsdCQxID0gKHJlc3VsdCkgPT4ge1xuICAgIHJldHVybiAnb3BlcmF0b3InIGluIHJlc3VsdDtcbn07XG5jb25zdCBzdHJpbmdpZnlTeW1ib2wgPSAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzeW1ib2wnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG4vLyBAdHMtaWdub3JlXG5jb25zdCBmbGF0RGlhZ25vc3RpYyA9ICh7IHBhc3MsIGRlc2NyaXB0aW9uLCAuLi5yZXN0IH0pID0+IHJlc3Q7XG5jb25zdCBUYXAgPSB7XG4gICAgcHJpbnQobWVzc2FnZSwgb2Zmc2V0ID0gMCkge1xuICAgICAgICB0aGlzLmxvZyhtZXNzYWdlLnBhZFN0YXJ0KG1lc3NhZ2UubGVuZ3RoICsgKG9mZnNldCAqIDQpKSk7IC8vIDQgd2hpdGUgc3BhY2UgdXNlZCBhcyBpbmRlbnQgKHNlZSB0YXAtcGFyc2VyKVxuICAgIH0sXG4gICAgcHJpbnRZQU1MKG9iaiwgb2Zmc2V0ID0gMCkge1xuICAgICAgICBjb25zdCBZQU1MT2Zmc2V0ID0gb2Zmc2V0ICsgMC41O1xuICAgICAgICB0aGlzLnByaW50KCctLS0nLCBZQU1MT2Zmc2V0KTtcbiAgICAgICAgZm9yIChjb25zdCBbcHJvcCwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9iaikpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbnQoYCR7cHJvcH06ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUsIHN0cmluZ2lmeVN5bWJvbCl9YCwgWUFNTE9mZnNldCArIDAuNSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmludCgnLi4uJywgWUFNTE9mZnNldCk7XG4gICAgfSxcbiAgICBwcmludENvbW1lbnQoY29tbWVudCwgb2Zmc2V0ID0gMCkge1xuICAgICAgICB0aGlzLnByaW50KGAjICR7Y29tbWVudH1gLCBvZmZzZXQpO1xuICAgIH0sXG4gICAgcHJpbnRCYWlsT3V0KG1lc3NhZ2UpIHtcbiAgICAgICAgdGhpcy5wcmludCgnQmFpbCBvdXQhIFVuaGFuZGxlZCBlcnJvci4nKTtcbiAgICB9LFxuICAgIHByaW50VGVzdFN0YXJ0KG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgeyBkYXRhOiB7IGRlc2NyaXB0aW9uIH0sIG9mZnNldCB9ID0gbWVzc2FnZTtcbiAgICAgICAgdGhpcy5wcmludENvbW1lbnQoZGVzY3JpcHRpb24sIG9mZnNldCk7XG4gICAgfSxcbiAgICBwcmludFRlc3RFbmQobWVzc2FnZSkge1xuICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgfSxcbiAgICBwcmludEFzc2VydGlvbihtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YSwgb2Zmc2V0IH0gPSBtZXNzYWdlO1xuICAgICAgICBjb25zdCB7IHBhc3MsIGRlc2NyaXB0aW9uIH0gPSBkYXRhO1xuICAgICAgICBjb25zdCBsYWJlbCA9IHBhc3MgPT09IHRydWUgPyAnb2snIDogJ25vdCBvayc7XG4gICAgICAgIGlmIChpc0Fzc2VydGlvblJlc3VsdCQxKGRhdGEpKSB7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMubmV4dElkKCk7XG4gICAgICAgICAgICB0aGlzLnByaW50KGAke2xhYmVsfSAke2lkfSAtICR7ZGVzY3JpcHRpb259YCwgb2Zmc2V0KTtcbiAgICAgICAgICAgIGlmIChwYXNzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRZQU1MKGZsYXREaWFnbm9zdGljKGRhdGEpLCBvZmZzZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRhdGEuc2tpcCkge1xuICAgICAgICAgICAgY29uc3QgaWQgPSB0aGlzLm5leHRJZCgpO1xuICAgICAgICAgICAgdGhpcy5wcmludChgJHtwYXNzID8gJ29rJyA6ICdub3Qgb2snfSAke2lkfSAtICR7ZGVzY3JpcHRpb259ICMgU0tJUGAsIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHByaW50U3VtbWFyeShlbmRNZXNzYWdlKSB7XG4gICAgICAgIHRoaXMucHJpbnQoJycsIDApO1xuICAgICAgICB0aGlzLnByaW50Q29tbWVudChlbmRNZXNzYWdlLmRhdGEucGFzcyA/ICdvaycgOiAnbm90IG9rJywgMCk7XG4gICAgICAgIHRoaXMucHJpbnRDb21tZW50KGBzdWNjZXNzOiAke2VuZE1lc3NhZ2UuZGF0YS5zdWNjZXNzQ291bnR9YCwgMCk7XG4gICAgICAgIHRoaXMucHJpbnRDb21tZW50KGBza2lwcGVkOiAke2VuZE1lc3NhZ2UuZGF0YS5za2lwQ291bnR9YCwgMCk7XG4gICAgICAgIHRoaXMucHJpbnRDb21tZW50KGBmYWlsdXJlOiAke2VuZE1lc3NhZ2UuZGF0YS5mYWlsdXJlQ291bnR9YCwgMCk7XG4gICAgfSxcbiAgICBhc3luYyByZXBvcnQoc3RyZWFtKSB7XG4gICAgICAgIGNvbnN0IHNyYyA9IGZsYXR0ZW4oc3RyZWFtKTtcbiAgICAgICAgbGV0IGxhc3RNZXNzYWdlID0gbnVsbDtcbiAgICAgICAgdGhpcy5wcmludCgnVEFQIHZlcnNpb24gMTMnKTtcbiAgICAgICAgZm9yIGF3YWl0IChjb25zdCBtZXNzYWdlIG9mIHNyYykge1xuICAgICAgICAgICAgbGFzdE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiVEVTVF9TVEFSVFwiIC8qIFRFU1RfU1RBUlQgKi86XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRUZXN0U3RhcnQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJBU1NFUlRJT05cIiAvKiBBU1NFUlRJT04gKi86XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRBc3NlcnRpb24obWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJCQUlMX09VVFwiIC8qIEJBSUxfT1VUICovOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50QmFpbE91dChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbWVzc2FnZS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJpbnQoYDEuLiR7bGFzdE1lc3NhZ2UuZGF0YS5jb3VudH1gLCAwKTtcbiAgICAgICAgdGhpcy5wcmludFN1bW1hcnkobGFzdE1lc3NhZ2UpO1xuICAgIH1cbn07XG5jb25zdCBmYWN0b3J5ID0gKGxvZykgPT4ge1xuICAgIGxldCBpID0gMDtcbiAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShUYXAsIHtcbiAgICAgICAgbmV4dElkOiB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKytpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBsb2c6IHsgdmFsdWU6IGxvZyB9XG4gICAgfSk7XG59O1xuXG5jb25zdCBpbmRlbnRlZERpYWdub3N0aWMgPSAoeyBleHBlY3RlZCwgcGFzcywgZGVzY3JpcHRpb24sIGFjdHVhbCwgb3BlcmF0b3IsIGF0ID0gJ04vQScsIC4uLnJlc3QgfSkgPT4gKHtcbiAgICB3YW50ZWQ6IGV4cGVjdGVkLFxuICAgIGZvdW5kOiBhY3R1YWwsXG4gICAgYXQsXG4gICAgb3BlcmF0b3IsXG4gICAgLi4ucmVzdFxufSk7XG5jb25zdCBpZCA9IGZ1bmN0aW9uKiAoKSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHlpZWxkICsraTtcbiAgICB9XG59O1xuY29uc3QgaWRHZW4gPSAoKSA9PiB7XG4gICAgbGV0IHN0YWNrID0gW2lkKCldO1xuICAgIHJldHVybiB7XG4gICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG4gICAgICAgIG5leHQoKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhY2tbMF0ubmV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JrKCkge1xuICAgICAgICAgICAgc3RhY2sudW5zaGlmdChpZCgpKTtcbiAgICAgICAgfSxcbiAgICAgICAgbWVyZ2UoKSB7XG4gICAgICAgICAgICBzdGFjay5zaGlmdCgpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5jb25zdCBJbmRlbnRlZFRhcCA9IE9iamVjdC5hc3NpZ24oe30sIFRhcCwge1xuICAgIHByaW50VGVzdFN0YXJ0KG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgeyBkYXRhOiB7IGRlc2NyaXB0aW9uIH0sIG9mZnNldCB9ID0gbWVzc2FnZTtcbiAgICAgICAgdGhpcy5wcmludENvbW1lbnQoYFN1YnRlc3Q6ICR7ZGVzY3JpcHRpb259YCwgb2Zmc2V0KTtcbiAgICB9LFxuICAgIHByaW50QXNzZXJ0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgeyBkYXRhLCBvZmZzZXQgfSA9IG1lc3NhZ2U7XG4gICAgICAgIGNvbnN0IHsgcGFzcywgZGVzY3JpcHRpb24gfSA9IGRhdGE7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gcGFzcyA9PT0gdHJ1ZSA/ICdvaycgOiAnbm90IG9rJztcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLm5leHRJZCgpO1xuICAgICAgICBpZiAoaXNBc3NlcnRpb25SZXN1bHQkMShkYXRhKSkge1xuICAgICAgICAgICAgdGhpcy5wcmludChgJHtsYWJlbH0gJHtpZH0gLSAke2Rlc2NyaXB0aW9ufWAsIG9mZnNldCk7XG4gICAgICAgICAgICBpZiAocGFzcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW50WUFNTChpbmRlbnRlZERpYWdub3N0aWMoZGF0YSksIG9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gZGF0YS5za2lwID09PSB0cnVlID8gJ1NLSVAnIDogYCR7ZGF0YS5leGVjdXRpb25UaW1lfW1zYDtcbiAgICAgICAgICAgIHRoaXMucHJpbnQoYCR7cGFzcyA/ICdvaycgOiAnbm90IG9rJ30gJHtpZH0gLSAke2Rlc2NyaXB0aW9ufSAjICR7Y29tbWVudH1gLCBtZXNzYWdlLm9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHByaW50VGVzdEVuZChtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IG1lc3NhZ2UuZGF0YS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHsgb2Zmc2V0IH0gPSBtZXNzYWdlO1xuICAgICAgICB0aGlzLnByaW50KGAxLi4ke2xlbmd0aH1gLCBvZmZzZXQpO1xuICAgIH1cbn0pO1xuY29uc3QgZmFjdG9yeSQxID0gKGxvZykgPT4ge1xuICAgIGNvbnN0IGlkID0gaWRHZW4oKTtcbiAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShJbmRlbnRlZFRhcCwge1xuICAgICAgICBuZXh0SWQ6IHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBpZC5uZXh0KCkudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlcG9ydDoge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlOiBhc3luYyBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmludCgnVEFQIHZlcnNpb24gMTMnKTtcbiAgICAgICAgICAgICAgICBsZXQgbGFzdE1lc3NhZ2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgbWVzc2FnZSBvZiBzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGFzdE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlRFU1RfU1RBUlRcIiAvKiBURVNUX1NUQVJUICovOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkLmZvcmsoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50VGVzdFN0YXJ0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkFTU0VSVElPTlwiIC8qIEFTU0VSVElPTiAqLzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50QXNzZXJ0aW9uKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlRFU1RfRU5EXCIgLyogVEVTVF9FTkQgKi86XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQubWVyZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50VGVzdEVuZChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJCQUlMX09VVFwiIC8qIEJBSUxfT1VUICovOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRCYWlsT3V0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnByaW50U3VtbWFyeShsYXN0TWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGxvZzogeyB2YWx1ZTogbG9nIH1cbiAgICB9KTtcbn07XG5cbmNvbnN0IHJlcG9ydCA9IChmYWN0b3J5KSA9PiAobG9nZ2VyID0gY29uc29sZSkgPT4ge1xuICAgIGNvbnN0IGxvZyA9IGxvZ2dlci5sb2cuYmluZChsb2dnZXIpO1xuICAgIHJldHVybiBhc3luYyAoc3RyZWFtKSA9PiBmYWN0b3J5KGxvZykucmVwb3J0KHN0cmVhbSk7XG59O1xuY29uc3QgdGFwUmVwb3J0ZXIgPSByZXBvcnQoZmFjdG9yeSk7XG5jb25zdCBpbmRlbnRlZFRhcFJlcG9ydGVyID0gcmVwb3J0KGZhY3RvcnkkMSk7XG5cbi8vQHRzLWlnbm9yZVxuY29uc3QgbW9jaGFUYXBMaWtlID0gaW5kZW50ZWRUYXBSZXBvcnRlcigpO1xuLy9AdHMtaWdub3JlXG5jb25zdCB0YXBlVGFwTGlrZSA9IHRhcFJlcG9ydGVyKCk7XG5cbmNvbnN0IGhhcm5lc3NGYWN0b3J5ID0gKHsgcnVuT25seSA9IGZhbHNlLCBpbmRlbnQgPSBmYWxzZSB9ID0ge1xuICAgIHJ1bk9ubHk6IGZhbHNlLFxuICAgIGluZGVudDogZmFsc2Vcbn0pID0+IHtcbiAgICBjb25zdCB0ZXN0cyA9IFtdO1xuICAgIGNvbnN0IHJvb3RPZmZzZXQgPSAwO1xuICAgIGNvbnN0IGNvbGxlY3QgPSBpdGVtID0+IHRlc3RzLnB1c2goaXRlbSk7XG4gICAgY29uc3QgYXBpID0gYXNzZXJ0KGNvbGxlY3QsIHJvb3RPZmZzZXQsIHJ1bk9ubHkpO1xuICAgIGxldCBlcnJvciA9IG51bGw7XG4gICAgY29uc3QgZmFjdG9yeSA9IHRlc3Rlckxpa2VQcm92aWRlcihPYmplY3QuYXNzaWduKGFwaSwgVGVzdGVyUHJvdG90eXBlLCB7XG4gICAgICAgIHJlcG9ydDogYXN5bmMgZnVuY3Rpb24gKHJlcG9ydGVyKSB7XG4gICAgICAgICAgICBjb25zdCByZXAgPSByZXBvcnRlciB8fCAoaW5kZW50ID8gbW9jaGFUYXBMaWtlIDogdGFwZVRhcExpa2UpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZmFjdG9yeSh0ZXN0cywgUHJvbWlzZS5yZXNvbHZlKCksIHJvb3RPZmZzZXQpLCB7XG4gICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldCh2YWwpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9IHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuY29uc3QgZmluZENvbmZpZ3VyYXRpb25GbGFnID0gKG5hbWUpID0+IHtcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBwcm9jZXNzLmVudltuYW1lXSA9PT0gJ3RydWUnO1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4od2luZG93W25hbWVdKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcbmNvbnN0IGRlZmF1bHRUZXN0SGFybmVzcyA9IGhhcm5lc3NGYWN0b3J5KHtcbiAgICBydW5Pbmx5OiBmaW5kQ29uZmlndXJhdGlvbkZsYWcoJ1JVTl9PTkxZJylcbn0pO1xubGV0IGF1dG9TdGFydCA9IHRydWU7XG5sZXQgaW5kZW50ID0gZmluZENvbmZpZ3VyYXRpb25GbGFnKCdJTkRFTlQnKTtcbmNvbnN0IHJvb3RUZXN0ID0gZGVmYXVsdFRlc3RIYXJuZXNzLnRlc3QuYmluZChkZWZhdWx0VGVzdEhhcm5lc3MpO1xucm9vdFRlc3QuaW5kZW50ID0gKCkgPT4ge1xuICAgIGNvbnNvbGUud2FybignaW5kZW50IGZ1bmN0aW9uIGlzIGRlcHJlY2F0ZWQsIHVzZSBcIklOREVOVFwiIGNvbmZpZ3VyYXRpb24gZmxhZyBpbnN0ZWFkJyk7XG4gICAgaW5kZW50ID0gdHJ1ZTtcbn07XG5jb25zdCB0ZXN0ID0gcm9vdFRlc3Q7XG5jb25zdCBza2lwID0gZGVmYXVsdFRlc3RIYXJuZXNzLnNraXAuYmluZChkZWZhdWx0VGVzdEhhcm5lc3MpO1xuY29uc3Qgb25seSA9IGRlZmF1bHRUZXN0SGFybmVzcy5vbmx5LmJpbmQoZGVmYXVsdFRlc3RIYXJuZXNzKTtcbnJvb3RUZXN0LnNraXAgPSBza2lwO1xuY29uc3QgZXF1YWwgPSBkZWZhdWx0VGVzdEhhcm5lc3MuZXF1YWwuYmluZChkZWZhdWx0VGVzdEhhcm5lc3MpO1xuY29uc3QgZXF1YWxzID0gZXF1YWw7XG5jb25zdCBlcSA9IGVxdWFsO1xuY29uc3QgZGVlcEVxdWFsID0gZXF1YWw7XG5jb25zdCBub3RFcXVhbCA9IGRlZmF1bHRUZXN0SGFybmVzcy5ub3RFcXVhbC5iaW5kKGRlZmF1bHRUZXN0SGFybmVzcyk7XG5jb25zdCBub3RFcXVhbHMgPSBub3RFcXVhbDtcbmNvbnN0IG5vdEVxID0gbm90RXF1YWw7XG5jb25zdCBub3REZWVwRXF1YWwgPSBub3RFcXVhbDtcbmNvbnN0IGlzID0gZGVmYXVsdFRlc3RIYXJuZXNzLmlzLmJpbmQoZGVmYXVsdFRlc3RIYXJuZXNzKTtcbmNvbnN0IHNhbWUgPSBpcztcbmNvbnN0IGlzTm90ID0gZGVmYXVsdFRlc3RIYXJuZXNzLmlzTm90LmJpbmQoZGVmYXVsdFRlc3RIYXJuZXNzKTtcbmNvbnN0IG5vdFNhbWUgPSBpc05vdDtcbmNvbnN0IG9rID0gZGVmYXVsdFRlc3RIYXJuZXNzLm9rLmJpbmQoZGVmYXVsdFRlc3RIYXJuZXNzKTtcbmNvbnN0IHRydXRoeSA9IG9rO1xuY29uc3Qgbm90T2sgPSBkZWZhdWx0VGVzdEhhcm5lc3Mubm90T2suYmluZChkZWZhdWx0VGVzdEhhcm5lc3MpO1xuY29uc3QgZmFsc3kgPSBub3RPaztcbmNvbnN0IGZhaWwgPSBkZWZhdWx0VGVzdEhhcm5lc3MuZmFpbC5iaW5kKGRlZmF1bHRUZXN0SGFybmVzcyk7XG5jb25zdCB0aHJvd3MgPSBkZWZhdWx0VGVzdEhhcm5lc3MudGhyb3dzLmJpbmQoZGVmYXVsdFRlc3RIYXJuZXNzKTtcbmNvbnN0IGRvZXNOb3RUaHJvdyA9IGRlZmF1bHRUZXN0SGFybmVzcy5kb2VzTm90VGhyb3cuYmluZChkZWZhdWx0VGVzdEhhcm5lc3MpO1xuY29uc3QgY3JlYXRlSGFybmVzcyA9IChvcHRzID0ge30pID0+IHtcbiAgICBhdXRvU3RhcnQgPSBmYWxzZTtcbiAgICByZXR1cm4gaGFybmVzc0ZhY3Rvcnkob3B0cyk7XG59O1xuY29uc3Qgc3RhcnQgPSAoKSA9PiB7XG4gICAgaWYgKGF1dG9TdGFydCkge1xuICAgICAgICBkZWZhdWx0VGVzdEhhcm5lc3MucmVwb3J0KGluZGVudCA/IG1vY2hhVGFwTGlrZSA6IHRhcGVUYXBMaWtlKTtcbiAgICB9XG59O1xuLy8gb24gbmV4dCB0aWNrIHN0YXJ0IHJlcG9ydGluZ1xuLy8gQHRzLWlnbm9yZVxuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgc2V0VGltZW91dChzdGFydCwgMCk7XG59XG5lbHNlIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBzdGFydCk7XG59XG5cbmV4cG9ydCB7IEFzc2VydFByb3RvdHlwZSwgY3JlYXRlSGFybmVzcywgZGVlcEVxdWFsLCBkb2VzTm90VGhyb3csIGVxLCBlcXVhbCwgZXF1YWxzLCBmYWlsLCBmYWxzeSwgaXMsIGlzTm90LCBtb2NoYVRhcExpa2UsIG5vdERlZXBFcXVhbCwgbm90RXEsIG5vdEVxdWFsLCBub3RFcXVhbHMsIG5vdE9rLCBub3RTYW1lLCBvaywgb25seSwgc2FtZSwgc2tpcCwgdGFwZVRhcExpa2UsIHRlc3QsIHRocm93cywgdHJ1dGh5IH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QUNyQixNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDaEUsQUFHQSxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdEUsQUFHQSxNQUFNLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDMUQsQUFDQSxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDaEUsQUFDQSxNQUFNLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDMUQsQUFDQSxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDaEUsQUFDQSxNQUFNLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDOUQsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ2xFLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM5RSxBQUlBLE1BQU0sS0FBSyxHQUFHLE1BQU07SUFDaEIsSUFBSSxTQUFTLEVBQUU7UUFDWCxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLFlBQVksR0FBRyxXQUFXLENBQUMsQ0FBQztLQUNsRTtDQUNKLENBQUM7OztBQUdGLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFO0lBQy9CLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDeEI7S0FDSTs7SUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0NBQzFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsifQ==
