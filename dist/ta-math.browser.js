(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

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

function main (ohlcv) {

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
    rmsd: (f,g) => rmsd(f, g),
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

module.exports = main;

},{}]},{},[1]);
