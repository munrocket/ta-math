import { mean, sd, rmsd, nrmsd } from '../src/core';
import { simpleFormat } from '../src/formats';
import TA from '../src/ta-math';
import tape from 'tape';
import tapSpec from 'tap-spec';

let randomize = (tleft, right) => {
  return (right - tleft) * Math.random() + tleft;
}

// random ohlcv
let random = new Array(6).fill(0).map(x => x = new Array(50).fill(0));
for (let i = 0; i < random[0].length; i++) {
  let lcoh = [randomize(5000, 20000),randomize(5000, 20000),randomize(5000, 20000),randomize(5000, 20000)].sort();
  if(randomize(0,1)) { let temp = lcoh[1]; lcoh[1] = lcoh[2]; lcoh[2] = temp; };
  random[0][i] = new Date('2018-01-01').getTime() + i * 60000;
  random[1][i] = lcoh[1];  //o
  random[2][i] = lcoh[3];  //h
  random[3][i] = lcoh[0];  //l
  random[4][i] = lcoh[2];  //c
  random[5][i] = randomize(5, 1000);
};
let noize = new TA(random, simpleFormat);

tape.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);

tape('Mean & SD', (t) => {
  let data = [53.73,53.87,53.85,53.88,54.08,54.14,54.50,54.30,54.40,54.16];
  let delta = Math.abs(mean(data) - 54.09);
  t.ok(delta < 1e-2, `Direct mean test (${delta.toFixed(5)})`);
  let delta2 = Math.abs(sd(data) - 0.24);
  t.ok(delta2 < 1e-2, `Direct sd test (${delta2.toFixed(5)})`);
  t.end();
})

tape('RMSD', (t) => {
  t.ok(isFinite(rmsd(random[0], random[1])), 'Finite test');
  t.ok(rmsd(random[0],random[0]) == 0, 'Simple test');
  let delta = Math.abs(rmsd([-2,5,-8,9,-4],[0,0,0,0,0]) - 6.16);
  t.ok(delta < 1e-2, `Direct test (${delta.toFixed(5)})`)
  t.end();
})

tape('SMA', (t) => {
  let c = [22.27,22.19,22.08,22.17,22.18,22.13,22.23,22.43,22.24,22.29,22.15,22.39,22.38,22.61,23.36,
    24.05,23.75,23.83,23.95,23.63,23.82,23.87,23.65,23.19,23.10,23.33,22.68,23.10,22.40,22.17];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,22.22,22.21,22.23,22.26,22.31,22.42,22.61,
          22.77,22.91,23.08,23.21,23.38,23.53,23.65,23.71,23.69,23.61,23.51,23.43,23.28,23.13];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).sma(10);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(9), actual.slice(9))
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('EMA', (t) => {
  let c = [22.27,22.19,22.08,22.17,22.18,22.13,22.23,22.43,22.24,22.29,22.15,22.39,22.38,22.61,23.36,
    24.05,23.75,23.83,23.95,23.63,23.82,23.87,23.65,23.19,23.10,23.33,22.68,23.10,22.40,22.17];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,22.22,22.21,22.24,22.27,22.33,22.52,22.80,
          22.97,23.13,23.28,23.34,23.43,23.51,23.54,23.47,23.40,23.39,23.26,23.23,23.08,22.92];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).ema(10);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(9), actual.slice(9));
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('STDDEV', (t) => {
  let c = [52.22,52.78,53.02,53.67,53.67,53.74,53.45,53.72,53.39,52.51,52.32,51.45,51.60,52.43,52.47,
    52.91,52.07,53.12,52.77,52.73,52.09,53.19,53.73,53.87,53.85,53.88,54.08,54.14,54.50,54.30,54.40,54.16];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.51,0.73,0.86,0.83,0.79,0.72,0.68,
    0.58,0.51,0.52,0.53,0.48,0.49,0.58,0.62,0.67,0.62,0.66,0.69,0.65,0.36,0.24];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).stddev(10);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(10), actual.slice(10));
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('BB', (t) => {
  let c = [86.16,89.09,88.78,90.32,89.07,91.15,89.44,89.18,86.93,87.68,86.96,89.43,89.32,88.72,
    87.45,87.26,89.50,87.90,89.13,90.70,92.90,92.98,91.80,92.66,92.68,92.30,92.77,92.54,92.95,
    93.20,91.07,89.83,89.74,90.40,90.74,88.02,88.09,88.84,90.78,90.54,91.39,90.65];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,86.12,
    86.14,85.87,85.85,85.70,85.65,85.59,85.56,85.60,85.98,86.27,86.82,86.87,86.91,87.12,87.63,87.83,
    87.56,87.76,87.97,87.95,87.96,87.95];
  let bb = new TA([c,c,c,c,c,c], simpleFormat).bb(20,2);
  t.ok((bb.lower.every(isFinite) && bb.middle.every(isFinite) && bb.upper.every(isFinite)), 'Finite test');
  let delta = nrmsd(expected.slice(19), bb.lower.slice(19));
  t.ok(delta < 1e-2, `NRMSD test on lower (${delta.toFixed(5)})`);
  t.end();
})

tape('MACD', (t) => {
  let c = [16.39,16.50,16.45,16.43,16.52,16.51,16.423,16.41,16.47,16.45,16.32,16.36,16.34,16.59,16.54,16.52,
    16.44,16.47,16.5,16.45,16.28,16.07,16.08,16.1,16.1,16.09,16.43,16.49,16.59,16.65,16.78,16.86,16.86,16.76];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.05,0.01,-0.01,-0.02,-0.01,0.00,-0.01,0.00,
    0.03,0.09,0.12,0.13,0.13,0.12,0.05,-0.01,-0.06,-0.10,-0.14,-0.17,-0.18,-0.16];
  let macd = new TA([c,c,c,c,c,c], simpleFormat).macd(13,5,6);
  t.ok(macd.line.every(isFinite) && macd.signal.every(isFinite) && macd.hist.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(19), macd.line.slice(19));
  t.ok(delta < 2e-2, `NRMSD test on macd line (${delta.toFixed(5)})`);
  t.end();
})

tape('RSI', (t) => {
  let c = [44.34,44.09,44.15,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46.00,
    46.03,46.41,46.22,45.64,46.21,46.25,45.71,46.45,45.78,45.35,44.03,44.18,44.22,44.57,43.42,42.66,43.13]
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,70.53,66.32,66.55,69.41,
    66.36,57.97,62.93,63.26,56.06,62.38,54.71,50.42,39.99,41.46,41.87,45.46,37.30,33.08,37.77];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).rsi(14);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(14), actual.slice(14));
  t.ok(delta < 7e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('VBP', (t) => {
  let vbp = noize.vbp();
  let delta = sd(vbp.volume)
  t.ok([vbp.bottom, vbp.top].every(isFinite) && vbp.volume.every(isFinite), 'Finite test');
  t.ok(vbp.bottom < vbp.top, 'Bottom lower than top');
  t.ok(delta < 0.1, `SD of uniform distribution (${delta.toFixed(5)})`);
  t.end();
})

tape('ZigZag', (t) => {
  let zz = noize.zigzag();
  t.ok(zz.time.every(isFinite) && zz.price.every(isFinite), 'Finite test');
  let isUpDown = true;
  zz.price.forEach((x, i) => {
    if(i > 1 && Math.sign((zz.price[i - 2] - zz.price[i - 1]) * (zz.price[i - 1] - zz.price[i])) != -1) {
      isUpDown = false;
    }
  });
  t.ok(isUpDown, "UpDown test");
  let ok = true;
  for (let i = 0; i < zz.time.length - 1; i++) {
    let tleft = random[0].indexOf(zz.time[i]);
    let tright = random[0].indexOf(zz.time[i + 1]);
    let isUp = zz.price[tleft] < zz.price[tright];
    for (let j = tleft; j <= tright; j++) {
      if (random[4][j] < zz.price[isUp ? tleft : tright] || random[4][j] > zz.price[isUp ? tright : tleft]) {
        ok = false;
      }
  } }
  //t.ok(ok, "MinMax test");
  t.end();
})

tape('OBV', (t) => {
  let c = [53.26,53.30,53.32,53.37,54.19,53.92,54.65,54.60];
  let v = [8000,8200,8100,8300,8900,9200,13300,10300];
  let expected = [0,8200,16300,24600,33500,24300,37600,27300];
  let actual = new TA([c,c,c,c,c,v], simpleFormat).obv();
  let delta = nrmsd(expected, actual);
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('ADL', (t) => {
  let h = [62.34,62.05,62.27,60.79,59.93,61.75,60.00,59.00];
  let l = [61.37,60.69,60.10,58.61,58.71,59.86,57.97,58.02];
  let c = [62.15,60.81,60.45,59.18,59.24,60.20,58.48,58.24];
  let v = [7849,11692,10575,13059,20734,29630,17705,7259];
  let expected = [4774,-4855,-12019,-18249,-21006,-39976,-48785,-52785];
  let actual = new TA([c,c,h,l,c,v], simpleFormat).adl();
  let delta = nrmsd(expected, actual);
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('ADL', (t) => {
  let h = [62.34,62.05,62.27,60.79,59.93,61.75,60.00,59.00];
  let l = [61.37,60.69,60.10,58.61,58.71,59.86,57.97,58.02];
  let c = [62.15,60.81,60.45,59.18,59.24,60.20,58.48,58.24];
  let v = [7849,11692,10575,13059,20734,29630,17705,7259];
  let expected = [4774,-4855,-12019,-18249,-21006,-39976,-48785,-52785];
  let actual = new TA([c,c,h,l,c,v], simpleFormat).adl();
  let delta = nrmsd(expected, actual);
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('PSAR', (t) => {
  let h = [48.11,48.30,48.17,48.60,48.33,48.40,48.55,48.45,48.70,48.72,48.90,48.87,48.82,49.05,49.20,49.35];
  let l = [47.25,47.77,47.91,47.90,47.74,48.10,48.06,48.07,47.79,48.14,48.39,48.37,48.24,48.64,48.94,48.86];
  let expected = [47.25,47.25,47.25,47.27,47.32,47.38,47.42,47.47,47.52,47.59,47.68,47.80,47.91,48.01,48.13,48.28];
  let actual = new TA([h,h,h,l,l,l], simpleFormat).psar();
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(1), actual.slice(1));
  t.ok(delta < 2e-2, `NRMSD uptrend test (${delta.toFixed(5)})`);
  t.end();
})

tape('Stoch', (t) => {
  let h = [127.01,127.62,126.59,127.35,128.17,128.43,127.37,126.42,126.90,126.85,125.65,125.72,127.16,127.72,127.69,
    128.22,128.27,128.09,128.27,127.74,128.77,129.29,130.06,129.12,129.29,128.47,128.09,128.65,129.14,128.64];
  let l = [125.36,126.16,124.93,126.09,126.82,126.48,126.03,124.83,126.39,125.72,124.56,124.57,125.07,126.86,126.63,
    126.80,126.71,126.80,126.13,125.92,126.99,127.81,128.47,128.06,127.61,127.60,127.00,126.90,127.49,127.40];
  let c = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,127.29,127.18,128.01,127.11,127.73,
    127.06,127.33,128.71,127.87,128.58,128.60,127.93,128.11,127.60,127.60,128.69,128.27]
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,70.44,67.61,89.20,65.81,
    81.75,64.52,74.53,98.58,70.10,73.06,73.42,61.23,60.96,40.39,40.39,66.83,56.73];
  let actual = new TA([h,h,h,l,c,c], simpleFormat).stoch();
  t.ok(actual.line.slice(13).every(isFinite) && actual.line.slice(15).every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(13), actual.line.slice(13));
  t.ok(delta < 1e-2, `NRMSD uptrend test (${delta.toFixed(5)})`);
  t.end();
})

tape('ATR', (t) => {
  let h = [48.70,48.72,48.90,48.87,48.82,49.05,49.20,49.35,49.92,50.19,50.12,
    49.66,49.88,50.19,50.36,50.57,50.65,50.43,49.63,50.33,50.29,50.17,49.32,48.50,48.32,46.80,47.80,48.39,48.66,48.79];
  let l = [47.79,48.14,48.39,48.37,48.24,48.64,48.94,48.86,49.50,49.87,49.20,
    48.90,49.43,49.73,49.26,50.09,50.30,49.21,48.98,49.61,49.20,49.43,48.08,47.64,41.55,44.28,47.31,47.20,47.90,47.73];
  let c = [48.16,48.61,48.75,48.63,48.74,49.03,49.07,49.32,49.91,50.13,49.53,
    49.50,49.75,50.03,50.31,50.52,50.41,49.34,49.37,50.23,49.24,49.93,48.43,48.18,46.57,45.41,47.77,47.72,48.62,47.85];
  let expected = [1.32,1.27,1.22,1.16,1.12,1.07,1.01,0.98,0.95,0.90,0.91,0.90,0.86,0.83,0.85,0.83,0.79,0.82,0.81,0.82,
    0.84,0.85,0.92,0.91,1.33,1.42,1.49,1.47,1.43,1.40];
  let actual = new TA([c,c,h,l,c,c], simpleFormat).atr();
  let delta = nrmsd(expected.slice(13), actual.slice(13));
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 2e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
})

tape('VI', (t) => {
  let h = [1380.39,1376.51,1362.34,1351.53,1343.98,1363.13,1389.19,1391.74,1387.16,1385.03,1375.13,1394.16,1399.63,1407.14,1404.14,
    1405.95,1405.98,1405.87,1410.03,1407.73,1417.44,1418.71,1418.13,1426.68,1416.12,1413.49,1413.46,1416.17,1413.63,1413.95];
  let l = [1371.21,1362.19,1337.56,1329.24,1331.50,1338.17,1360.05,1381.37,1379.17,1373.35,1354.65,1365.45,1391.04,1394.46,1396.13,
    1398.80,1395.62,1397.32,1400.60,1401.83,1404.15,1414.67,1412.12,1410.86,1406.78,1400.50,1398.04,1409.11,1405.59,1406.57];
  let c = [1376.51,1362.66,1350.52,1338.31,1337.89,1360.02,1385.97,1385.30,1379.32,1375.32,1365.00,1390.99,1394.23,1401.35,1402.22,
    1402.80,1405.87,1404.11,1403.93,1405.53,1415.51,1418.16,1418.13,1413.17,1413.49,1402.08,1411.13,1410.44,1409.30,1410.49];
  let expected1 = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,1.10,1.15,
    1.26,1.33,1.34,1.35,1.26,1.21,1.21,1.23,1.35,1.26,1.05,1.11,1.07,1.06];
  let expected2 = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.89,0.87,
    0.79,0.73,0.66,0.75,0.82,0.82,0.80,0.73,0.72,0.85,0.90,0.93,0.93,0.94]
  let actual = new TA([c,c,h,l,c,c], simpleFormat).vi();
  let delta1 = nrmsd(expected1.slice(14), actual.plus.slice(14));
  let delta2 = nrmsd(expected2.slice(14), actual.minus.slice(14));
  t.ok(actual.plus.slice(14).every(isFinite) && actual.minus.slice(14).every(isFinite), 'Finite test');
  t.ok(delta1 + delta2 < 2e-2, `NRMSD test (${delta1.toFixed(5)}, ${delta2.toFixed(5)})`);
  t.end();
})