import builtins from 'rollup-plugin-node-builtins';
import babel from 'rollup-plugin-babel';
import istanbul from 'rollup-plugin-istanbul';
import pkg from './package.json';

export default [
	{
		input: 'src/main.js',
		output: [
			{ name: 'ta-math', file: pkg.browser, format: 'umd' }
		],
		plugins: [
			babel({
				exclude: 'node_modules/**',
				plugins: "external-helpers"
			})
		]
	},
	{
		input: 'src/main.js',
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'esm' }
		]
	},
	{
		input: 'src/test.js',
		external: ['tape', 'tape-spec'],
		output: [
			{ file: 'test/test.js', format: 'cjs' }
		],
		plugins: [
			builtins(),
			istanbul({
				exclude: ['test/*.js']
			})
		]
	}
];