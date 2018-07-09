(async function main () {
  let ohlcv = await new ccxt.cex().fetchOHLCV ('BTC/USD', '1h');
  let macd = TA(ohlcv).ema(10);
})();