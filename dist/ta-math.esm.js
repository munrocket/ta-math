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
    let apv = rolling((s) => s.reduce((sum, x) => sum + x, 0), pv, window);
    let anv = rolling((s) => s.reduce((sum, x) => sum + x, 0), nv, window);
    let atr = rolling((s) => s.reduce((sum, x) => sum + x, 0), trueRange($high, $low, $close), window);
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

export default TA;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGEtbWF0aC5lc20uanMiLCJzb3VyY2VzIjpbXSwic291cmNlc0NvbnRlbnQiOltdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyJ9
