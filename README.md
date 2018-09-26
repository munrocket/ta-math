
Technical analysis math
=========
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github) 
![Packagist](https://img.shields.io/packagist/l/doctrine/orm.svg)
[![Build Status](https://travis-ci.org/munrocket/ta-math.svg?branch=master)](https://travis-ci.org/munrocket/ta-math)
[![Codecov](https://img.shields.io/codecov/c/github/munrocket/ta-math.svg)](https://codecov.io/gh/munrocket/ta-math)
[![dependencies Status](https://david-dm.org/munrocket/ta-math/status.svg)](https://david-dm.org/munrocket/ta-math)

Well tested library for calculating technical indicators and overlays from price data in any format. You choose format and data by yourself and library return charts data. Written in es6 javascript, but also distributed in es5.

[//]: # (used emoji ✔️️❔❌:suspect:)

### Technical Overlays
| Function  | Technical Overlay                     | Tested   | Developed by       | Year |
|:----------|:--------------------------------------|:--------:|:------------------:|:----:|
| sma       | Simple Moving Average                 |    ✔️️    |                   |      |
| ema       | Exponential Moving Average            |    ✔️️    |                   |      |
| dema      | Double Exponential Moving Average     |   ️ ✔️️    | Patrick  Mulloy   | 1994 |
| tema      | Triple Exponential Moving Average     |   ️ ✔️️    | Patrick  Mulloy   | 1994 |
| bb        | Bollinger Band                        |    ✔️️    | John Bollinger    | 1980s|
| ebb       | Exponential Bollinger Band            |    ✔️️    | Based on Welford's|      |
| psar      | Parabolic SAR                         | :suspect: | Welles Wilder     | 1978 |
| keltner   | Keltner Channels                      |    ✔️️    | Chester Keltner   | 1960 |
| vbp       | Volume by Price                       |    ✔️️    |                   |      |
| vwap      | Volume Weighted Average Price         |    ✔️️    | James Elkins      | 1984 |
| zigzag    | ZigZag Indicator                      |    ✔️️    | Arthur Merrill    | 1977 |

### Technical Indicators
| Function  | Technical Indicator                   | Tested  | Developed by                      | Year |
|:----------|:--------------------------------------|:-------:|:---------------------------------:|:----:|
| stdev     | Standard Deviation                    |   ✔️️    |                                   |      |
| madev     | Mean Absolute Deviation               |   ✔️    |                                   |      |
| expdev    | Exponential Weighted Deviation        |   ✔️    |                                   |      |
| macd      | Moving Average Convergence/Divergence |   ✔️    | Gerald Appel                      | 1979 |
| rsi       | Relative Strength Index               |   ✔️    | Welles Wilder                     | 1978 |
| mfi       | Money Flow Index, volume-weighted RSI |   ✔️    | Gene Quong and Avrum Soudack      | 1989 |
| stoch     | Stochastic Oscillator (Full)          |   ✔️    | George Lane                       | 1950s|
| stochRsi  | Combines Stochastics with the RSI     |   ✔️    | Welles Wilder                     | 1994 |
| vi        | Vortex Indicator                      |   ✔️    | Etienne Botes and Douglas Siepman | 2010 |
| cci       | Commodity Channel Index               |   ✔️    | Donald Lambert                    | 1980 |
| obv       | On Balance Volume                     |   ✔️    | Joseph Granville                  | 1963 |
| adl       | Accumulation / Distribution line      |   ✔️    | Marc Chaikin                      | 1970s|
| atr       | Average True Range                    |   ✔️    | Welles Wilder                     | 1978 |
| williams  | Williams %R                           |   ✔️    |                                   |      |
| roc       | Rate-of-Change                        |   ✔️    |                                   |      |

### Error methods
| Function  | Error methods                         | Tested  |
|:----------|:--------------------------------------|:-------:|
| mae       | Mean Absolute Error                   |    ✔️   |
| mape      | Mean Absulute Percentage Error        |    ✔️   |
| rmse      | Root-Mean-Square Error                |    ✔️   |
| nrmse     | Normalized Root-Mean-Square Error     |    ✔️   |

### Forecasting methods 
| Function     | Method                          | Tested  | Developed by                   | Year |
|:-------------|:--------------------------------|:-------:|:------------------------------:|:----:|
| holtWinters  | Holt-Winters Filtering          |    ❌   | C. C. Holt and P. R. Winters   | 1957 |

### Visualization
![btc-with-bollinger-bands](https://i.imgur.com/moDdzmM.png)
You can check [interactive example](https://cdn.rawgit.com/munrocket/ta-math/e1971812/test/test.html) of with plotly library, ccxt data provider and BTC prices from Binance exchange.

### Installation
Install npm package in node environment by `npm i ta-math` or add `ta-math.iife.js` script file in web page.

### Usage
```
  var ohlcv = [[t,o,h,l,c,v], [t2,o2,h2,l2,c2,v2],  ...  ,[tN,oN,hN,lN,cN,vN]];
  var ta = new TA(ohlcv, TA.exchangeFormat);
  var emaShort = ta.ema(10);
  var emaLong = ta.ema(21);
  var bband = ta.bb(15, 2);
  var bbUpper = bband.upper;
  var bbLower = bband.lower;
```

### 2do list

- [X] basic indicators and overlays
- [X] unit tests
- [X] es5 with babel
- [X] coverage
- [X] good looking example
- [ ] forecasting and strategies (Holt-Winters, ARIMA, FFT [etc](https://www.quantstart.com/articles#time-series-analysis))
- [ ] test for default parameters and not enough length

### Contributing

Feel free to contribute. Here [reference](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators) how to implement new indicators. There are test samples in the .xls files, also you can generate testing data with 'generator.py' file. To convert columns into rows use this [tool](https://www.browserling.com/tools/text-columns-to-rows).
