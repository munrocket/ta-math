
Technical analysis math
=========

Tiny library for calculating indicators and overlays from price data in any format. You choose format and data by yourself and library return line charts.

### Supporting indicators and overlays

* sma     -   Simple Moving Average
* ema     -   Exponential Moving Average
* std     -   Standard Deviation
* bband   -   Bollinger Band
* macd    -   Moving Average Convergence/Divergence
* rsi     -   Relative Strength Index
* vbp     -   Volume by Price
* zigzag  -   ZigZag Indicator

### Installation

If you use new node.js or modern browsers, you can just install npm package by `npm i ta-math` or copy `ta-math.browser.js` script file in web page. With es5 environment you need to think about babel compiler with babel-proxy-plugin.

### Usage

Here simple example. In source you can find how to use it with bitcoin prices fetched from ccxt library.
```
  import TA from 'ta-math';
  let ohlcv = [[t0,o0,h0,l0,c0,v0],  ...  ,[tN,oN,hN,lN,cN,vN]];
  let ta = new TA(ohlcv);
  let ema_line = ta.ema(15);
  let bband_line = ta.bband(15, 2);
```

How to set new data format. Just define a function that return length and some prices.
```
  let format = (data) => {
    return {
      length: data.length,  //length of prices
      open: (i) => data[i]['open'],
      high: (i) => data[i]['high'],
      low: (i) => data[i]['low'],
      close: (i) => data[i]['close'],
      volume: (i) => data[i]['volume'],
    }
  };
  let rsi_line = new TA(ohlcv2, format).rsi(14);
```

### 2do list

* fill unit tests
* es5 with babel
* typescript integration (.d.ts)
* new indicators (OBV, parabolic sar, accum/dist, stochastic momentum).
* good loking multi chart

### Contributing

Feel free to contribute. Here reference how to implement new indicators [StockCharts](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators).
