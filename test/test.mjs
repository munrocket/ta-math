import { rmsd, fillarray } from '../src/core';
import TA from '../src/ta-math';
import tape from 'tape';
import tapSpec from 'tap-spec';

let randomData = fillarray(50).map(x => x = fillarray(6, 0));
let random = (left, right) => {
  return (right - left) * Math.random() + left;
}
randomData.map((tick, i) => {
  tick[0] = new Date('2018-01-01').getTime() + i * 60000;
  tick[1] = random(0, 20000);
  tick[2] = random(0, 20000);
  tick[3] = random(0, 20000);
  tick[4] = random(0, 20000);
  tick[5] = random(0, 1000);
});

let smoke = new TA(randomData);

tape.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);

tape('SMA', function(t) {
  t.false(smoke.sma().some(isNaN), 'Smoke test');
  t.end();
})

tape('EMA', function(t) {
  t.false(smoke.ema().some(isNaN), 'Smoke test');
  t.end();
})

tape('STD', function(t) {
  t.false(smoke.std().some(isNaN), 'Smoke test');
  t.end();
})

tape('BBAND', function(t) {
  let bb = smoke.bband();
  t.false(bb[0].some(isNaN), 'Smoke test on lower');
  t.false(bb[1].some(isNaN), 'Smoke test on middle');
  t.false(bb[2].some(isNaN), 'Smoke test on upper');
  t.end();
})

tape('MACD', function(t) {
  let macd = smoke.macd();
  t.false(macd[0].some(isNaN), 'Smoke test on line');
  t.false(macd[1].some(isNaN), 'Smoke test on signal');
  t.false(macd[2].some(isNaN), 'Smoke test on hist');
  t.end();
})

tape('RSI', function(t) {
  t.false(smoke.rsi().some(isNaN), 'Smoke test');
  t.end();
})

tape('VBP', function(t) {
  let vbp = smoke.vbp();
  t.false([vbp.bottom, vbp.top].some(isNaN), 'Smoke test on boundaries');
  t.false(vbp.volume.some(isNaN), 'Smoke test on volumes');
  t.end();
})

tape('ZigZag', function(t) {
  let zz = smoke.zigzag();
  t.false(zz[0].some(isNaN), 'Smoke test on time');
  t.false(zz[1].some(isNaN), 'Smoke test on price');
  t.end();
})