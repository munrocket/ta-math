import babel from "rollup-plugin-babel";
import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";

const tsconfig = {
  compilerOptions: {
    target: "es6",
    module: "es6",
    moduleResolution: "node",
    noImplicitAny: true,
    removeComments: true,
    preserveConstEnums: true,
    outDir: "./dist",
    sourceMap: false,
    declaration: true,
    esModuleInterop: true,
    lib: ["es6", "dom"],
  },
  include: ["src/**/*.ts"],
  exclude: ["node_modules", "**/*.spec.ts"],
};

export default [
  {
    /* es5 */ input: "src/index.ts",
    output: { file: pkg.browser, name: "TA", format: "iife" },
    plugins: [
      typescript({ tsconfigOverride: tsconfig }),
      babel({ exclude: "node_modules/**" }),
    ],
  },

  {
    /* es6/esm */ input: "src/index.ts",
    output: [
      { file: pkg.main, name: "TA", format: "umd" },
      { file: pkg.module, format: "esm", sourcemap: "inline" },
    ],
    plugins: [typescript({ tsconfigOverride: tsconfig })],
  },

  {
    /* temp4test */ input: "src/core.ts",
    output: { file: "temp/core.js", format: "esm", sourcemap: "inline" },
    plugins: [typescript({ tsconfigOverride: tsconfig })],
  },
];
