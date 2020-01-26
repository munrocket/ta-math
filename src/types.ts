/* Structs for AssemblyScript */

export type float = f64;
export type int = i32;

export class LineSignalStruct {
  line: Array<float>;
  signal: Array<float>;
}

export class PlusMinusStruct {
  plus: Array<float>;
  minus: Array<float>;
}

export class BandStruct {
  lower: Array<float>;
  middle: Array<float>;
  upper: Array<float>;
}

export class MacdStruct {
  line: Array<float>;
  signal: Array<float>;
  hist: Array<float>;
}

export class AdxStruct {
  dip: Array<float>;
  dim: Array<float>;
  adx: Array<float>;
}

export class ZigzagStruct {
  time: Array<float>;
  price: Array<float>;
}

export class VbpStruct {
  bottom: float;
  top: float;
  volumes: Array<float>;
}