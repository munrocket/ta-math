/* data formats */

export type Format = (x: any) => { [index: string] : any };

export let simpleFormat: Format = (x: any) => {
  return {
    length: x[4].length,
    time: (i: number) => x[0][i],
    open: (i: number) => x[1][i],
    high: (i: number) => x[2][i],
    low: (i: number) => x[3][i],
    close: (i: number) => x[4][i],
    volume: (i: number) => x[5][i]
  }
}

export let exchangeFormat: Format = (x: any) => {
  return {
    length: x.length,
    time: (i: number) => x[i][0],
    open: (i: number) => x[i][1],
    high: (i: number) => x[i][2],
    low: (i: number) => x[i][3],
    close: (i: number) => x[i][4],
    volume: (i: number) => x[i][5]
  }
};

export let objectFormat: Format = (x: any) => {
  return {
    length: x.close.length,
    time: (i: number) => x.time[i],
    open: (i: number) => x.open[i],
    high: (i: number) => x.high[i],
    low: (i: number) => x.low[i],
    close: (i: number) => x.close[i],
    volume: (i: number) => x.volume[i]
  }
}