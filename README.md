
Technical analysis math
=========
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github) [![dependencies Status](https://david-dm.org/munrocket/ta-math/status.svg)](https://david-dm.org/munrocket/ta-math) [![Build Status](https://travis-ci.org/munrocket/ta-math.svg?branch=master)](https://travis-ci.org/munrocket/ta-math) [![Coverage Status](https://coveralls.io/repos/github/munrocket/ta-math/badge.svg?branch=master)](https://coveralls.io/github/munrocket/ta-math?branch=master) [![dependencies Status](https://david-dm.org/munrocket/ta-math/status.svg)](https://david-dm.org/munrocket/ta-math)

Well tested library for calculating technical indicators and overlays from price data in any format. You choose format and data by yourself and library return charts data. Written in es6 javascript, but also distributed in es5.

[//]: # (used emoji ✔️️❔❌:suspect:)

### Technical Overlays
| Function  | Technical Overlay                     | Tested  | Developed by     | Year |
|:----------|:--------------------------------------|:-------:|:----------------:|:----:|
| sma       | Simple Moving Average                 |    ✔️️    |                 |      |
| ema       | Exponential Moving Average            |    ✔️️    |                 |      |
| bb        | Bollinger Band                        |    ✔️️    | John Bollinger  | 1980s|
| ebb       | Exponential Bollinger Band            |    ✔️️    |                 |      |
| psar      | Parabolic SAR                         | :suspect:| Welles Wilder   | 1978 |
| keltner   | Keltner Channels                      |    ✔️️    | Chester Keltner | 1960 |
| zigzag    | ZigZag Indicator                      |    ✔️️    | Arthur Merrill  | 1977 |
| vbp       | Volume by Price                       |    ✔️️    |                 |      |

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
| mae       | Mean Absolute Error                   |    ✔️    |
| rmse      | Root-Mean-Square Error                |    ✔️    |
| nrmse     | Normalized Root-Mean-Square Error     |    ✔️    |

### Example
Bollinger bands with plotly visualization, ccxt data provider and BTC price from Binance.
![](https://i.imgur.com/uLgUto6.png)

### Installation

Install npm package in node environment by `npm i ta-math` or add `ta-math.umd.js` script file in web page.

### Usage
```
  var ohlcv = [[t0,o0,h0,l0,c0,v0],  ...  ,[tN,oN,hN,lN,cN,vN]];
  var ta = new TA(ohlcv, exchangeFormat);
  var emaShort = ta.ema(10);
  var emaLong = ta.ema(21);
  var bband = ta.bb(15, 2);
  var bbUpper = bband.upper;
  var bbLower = bband.lower;
```

### 2do list

- [X] basic indicators and overlays
- [X] unit tests
- [X] proxy for ohlcv
- [X] es5 with babel
- [X] coverage
- [X] good looking example
- [ ] typescript integration (.d.ts)
- [ ] new indicators (ADX, [etc](https://github.com/joshuaulrich/TTR/tree/master/R))

### Contributing

Feel free to contribute. Here [reference](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators) how to implement new indicators. There are test samples in the xls files, you can use this [tool](https://www.browserling.com/tools/text-columns-to-rows) to convert columns into rows.
