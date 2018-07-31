
Technical analysis math
=========
![PRs Welcome](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github) ![Packagist](https://img.shields.io/packagist/l/doctrine/orm.svg) ![Travis](https://img.shields.io/travis/munrocket/ta-math.svg) [![dependencies Status](https://david-dm.org/munrocket/ta-math/status.svg)](https://david-dm.org/munrocket/ta-math)

Tiny library for calculating indicators and overlays from price data in any format. You choose format and data by yourself and library return charts data.

### Technical Overlays
| Function  | Technical Overlay                     | Tested  |
|:----------|:--------------------------------------|:-------:|
| sma       | Simple Moving Average                 |    √    |
| ema       | Exponential Moving Average            |    √    |
| bb        | Bollinger Band                        |    √    |
| ebb       | Exponential Bollinger Band            |         |
| psar      | Parabolic SAR                         |    √    |
| vbp       | Volume by Price                       |    √    |
| keltner   | Keltner Channels                      |         |
| zigzag    | ZigZag Indicator                      |         |

### Technical Indicators
| Function  | Technical Indicator                   | Tested  |
|:----------|:--------------------------------------|:-------:|
| stddev    | Standard Deviation                    |    √    |
| madev     | Mean Absolute Deviation               |    √    |
| expdev    | Exponential Weighted Deviation        |         |
| macd      | Moving Average Convergence/Divergence |    √    |
| rsi       | Relative Strength Index               |    √    |
| stoch     | Stochastic Oscillator (Full)          |    √    |
| stochRsi  | Combines Stochastics with the RSI     |    √    |
| cci       | Commodity Channel Index               |    √    |
| obv       | On Balance Volume                     |    √    |
| adl       | Accumulation / Distribution line      |    √    |
| atr       | Average True Range                    |    √    |
| vi        | Vortex Indicator                      |    √    |

### Error methods
| Function  | Error methods                         | Tested  |
|:----------|:--------------------------------------|:-------:|
| mae       | Mean Absolute Error                   |    √    |
| rmse      | Root-Mean-Square Error                |    √    |
| nrmse     | Normalized Root-Mean-Square Error     |    √    |

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

- [X] popular indicators and overlays
- [X] unit tests
- [X] proxy for ohlcv
- [X] different input formats
- [ ] es5 with babel
- [ ] typescript integration (.d.ts)
- [ ] new basic indicators (ROC, Money Flow, Williams %R [etc](https://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:introduction_to_technical_indicators_and_oscillators).)
- [ ] good loking ui example

### Contributing

Feel free to contribute. Here [reference](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators) how to implement new indicators. There are test samples in the xls files, you can use this [tool](https://www.browserling.com/tools/text-columns-to-rows) to convert columns into rows.
