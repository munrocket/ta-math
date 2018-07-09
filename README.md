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
* ema     -   Exponential Moving Average
* macd    -   Moving Average Convergence/Divergence

### Contributing

Feel free to contribute. Here reference [StockCharts](http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators).