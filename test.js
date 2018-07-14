'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tape = _interopDefault(require('tape'));

function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) { sum += array[i]; }
  return sum / array.length;
}

function sd(array) {
  let correction = (array.length > 1) ? math.sqrt(array.length / (array.length - 1)) : 1;
  return correction * rmsd(array, fillarray(array.length, mean(array)));
}

function rmsd(f, g) {
  let sqrDiff = pointwise(f, g, (a, b) => (a - b) * (a - b));
  return Math.sqrt(mean(sqrDiff));
}

function fillarray(length, value) {
  let result = [];
  for (let i = 0; i < length; i++) {
    result.push(value);
  }
  return result;
}

function pointwise(f, g, operation) {
  let result = [];
  for (let i = 0; i < f.length; i++) {
    result.push(operation(f[i], g[i]));
  }
  return result;
}

function rolling(array, window, operation) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}

function sma($close, window) {
  return rolling($close, window, x => mean(x));
}

function std($close, window) {
  return rolling($close, window, x => sd(x));
}

function ema($close, window, weight) {
  let result = [$close[0]];
  weight = weight ? weight : 2 / (window + 1);
  for (let i = 1; i < $close.length; i++) {
    result.push(($close[i] - result[i - 1]) * weight + result[i - 1]);
  }  return result;
}

function bband($close, window, mult) {
  let middle = sma($close, window);
  let upper = pointwise(middle, std($close, window), (a, b) => a + b * mult);
  let lower = pointwise(middle, std($close, window), (a, b) => a - b * mult);
  return [upper, middle, lower];
}

function vbp($close, $volume, nzones, left, right) {
  let result = fillarray(nzones, 0);
  let bottom = Infinity, top = -Infinity, total = 0;
  for (let i = left; i < (right ? right : $close.length); i++) {
    total += $volume[i];
    top = (top < $close[i]) ? $close[i] : top;
    bottom = (bottom > $close[i]) ? $close[i] : bottom;
  }
  for (let i = left; i < (right ? right : $close.length); i++) {
    let z = Math.floor(($close[i] - bottom + 1e-14) / (top - bottom + 1e-12) * nzones);
    result[z] += $volume[i];
  }
  return { bottom: bottom, top: top, volumes: result.map((x) => { return x / total })};
}

function zigzag($time, $high, $low, percent) {
  let low = $low[0];    let high = $high[0];
  let isUp = true;      let time = [],        zigzag = [];
  for (let i = 1; i < $time.length; i++) {
    if (isUp) {
      high = ($high[i] > high) ? $high[i] : high;
      if ($low[i] < low + (high - low) * (100 - percent) / 100) {
        isUp = false;   time.push($time[0]);  zigzag.push($low[0]);
      }
    } else {
      low = ($low[i] < low) ? $low[i] : low;
      if ($high[i] > low + (high - low) * percent / 100) {
        isUp = true;    time.push($time[0]);  zigzag.push($low[0]);
      }
    }
  }
  return [time.pop(), zigzag.pop()];
}

function macd($close, wshort, wlong, wsig) {
  let macd_line = pointwise(ema($close, wshort), ema($close, wlong), (a, b) => a - b);
  let macd_signal = ema(macd_line, wsig);
  let macd_hist = pointwise(macd_line, macd_signal, (a, b) => a - b);
  return [macd_line, macd_signal, macd_hist];
}

function rsi($close, window) {
  let gains = [1e-14], loss = [0];
  for (let i = 1; i < $close.length; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise(sma(gains), sma(loss), (a, b) => 100 - 100 / (1 + a / b));
}

function TA(ohlcv) {

  let _ohlcv = [[],[],[],[],[],[]];

  let $ = {
    get time()    { return getAndSave(0) },
    get open()    { return getAndSave(1) },
    get high()    { return getAndSave(2) },
    get low()     { return getAndSave(3) },
    get close()   { return getAndSave(4) },
    get volume()  { return getAndSave(5) },
  };

  let getAndSave = function(i) {
    if (_ohlcv[i].length == 0) {
      for (let j = 0; j < ohlcv.length; j++) {
        _ohlcv[i].push(ohlcv[j][i]);
      }
    }
    return _ohlcv[i];
  };  

  return {
    $:$,
    sma:    (window = 15)                           =>  sma($.close, window),
    ema:    (window = 10)                           =>  ema($.close, window),
    std:    (window = 15)                           =>  std($.close, window),
    bband:  (window = 15, mult = 2)                 =>  bband($.close, window, mult),
    macd:   (wshort = 12, wlong = 26, wsig = 9)     =>  macd($.close, wshort, wlong, wsig),
    rsi:    (window = 14)                           =>  rsi($.close, window),
    vbp:    (zones = 12, left = 0, right = null)    =>  vbp($.close, $.volume, zones, left, right),
    zigzag: (percent = 15)                          =>  zigzag($.time, $.high, $.low, percent),
  }
}

const ohlcv = [[1527465600000,7338.99,7376.13,7333.88,7350,674.790009],
  [1527469200000,7350,7389.05,7301,7371.64,1059.501967],
  [1527472800000,7371,7372.84,7345.01,7366.1,610.967862],
  [1527476400000,7367.89,7437,7361.45,7374.98,1083.541187],
  [1527480000000,7374.99,7386.06,7287,7312.28,1763.293343],
  [1527483600000,7315,7352,7159.1,7185.58,3199.59748],
  [1527487200000,7189.58,7220.13,7165,7207.41,1703.366111],
  [1527490800000,7210.26,7248.65,7200,7215,1100.453159],
  [1527494400000,7220.45,7232.67,7189.99,7225.66,966.4607],
  [1527498000000,7222.27,7235.8,7200.04,7204.99,915.54118],
  [1527501600000,7204.95,7231.99,7198.67,7212.99,709.902109],
  [1527505200000,7213,7215.05,7178.18,7191.65,757.160088],
  [1527508800000,7196.74,7300,7148.16,7278.89,2115.416687],
  [1527512400000,7273,7280,7242,7259,738.289749],
  [1527516000000,7259,7275.88,7232.49,7249.8,913.486226],
  [1527519600000,7240.34,7263.11,7199,7220.12,808.264288],
  [1527523200000,7223.98,7243.39,7182.46,7194.01,1048.820742],
  [1527526800000,7195,7232.33,7175.23,7228.11,705.857516],
  [1527530400000,7228,7240,7195,7195.22,555.683562],
  [1527534000000,7195.22,7246.45,7188,7214.99,688.141612],
  [1527537600000,7215,7242.99,7192.62,7205.6,543.173421],
  [1527541200000,7205.32,7205.6,7120.16,7148,1401.118321],
  [1527544800000,7148,7150,7058.02,7131,2073.920058],
  [1527548400000,7131.99,7135,7084.3,7099,1082.691586],
  [1527552000000,7099,7132.1,7094.05,7116.4,952.303604]];

tape('EMA calcuation', function(t) {
  let actual = TA.TA(ohlcv).ema(15);
  let expected = [1,2,3,4];
  t.equal(RMSE(actual, expected) < 0.3, true, 'Result line should be closer to expected line');
  t.end();
});
