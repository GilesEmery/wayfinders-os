import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
export function load(file, imports, source) {
  const exports = {};
  const code = ts.transpileModule(source ?? readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require(name) { if (name === 'server-only') return {}; if (!(name in imports)) throw new Error(`Unmocked import: ${name}`); return imports[name]; }, Date, Map, Set, Promise, console });
  return exports;
}
