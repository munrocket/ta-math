/* data formats */

export let simpleFormat = (x) => {
  return {
    length: x[4].length,
    time: (i) => x[0][i],
    open: (i) => x[1][i],
    high: (i) => x[2][i],
    low: (i) => x[3][i],
    close: (i) => x[4][i],
    volume: (i) => x[5][i]
  }
}

export let exchangeFormat = (x) => {
  return {
    length: x.length,
    time: (i) => x[i][0],
    open: (i) => x[i][1],
    high: (i) => x[i][2],
    low: (i) => x[i][3],
    close: (i) => x[i][4],
    volume: (i) => x[i][5]
  }
};

export let objectFormat = (x) => {
  return {
    length: x.close.length,
    time: (i) => x.time[i],
    open: (i) => x.open[i],
    high: (i) => x.high[i],
    low: (i) => x.low[i],
    close: (i) => x.close[i],
    volume: (i) => x.volume[i]
  }
}