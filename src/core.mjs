export function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}

export function sd(array) {
  //const correction = (array.length > 1) ? Math.sqrt(array.length / (array.length - 1)) : 1;
  return rmsd(array, new Array(array.length).fill(mean(array)));
}

export function rmsd(f, g) {
  const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}

export function nrmsd(f, g) {
  return rmsd(f, g) / (Math.max(...f) - Math.min(...f));
}

export function pointwise(operation, ...args) {
  let result = [];
  for (let i = 0; i < args[0].length; i++) {
    let iargs = (i) => args.map(array => array[i]);
    result[i] = operation(...iargs(i));
  }
  return result;
}

export function rolling(operation, window, array) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}