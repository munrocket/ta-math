import babel from 'rollup-plugin-babel';
import pkg from './package.json';
import typescript from 'rollup-plugin-typescript2';

const tsconfig = {
  'compilerOptions': {
    'target': 'es6',
    'module': 'es6',
    'moduleResolution': 'node',
    'noImplicitAny': true,
    'removeComments': true,
    'preserveConstEnums': true,
    'outDir': './dist',
		'sourceMap': false,
		'declaration': false,
		"moduleResolution": "node",
		"esModuleInterop": true,
    'lib': ['es6', 'dom']
  },
  'include': ['src/**/*.ts'],
  'exclude': ['node_modules', '**/*.spec.ts']
}

export default [
	{
		input: 'src/index.ts',
		output: { file: pkg.browser, name: 'TA', format: 'iife' },
		plugins: [
			typescript({ tsconfigOverride: tsconfig }),
			babel({ exclude: 'node_modules/**' })
		]
	},
	{
		input: 'src/index.ts',
		output: [
			{ file: pkg.main, name: 'TA', format: 'umd' },
			{ file: pkg.module, format: 'esm', sourcemap: 'inline' }
		],
		plugins: [ typescript({ tsconfigOverride: tsconfig }) ]
	},
	{
		input: 'test/test.ts',
		output: { file: 'test/test.js', format: 'esm', sourcemap: 'inline' },
		plugins: [ typescript({ tsconfigOverride: tsconfig }) ]
	}
];