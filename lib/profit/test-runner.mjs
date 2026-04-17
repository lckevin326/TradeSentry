import { spawnSync } from 'node:child_process'
import path from 'node:path'

const files = process.argv.slice(2)
const testFiles = files.length > 0 ? files : ['lib/profit/profit.test.ts']

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
