
Technical analysis math
=========

Tiny library for calculating indicators and overlays from price data in any format. You choose format and data by yourself and library return charts data.

### Supporting indicators and overlays

* sma     -   Simple Moving Average
* ema     -   Exponential Moving Average
* stddev  -   Standard Deviation
* expstd  -   Exponential Standard Deviation
* bb      -   Bollinger Band
* ebb     -   Exponential Bollinger Band
* macd    -   Moving Average Convergence/Divergence
* rsi     -   Relative Strength Index
* psar    -   Parabolic SAR
* stoch   -   Stochastic Oscillator (Full)
* atr     -   Average True Range
* vi      -   Vortex Indicator
* obv     -   On Balance Volume
* adl     -   Accumulation / Distribution line
* vbp     -   Volume by Price
* zigzag  -   ZigZag Indicator

### Installation

If you use new node.js or modern browsers, you can just install npm package by `npm i ta-math` or copy `ta-math.browser.js` script file in web page. With es5 environment you need to think about babel compiler with babel-proxy-plugin.

### Usage

You can see how to set new data format in `formats.mjs`, by default it uses exchangeFromat. Library does not craete new arrays and uses getters through proxy. You can find additional example with bitcoin prices that fetched from ccxt library in source.
```
  import TA from 'ta-math';
  let ohlcv = [[t0,o0,h0,l0,c0,v0],  ...  ,[tN,oN,hN,lN,cN,vN]];
  let ta = new TA(ohlcv, exchangeFormat);
  let ema_line = ta.ema(15);
  let bband_line = ta.bband(15, 2);
```

### 2do list

- [X] unit tests
- [X] proxy for ohlcv with different formats
- [ ] generators
- [ ] es5 with babel
- [ ] typescript integration (.d.ts)
- [ ] new indicators
- [ ] good loking ui example

### Contributing

Feel free to contribute. Here [reference](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators) how to implement new indicators. There are test samples in the xls files, you can use this [tool](https://www.browserling.com/tools/text-columns-to-rows) to convert columns into rows.
