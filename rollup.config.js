import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import { builtinModules } from "module";
import pkg from "./package.json";

const input = "src/index.ts";
const external = Object.keys({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
}).concat([...builtinModules, "svelte/compiler"]);

/**
 * @returns {import('rollup').RollupOptions}
 */
export default [
  {
    plugins: [esbuild()],
    input,
    external,
    output: [
      {
        format: "cjs",
        file: pkg.main,
        exports: "named",
        footer: "module.exports = Object.assign(exports.default, exports);",
        sourcemap: true,
      },
      {
        format: "esm",
        file: pkg.module,
        sourcemap: true,
      },
    ],
  },
  {
    plugins: [dts()],
    input,
    external,
    output: {
      file: pkg.types,
      format: "es",
    },
  },
];
