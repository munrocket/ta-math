import builtins from 'rollup-plugin-node-builtins';
import babel from 'rollup-plugin-babel';
import istanbul from 'rollup-plugin-istanbul';
import pkg from './package.json';

export default [
	{
		input: 'src/main.js',
		output: { name: 'TA', file: pkg.browser, format: 'iife' },
		plugins: [
			babel({
				exclude: 'node_modules/**'
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
		input: 'test/test.js',
		output: { file: 'coverage/test.js', format: 'cjs', sourcemap: 'inline' },
		plugins: [
			builtins(),
			istanbul({
				exclude: ['dist']
			})
		]
	}
];