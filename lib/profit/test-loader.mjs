import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']

export async function resolve(specifier, context, defaultResolve) {
  if (
    (specifier.startsWith('./') ||
      specifier.startsWith('../') ||
      specifier.startsWith('/')) &&
    !specifier.match(/\.[a-z]+$/i)
  ) {
    for (const extension of EXTENSIONS) {
      try {
        return await defaultResolve(`${specifier}${extension}`, context, defaultResolve)
      } catch {
        // Try the next extension.
      }
    }
  }

  return defaultResolve(specifier, context, defaultResolve)
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx') || url.endsWith('.mts') || url.endsWith('.cts')) {
    const filename = fileURLToPath(url)
    const source = await readFile(filename, 'utf8')
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    })

    return {
      format: 'module',
      source: outputText,
      shortCircuit: true,
    }
  }

  return defaultLoad(url, context, defaultLoad)
}
