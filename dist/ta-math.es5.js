var TA = (function (exports) {
  'use strict';

  function mean(series) {
      let sum = 0.;
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
  function sma(series, window) {
      return rolling((s) => mean(s), series, window);
  }
  function stdev(series, window) {
      return rolling((s) => sd(s), series, window);
  }

  function adl($high, $low, $close, $volume) {
      let adl = [$volume[0] * (2. * $close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
      for (let i = 1, len = $high.length; i < len; i++) {
          adl[i] = adl[i - 1] + $volume[i] * (2 * $close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
      }
      return adl;
  }

  function bb($close, window, mult) {
      let ma = sma($close, window);
      let dev = stdev($close, window);
      let upper = pointwise((a, b) => a + b * mult, ma, dev);
      let lower = pointwise((a, b) => a - b * mult, ma, dev);
      return { lower: lower, middle: ma, upper: upper };
  }

  class TA {
      static cov(f, g) {
          return cov(f, g);
      }
      static cor(f, g) {
          return cor(f, g);
      }
      static adl($high, $low, $close, $volume) {
          return adl($high, $low, $close, $volume);
      }
      static bb($close, window = 15, mult = 2) {
          return bb($close, window, mult);
      }
  }

  exports.TA = TA;

  return exports;

}({}));
