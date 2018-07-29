/* basic functions */

export function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}

export function sd(array) {
  return rmsd(array, new Array(array.length).fill(mean(array)));
}

export function rmsd(f, g) {
  if (f.length != g.length) { return Infinity };
  let sqrDiff = generify(pointwise((a, b) => (a - b) * (a - b), f, g), f).all();
  return Math.sqrt(mean(sqrDiff));
}

export function nrmsd(f, g) {
  return rmsd(f, g) / (Math.max(...f) - Math.min(...f));
}

/* generators */

export function* pointwise(operation, ...functions) {
  for (let i = 0; i < functions[0].length; i++) {
    let ifunction = (i) => functions.map(array => array[i]);
    yield operation(...ifunction(i));
  }
}

export function* rolling(operation, window, array) {
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    yield operation(array.slice((j > 0) ? j : 0, i + 1));
  }
}

export function* trueRange($high, $low, $close) {
  yield [$high[0] - $low[0]];
  for (let i = 1; i < $low.length; i++) {
    yield Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1]));
  }
}

export function generify(generator, objectWithLength) {
  let i = 0;
  return {
    next: () => {
      i++;
      return generator.next();
    },
    update: () => {
      let update = [];
      while(i++ < objectWithLength.length) {
        update.push(generator.next().value);
      }
      return update;
    },
    all: () => {
      let result = [];
      for(let x of generator) {
        result.push(x)
      }
      return result;
    }
  }
}