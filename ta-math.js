"use strict";

function TA(ohlcv) {

  /* GETTERS */

  let _ohlcv = [[],[],[],[],[],[]];

  let $ = {
    get time()    { return getAndSave(0) },
    get open()    { return getAndSave(1) },
    get high()    { return getAndSave(2) },
    get low()     { return getAndSave(3) },
    get close()   { return getAndSave(4) },
    get volume()  { return getAndSave(5) },
  }

  let getAndSave = function(i) {
    if(_ohlcv[i].length == 0) {
      ohlcv.forEach((item) => {
        _ohlcv[i].push(item[i]);
      });
    }
    return _ohlcv[i];
  }


  /* HELPER FUNCTIONS */

  let mean = function(array) {
    return array.reduce((sum, item) => {
        return sum + item;
    }, 0) / array.length;
  }
  
  let firstNotNaN = function(array) {
    let i = 0;
    while(isNaN(array[i]) && i++ < array.length) { };
    return i;
  }
  
  let glue = function(...arg) {
    let result = [];
    arg[0].forEach((_, i) => {
      let tuple = [];
      arg.forEach((_, j) => {
        tuple.push(arg[j][i]);
      });
      result.push(tuple);
    });
    return result;
  }

  let pointwise = function(f, g, operation) {
    let result = [];
    f.forEach((_, i) => {
      result.push(operation(f[i], g[i]));
    });
    return result;
  }


  /* TECHNICAL ANALYSIS */

  let sma = function($close, window) {
    let result = [];
    let first = firstNotNaN($close);
    $close.forEach((_, i) => {
      if (i + 1 < window + first) {
        result.push(NaN);
      } else {
        result.push(mean($close.slice(i + 1 - window, i + 1)));
      } 
    });
    return result;
  }

  let ema = function($close, window) {
    let result = [];
    let first = firstNotNaN($close);
    let mult = 2 / (window + 1);
    $close.forEach((item, i) => {
      if (i + 1 < window + first) {
        result.push(NaN);
      } else if (i + 1 == window + first) {
        result.push(mean($close.slice(i + 1 - window, i + 1)));
      } else {
        result.push((item - result[i - 1]) * mult + result[i - 1]);
      }
    });
    return result;
  }

  let macd = function($close, short, long, signal) {
    let macd_line = pointwise(ema($close, short), ema($close, long), (a, b) => a - b);
    let macd_signal = ema(macd_line, signal);
    let macd_hist = pointwise(macd_line, macd_signal, (a, b) => a - b);
    return glue(macd_line, macd_signal, macd_hist);
  }

  let zigzag = function($high, $low, percent) {
    return 0;
  }


  /* DEFINITION */

  return {
    sma:    (window = 10)                         =>  sma($.close, window),
    ema:    (window = 10)                         =>  ema($.close, window),
    macd:   (short = 12, long = 26, signal = 9)   =>  macd($.close, short, long, signal),
    zigzag: (percent = 10)                        =>  zigzig($.high, $.low, percent)
  }
}