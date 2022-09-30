
# Technical analysis math [![bundlephobia](https://badgen.net/bundlephobia/minzip/ta-math)](https://bundlephobia.com/result?p=ta-math) [![Codecov](https://img.shields.io/codecov/c/github/munrocket/ta-math.svg)](https://codecov.io/gh/munrocket/ta-math) [![Total alerts](https://img.shields.io/lgtm/alerts/g/munrocket/ta-math.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/munrocket/ta-math/alerts/)

Library for calculating technical indicators and overlays. You can choose format of price data
from provider and library will return result. It distributed with Typescript and Javascript (ES6, ES5).

![btc-with-bollinger-bands](https://i.imgur.com/moDdzmM.png)

Check [example](https://munrocket.github.io/ta-math/example/index.html) with plotly library, ccxt data provider and BTC prices from Binance exchange.

[//]: # (used emoji ➖✔️️❔❌:suspect:)

### Technical Overlays
| Function  | Technical Overlay                     | Tested   | Developed by       | Year |
|:----------|:--------------------------------------|:--------:|:------------------:|:----:|
| bb        | Bollinger Band                        |    ✔️️    | John Bollinger    | 1980s|
| dema      | Double Exponential Moving Average     |   ️ ✔️️    | Patrick  Mulloy   | 1994 |
| ema       | Exponential Moving Average            |    ✔️️    |                   |      |
| ebb       | Exponential Bollinger Band            |    ✔️️    | Based on Welford's|      |
| hma       | Hull Moving Average                   |    ok    | Alan Hull         | 2005 |
| keltner   | Keltner Channels                      |    ✔️️    | Chester Keltner   | 1960 |
| psar      | Parabolic SAR                         |    ❌    | Welles Wilder     | 1978 |
| sma       | Simple Moving Average                 |    ✔️️    |                   |      |
| tema      | Triple Exponential Moving Average     |   ️ ✔️️    | Patrick  Mulloy   | 1994 |
| vbp       | Volume by Price                       |    ✔️️    |                   |      |
| vwap      | Volume Weighted Average Price         |    ✔️️    | James Elkins      | 1984 |
| wma       | Weighted Moving Average               |    ️ok    | John J. Murphy    | 1999 |
| zigzag    | ZigZag Indicator                      |    ✔️️    | Arthur Merrill    | 1977 |

### Technical Indicators
| Function  | Technical Indicator                   | Tested  | Developed by                      | Year |
|:----------|:--------------------------------------|:-------:|:---------------------------------:|:----:|
| adl       | Accumulation / Distribution line      |   ✔️    | Marc Chaikin                      | 1970s|
| atr       | Average True Range                    |   ✔️    | Welles Wilder                     | 1978 |
| adx       | Average Directional Index             |   ✔️    | Welles Wilder                     | 1978 |
| bbp       | Bollinger Bands Percent Bandwidth %B  |   ok   |                                   |      |
| cci       | Commodity Channel Index               |   ✔️    | Donald Lambert                    | 1980 |
| cho       | Chaikin Oscillator                    |   ok   |  Marc Chaikin                     |      |
| expdev    | Exponential Weighted Deviation        |   ✔️    |                                   |      |
| fi        | Force Index                           |   ✔️    |                                   |      |
| kst       | Know Sure Thing                       |   ✔️    |                                   |      |
| macd      | Moving Average Convergence/Divergence |   ✔️    | Gerald Appel                      | 1979 |
| madev     | Mean Absolute Deviation               |   ✔️    |                                   |      |
| mfi       | Money Flow Index (volume-weighted RSI)|   ✔️    | Gene Quong and Avrum Soudack      | 1989 |
| obv       | On Balance Volume                     |   ✔️    | Joseph Granville                  | 1963 |
| roc       | Rate-of-Change                        |   ✔️    |                                   |      |
| rsi       | Relative Strength Index               |   ✔️    | Welles Wilder                     | 1978 |
| stdev     | Standard Deviation                    |   ✔️️    |                                   |      |
| stoch     | Stochastic Oscillator (Slow/Fast/Full)|   ✔️    | George Lane                       | 1950s|
| stochRsi  | Combines Stochastics with the RSI     |   ✔️    | Welles Wilder                     | 1994 |
| vi        | Vortex Indicator                      |   ✔️    | Etienne Botes and Douglas Siepman | 2010 |
| williams  | Williams %R                           |   ✔️    |                                   |      |

### Error methods
| Function  | Error methods                         | Tested  |
|:----------|:--------------------------------------|:-------:|
| mae       | Mean Absolute Error                   |    ✔️   |
| mape      | Mean Absulute Percentage Error        |    ✔️   |
| nrmse     | Normalized Root-Mean-Square Error     |    ✔️   |
| rmse      | Root-Mean-Square Error                |    ✔️   |

### Price transformations
| Function     | Price transformation               | Tested  |
|:-------------|:-----------------------------------|:-------:|
| trueRange    | True Range                         |    ✔️   |
| typicalPrice | Typical Price                      |    ✔️   |

### Statistical methods
| Function  | Statistical methods                    | Tested  |
|:----------|:--------------------------------------|:-------:|
| cov       | Covariation                           |    ✔️   |
| cor       | Correlation                           |    ✔️   |
| mean      | Mean (Average)                        |    ✔️   |
| sd        | Standard deviation                    |    ✔️   |

### Correlation matrix
![correlation-matrix](https://i.imgur.com/6tVQifE.png)

[//]: # (### Forecasting methods )
[//]: # (| Function     | Method                          | Tested  | Developed by                   | Year |)
[//]: # (|:-------------|:--------------------------------|:-------:|:------------------------------:|:----:|)
[//]: # (| holtWinters  | Holt-Winters Filtering          |    ❌   | C. C. Holt and P. R. Winters   | 1957 |)

### Usage
```javascript
  const ohlcv = [[t,o,h,l,c,v], [t2,o2,h2,l2,c2,v2],  ...  ,[tN,oN,hN,lN,cN,vN]];
  const ta = new TA(ohlcv, TA.exchangeFormat);
  const emaShort = ta.ema(10);
  const emaLong = ta.ema(21);
  const bband = ta.bb(15, 2);
  const bbUpper = bband.upper;
  const bbLower = bband.lower;
  const smaOpenPrice = TA.sma(ta.$open);
```

### Installation
Install npm package `npm i ta-math` or add `ta-math.js` script file on web page.

### 2do list
- [X] basic indicators and overlays
- [X] unit tests
- [X] es5 with babel
- [X] coverage
- [X] good looking example
- [X] migrate to typescript
- [ ] fix PSAR, WMA, HMA

### Contributing
Feel free to contribute. Here [reference](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators)
how to implement new indicators. There are test samples in the .xls files, also you can generate testing data
with 'generator.py' file. To convert columns into rows in .xls you can use this
[tool](https://www.browserling.com/tools/text-columns-to-rows).
