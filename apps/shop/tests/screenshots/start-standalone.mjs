import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const appName = process.argv[2]

if (!['web', 'shop'].includes(appName)) {
  throw new Error('Expected standalone app name: web or shop')
}

const shopRoot = process.cwd()
const repoRoot = path.resolve(shopRoot, '../..')
const appRoot = path.join(repoRoot, 'apps', appName)
const standaloneRoot = path.join(
  appRoot,
  '.next',
  'standalone',
  'apps',
  appName,
)

copyDirectory(
  path.join(appRoot, '.next', 'static'),
  path.join(standaloneRoot, '.next', 'static'),
)
copyDirectory(path.join(appRoot, 'public'), path.join(standaloneRoot, 'public'))

const require = createRequire(import.meta.url)
require(path.join(standaloneRoot, 'server.js'))

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) return

  fs.rmSync(target, { recursive: true, force: true })
  fs.cpSync(source, target, { recursive: true })
}
