(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global['ta-math'] = factory());
}(this, (function () { 'use strict';

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  /* basic functions */

  function mean(array) {
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
      sum += array[i];
    }
    return sum / array.length;
  }

  function sd(array) {
    return rmse(array, new Array(array.length).fill(mean(array)));
  }

  function mad(array) {
    return mae(array, new Array(array.length).fill(mean(array)));
  }

  function mae(f, g) {
    var absDiff = pointwise(function (a, b) {
      return Math.abs(a - b);
    }, f, g);
    return f.length != g.length ? Infinity : mean(absDiff);
  }

  function rmse(f, g) {
    var sqrDiff = pointwise(function (a, b) {
      return (a - b) * (a - b);
    }, f, g);
    return f.length != g.length ? Infinity : Math.sqrt(mean(sqrDiff));
  }

  /* functional programming */

  function pointwise(operation) {
    for (var _len = arguments.length, arrays = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      arrays[_key - 1] = arguments[_key];
    }

    var result = [];
    for (var i = 0; i < arrays[0].length; i++) {
      var iarray = function iarray(i) {
        return arrays.map(function (x) {
          return x[i];
        });
      };
      result[i] = operation.apply(undefined, toConsumableArray(iarray(i)));
    }
    return result;
  }

  function rolling(operation, window, array) {
    var result = [];
    for (var i = 0; i < array.length; i++) {
      var j = i + 1 - window;
      result.push(operation(array.slice(j > 0 ? j : 0, i + 1)));
    }
    return result;
  }

  /* basic indicators & overlays */

  function stdev($close, window) {
    return rolling(function (x) {
      return sd(x);
    }, window, $close);
  }

  function expdev($close, window) {
    var weight = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    var sqrDiff = pointwise(function (a, b) {
      return (a - b) * (a - b);
    }, $close, ema($close, window));
    return pointwise(function (x) {
      return Math.sqrt(x);
    }, ema(sqrDiff, window, weight));
  }

  function sma($close, window) {
    return rolling(function (x) {
      return mean(x);
    }, window, $close);
  }

  function ema($close, window) {
    var weight = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var start = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    weight = weight ? weight : 2 / (window + 1);
    var ema = [start ? start : mean($close.slice(0, window))];
    for (var i = 1; i < $close.length; i++) {
      ema.push($close[i] * weight + ema[i - 1] * (1 - weight));
    }  return ema;
  }

  function madev($close, window) {
    return rolling(function (x) {
      return mad(x);
    }, window, $close);
  }

  function atr($high, $low, $close, window) {
    var tr = trueRange($high, $low, $close);
    return ema(tr, window, 1 / window);
  }

  function trueRange($high, $low, $close) {
    var tr = [$high[0] - $low[0]];
    for (var i = 1; i < $low.length; i++) {
      tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
    }
    return tr;
  }

  function typicalPrice($high, $low, $close) {
    var tp = [];
    for (var i = 0; i < $low.length; i++) {
      tp.push(($high[i] + $low[i] + $close[i]) / 3);
    }
    return tp;
  }

  /* indicators */

  function macd($close, wshort, wlong, wsig) {
    var line = pointwise(function (a, b) {
      return a - b;
    }, ema($close, wshort), ema($close, wlong));
    var signal = ema(line, wsig);
    var hist = pointwise(function (a, b) {
      return a - b;
    }, line, signal);
    return { line: line, signal: signal, hist: hist };
  }

  function rsi($close, window) {
    var gains = [0],
        loss = [1e-14];
    for (var i = 1; i < $close.length; i++) {
      var diff = $close[i] - $close[i - 1];
      gains.push(diff >= 0 ? diff : 0);
      loss.push(diff < 0 ? -diff : 0);
    }
    return pointwise(function (a, b) {
      return 100 - 100 / (1 + a / b);
    }, ema(gains, window, 1 / window), ema(loss, window, 1 / window));
  }

  function mfi($high, $low, $close, $volume, window) {
    var pmf = [0],
        nmf = [0];
    var tp = typicalPrice($high, $low, $close);
    for (var i = 1; i < $close.length; i++) {
      var diff = tp[i] - tp[i - 1];
      pmf.push(diff >= 0 ? tp[i] * $volume[i] : 0);
      nmf.push(diff < 0 ? tp[i] * $volume[i] : 0);
    }
    pmf = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, pmf);
    nmf = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, nmf);
    return pointwise(function (a, b) {
      return 100 - 100 / (1 + a / b);
    }, pmf, nmf);
  }

  function stoch($high, $low, $close, window, signal, smooth) {
    var lowest = rolling(function (x) {
      return Math.min.apply(Math, toConsumableArray(x));
    }, window, $low);
    var highest = rolling(function (x) {
      return Math.max.apply(Math, toConsumableArray(x));
    }, window, $high);
    var K = pointwise(function (h, l, c) {
      return 100 * (c - l) / (h - l);
    }, highest, lowest, $close);
    if (smooth > 1) {
      K = sma(K, smooth);
    }  return { line: K, signal: sma(K, signal) };
  }

  function stochRsi($close, window, signal, smooth) {
    var _rsi = rsi($close, window);
    var extreme = rolling(function (x) {
      return { low: Math.min.apply(Math, toConsumableArray(x)), high: Math.max.apply(Math, toConsumableArray(x)) };
    }, window, _rsi);
    var K = pointwise(function (rsi, e) {
      return (rsi - e.low) / (e.high - e.low);
    }, _rsi, extreme);
    K[0] = 0;if (smooth > 1) {
      K = sma(K, smooth);
    }  return { line: K, signal: sma(K, signal) };
  }

  function vi($high, $low, $close, window) {
    var pv = [($high[0] - $low[0]) / 2],
        nv = [pv[0]];
    for (var i = 1; i < $high.length; i++) {
      pv.push(Math.abs($high[i] - $low[i - 1]));
      nv.push(Math.abs($high[i - 1] - $low[i]));
    }
    var apv = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, pv);
    var anv = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, nv);
    var atr$$1 = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, trueRange($high, $low, $close));
    return { plus: pointwise(function (a, b) {
        return a / b;
      }, apv, atr$$1), minus: pointwise(function (a, b) {
        return a / b;
      }, anv, atr$$1) };
  }

  function cci($high, $low, $close, window, mult) {
    var tp = typicalPrice($high, $low, $close);
    var tpsma = sma(tp, window);
    var tpmad = madev(tp, window);
    tpmad[0] = Infinity;
    return pointwise(function (a, b, c) {
      return (a - b) / (c * mult);
    }, tp, tpsma, tpmad);
  }

  function obv($close, $volume, signal) {
    var obv = [0];
    for (var i = 1; i < $close.length; i++) {
      obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
    }
    return { line: obv, signal: sma(obv, signal) };
  }

  function adl($high, $low, $close, $volume) {
    var adl = [$volume[0] * (2 * $close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
    for (var i = 1; i < $high.length; i++) {
      adl[i] = adl[i - 1] + $volume[i] * (2 * $close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
    }
    return adl;
  }

  function roc($close, window) {
    return rolling(function (x) {
      return 100 * (x[x.length - 1] - x[0]) / x[0];
    }, window, $close);
  }

  function williams($high, $low, $close, window) {
    return pointwise(function (x) {
      return x - 100;
    }, stoch($high, $low, $close, window, 1, 1).line);
  }

  /* overlays */

  function bb($close, window, mult) {
    var middle = sma($close, window);
    var upper = pointwise(function (a, b) {
      return a + b * mult;
    }, middle, stdev($close, window));
    var lower = pointwise(function (a, b) {
      return a - b * mult;
    }, middle, stdev($close, window));
    return { lower: lower, middle: middle, upper: upper };
  }

  function ebb($close, window, mult) {
    var middle = ema($close, window);
    var upper = pointwise(function (a, b) {
      return a + b * mult;
    }, middle, expdev($close, window));
    var lower = pointwise(function (a, b) {
      return a - b * mult;
    }, middle, expdev($close, window));
    return { lower: lower, middle: middle, upper: upper };
  }

  function psar($high, $low, stepfactor, maxfactor) {
    var extreme = $low[0],
        factor = 0;
    var isUp = true,
        psar = [extreme];
    for (var i = 1; i < $high.length; i++) {
      var newsar = psar[i - 1] + factor * (extreme - psar[i - 1]);
      if (isUp && newsar < $low[i] || !isUp && newsar > $high[i]) {
        if (isUp && $high[i] > extreme || !isUp && $low[i] < extreme) {
          extreme = isUp ? $high[i] : $low[i];
          factor = factor <= maxfactor ? factor + stepfactor : maxfactor;
        }    } else {
        isUp = !isUp;factor = stepfactor;
        newsar = isUp ? Math.min($low.slice(-3)) : Math.max($high.slice(-3));
        extreme = isUp ? $high[i] : $low[i];
      }
      //console.log("sar=" + newsar + "extreme=" + extreme +" factor=" + factor + "dir=" + isUp);
      psar.push(newsar);
    }
    return psar;
  }

  function vbp($close, $volume, zones, left, right) {
    var vbp = new Array(zones).fill(0);
    var bottom = Infinity,
        top = -Infinity,
        total = 0;
    for (var i = left; i < (right ? right : $close.length); i++) {
      total += $volume[i];
      top = top < $close[i] ? $close[i] : top;
      bottom = bottom > $close[i] ? $close[i] : bottom;
    }
    for (var _i = left; _i < (right ? right : $close.length); _i++) {
      vbp[Math.floor(($close[_i] - bottom + 1e-14) / (top - bottom + 2e-14) * (zones - 1))] += $volume[_i];
    }
    return { bottom: bottom, top: top, volume: vbp.map(function (x) {
        return x / total;
      }) };
  }

  function keltner($high, $low, $close, window, mult) {
    var middle = ema($close, window);
    var upper = pointwise(function (a, b) {
      return a + mult * b;
    }, middle, atr($high, $low, $close, window));
    var lower = pointwise(function (a, b) {
      return a - mult * b;
    }, middle, atr($high, $low, $close, window));
    return { lower: lower, middle: middle, upper: upper };
  }

  function zigzag($time, $high, $low, percent) {
    var lowest = $low[0],
        thattime = $time[0],
        isUp = true;
    var highest = $high[0],
        time = [],
        zigzag = [];
    for (var i = 1; i < $time.length; i++) {
      if (isUp) {
        if ($high[i] > highest) {
          thattime = $time[i];highest = $high[i];
        }      if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
          isUp = false;time.push(thattime);zigzag.push(highest);lowest = $low[i];
        }
      } else {
        if ($low[i] < lowest) {
          thattime = $time[i];lowest = $low[i];
        }      if ($high[i] > lowest + (highest - lowest) * percent / 100) {
          isUp = true;time.push(thattime);zigzag.push(lowest);highest = $high[i];
        }
      }
    }  return { time: time, price: zigzag };
  }

  /* formats */

  var exchangeFormat = function exchangeFormat(x) {
    return {
      length: x.length,
      time: function time(i) {
        return x[i][0];
      },
      open: function open(i) {
        return x[i][1];
      },
      high: function high(i) {
        return x[i][2];
      },
      low: function low(i) {
        return x[i][3];
      },
      close: function close(i) {
        return x[i][4];
      },
      volume: function volume(i) {
        return x[i][5];
      }
    };
  };

  /**
   * Class for calculating technical analysis indicators and overlays
   */

  var TA = function TA(ohlcv) {
    var _this = this;

    var format = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    classCallCheck(this, TA);

    this.format = format == null ? exchangeFormat : format;

    var proxy = function proxy(prop) {
      return new Proxy(_this.format(ohlcv)[prop], {
        get: function get$$1(obj, key) {
          if (key == 'length') {
            return _this.format(ohlcv).length;
          } else if (key == 'slice') {
            return function (start, end) {
              var result = [];
              for (var i = start; i < end; i++) {
                result.push(obj(i));
              }
              return result;
            };
          } else {
            try {
              if (key === parseInt(key).toString()) {
                return obj(key);
              }
            } catch (er) {}
          }
        }
      });
    };

    this.$ = ['time', 'open', 'high', 'low', 'close', 'volume'];
    this.$.forEach(function (prop) {
      return _this.$[prop] = proxy(prop);
    });

    /* technical analysy method defenition */

    return {
      sma: function sma$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return sma(_this.$.close, window);
      },
      ema: function ema$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        return ema(_this.$.close, window);
      },
      bb: function bb$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        return bb(_this.$.close, window, mult);
      },
      ebb: function ebb$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        return ebb(_this.$.close, window, mult);
      },
      psar: function psar$$1() {
        var factor = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.02;
        var maxfactor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.2;
        return psar(_this.$.high, _this.$.low, factor, maxfactor);
      },
      vbp: function vbp$$1() {
        var zones = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 12;
        var left = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var right = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        return vbp(_this.$.close, _this.$.volume, zones, left, right);
      },
      keltner: function keltner$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        return keltner(_this.$.high, _this.$.low, _this.$.close, window, mult);
      },
      zigzag: function zigzag$$1() {
        var percent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return zigzag(_this.$.time, _this.$.high, _this.$.low, percent);
      },

      stdev: function stdev$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return stdev(_this.$.close, window);
      },
      madev: function madev$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return madev(_this.$.close, window);
      },
      expdev: function expdev$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return expdev(_this.$.close, window);
      },
      macd: function macd$$1() {
        var wshort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 12;
        var wlong = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 26;
        var wsig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 9;
        return macd(_this.$.close, wshort, wlong, wsig);
      },
      rsi: function rsi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return rsi(_this.$.close, window);
      },
      mfi: function mfi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return mfi(_this.$.high, _this.$.low, _this.$.close, _this.$.volume, window);
      },
      stoch: function stoch$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        var signal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
        var smooth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
        return stoch(_this.$.high, _this.$.low, _this.$.close, window, signal, smooth);
      },
      stochRsi: function stochRsi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        var signal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
        var smooth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
        return stochRsi(_this.$.close, window, signal, smooth);
      },
      vi: function vi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return vi(_this.$.high, _this.$.low, _this.$.close, window);
      },
      cci: function cci$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 20;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.015;
        return cci(_this.$.high, _this.$.low, _this.$.close, window, mult);
      },
      obv: function obv$$1() {
        var signal = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        return obv(_this.$.close, _this.$.volume, signal);
      },
      adl: function adl$$1() {
        return adl(_this.$.high, _this.$.low, _this.$.close, _this.$.volume);
      },
      atr: function atr$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return atr(_this.$.high, _this.$.low, _this.$.close, window);
      },
      williams: function williams$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return williams(_this.$.high, _this.$.low, _this.$.close, window);
      },
      roc: function roc$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return roc(_this.$.close, window);
      }
    };
  };

  return TA;

})));
