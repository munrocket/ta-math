
Technical analysis math
=========
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github) ![Packagist](https://img.shields.io/packagist/l/doctrine/orm.svg) ![Travis](https://img.shields.io/travis/munrocket/ta-math.svg) [![Coverage Status](https://coveralls.io/repos/github/munrocket/ta-math/badge.svg?branch=master)](https://coveralls.io/github/munrocket/ta-math?branch=master) [![dependencies Status](https://david-dm.org/munrocket/ta-math/status.svg)](https://david-dm.org/munrocket/ta-math)

Tiny library for calculating technical indicators and overlays from price data in any format. You choose format and data by yourself and library return charts data.

[//]: # (used emoji ✔️️❔❌)

### Technical Overlays
| Function  | Technical Overlay                     | Tested  | Developed by     | Year |
|:----------|:--------------------------------------|:-------:|:----------------:|:----:|
| sma       | Simple Moving Average                 |    ✔️️    |                  |      |
| ema       | Exponential Moving Average            |    ✔️️    |                  |      |
| bb        | Bollinger Band                        |    ✔️️    | John Bollinger   | 1980s|
| ebb       | Exponential Bollinger Band            |    ❔    |                  |      |
| psar      | Parabolic SAR                         |    ❌    | Welles Wilder    | 1978 |
| vbp       | Volume by Price                       |    ✔️️    |                  |      |
| keltner   | Keltner Channels                      |    ✔️️    | Chester Keltner  | 1960 |
| zigzag    | ZigZag Indicator                      |    ❔    | Arthur Merrill   | 1977 |

### Technical Indicators
| Function  | Technical Indicator                   | Tested  | Developed by     | Year |
|:----------|:--------------------------------------|:-------:|:----------------:|:----:|
| stddev    | Standard Deviation                    |   ✔️️    |                  |      |
| madev     | Mean Absolute Deviation               |   ✔️    |                  |      |
| expdev    | Exponential Weighted Deviation        |   ❔    |                  |      |
| macd      | Moving Average Convergence/Divergence |   ✔️    | Gerald Appel     | 1979 |
| rsi       | Relative Strength Index               |   ✔️    | Welles Wilder    | 1978 |
| stoch     | Stochastic Oscillator (Full)          |   ✔️    | George Lane      | 1950s|
| stochRsi  | Combines Stochastics with the RSI     |   ✔️    | Welles Wilder    | 1994 |
| cci       | Commodity Channel Index               |   ✔️    | Donald Lambert   | 1980 |
| obv       | On Balance Volume                     |   ✔️    | Joseph Granville | 1963 |
| adl       | Accumulation / Distribution line      |   ✔️    | Marc Chaikin     | 1970s|
| atr       | Average True Range                    |   ✔️    | Welles Wilder    | 1978 |
| vi        | Vortex Indicator                      |   ✔️    | Etienne Botes    | 2010 |

### Error methods
| Function  | Error methods                         | Tested  |
|:----------|:--------------------------------------|:-------:|
| mae       | Mean Absolute Error                   |    ✔️    |
| rmse      | Root-Mean-Square Error                |    ✔️    |
| nrmse     | Normalized Root-Mean-Square Error     |    ✔️    |

### Installation

If you use new node.js or modern browsers, you can just install npm package by `npm i ta-math` or copy `ta-math.browser.js` script file in web page. With es5 environment you need to think about babel compiler with babel-proxy-plugin.

### Usage

You can see how to set new data format in `formats.mjs`, by default it uses exchangeFromat. Library does not craete new arrays and uses getters through proxy. You can find additional example with bitcoin prices that fetched from ccxt library in source.
```
  import TA from 'ta-math';
  let ohlcv = [[t0,o0,h0,l0,c0,v0],  ...  ,[tN,oN,hN,lN,cN,vN]];
  let ta = new TA(ohlcv, exchangeFormat);
  let ema_short = ta.ema(10);
  let ema_long = ta.ema(21);
  let bband = ta.bb(15, 2);
  let bb_upper = bband.upper;
  let bb_lower = bband.lower;
```

### 2do list

- [X] basic indicators and overlays
- [X] unit tests
- [X] proxy for ohlcv
- [X] es5 with babel
- [X] coverage
- [ ] typescript integration (.d.ts)
- [ ] new indicators (ROC, Money Flow, Williams %R, [etc.](https://www.metatrader4.com/en/trading-platform/help/analytics/tech_indicators/bulls_power))
- [ ] good loking ui example

### Contributing

Feel free to contribute. Here [reference](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators) how to implement new indicators. There are test samples in the xls files, you can use this [tool](https://www.browserling.com/tools/text-columns-to-rows) to convert columns into rows.
