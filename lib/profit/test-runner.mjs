import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'

const files = process.argv.slice(2)

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const resolved = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectTestFiles(resolved))
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      results.push(path.relative(process.cwd(), resolved))
    }
  }

  return results
}

const testFiles = files.length > 0 ? files : collectTestFiles(path.resolve('lib'))

const typecheck = spawnSync(
  process.execPath,
  [path.resolve('node_modules/typescript/bin/tsc'), '-p', path.resolve('tsconfig.json'), '--noEmit', '--pretty', 'false'],
  { stdio: 'inherit' },
)

if (typecheck.status !== 0) {
  process.exit(typecheck.status ?? 1)
}

const registerPath = path.resolve('lib/profit/test-register.mjs')
const runtime = spawnSync(process.execPath, ['--import', registerPath, '--test', ...testFiles], {
  stdio: 'inherit',
})

process.exit(runtime.status ?? 1)
