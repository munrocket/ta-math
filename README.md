Technical analysis math
=========

Library for indicators and overlays with ohlcv data written in ES6.

### Installation

`npm i ta-math`

### Usage

```
let ohlcv = await new ccxt.cex().fetchOHLCV ('BTC/USD', '1h');
let line = TA(ohlcv).ema(10);
```

### Supporting indicators and overlays

* sma     -   Simple Moving Average
* std     -   Standard Deviation
* ema     -   Exponential Moving Average
* macd    -   Moving Average Convergence/Divergence
* bband   -   Bollinger Band
* zigzag  -   ZigZag Indicator

### Contributing

Feel free to contribute. Here reference how to calculate new indicators [StockCharts](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators).
