import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import process from 'node:process'

const databaseUrl =
  process.env.SCREENSHOTS_DATABASE_URL ??
  'postgresql://localco:localco_dev@localhost:5432/localco_screenshots'
const database = new URL(databaseUrl)
const databaseName = database.pathname.replace(/^\//, '')
const adminEmail =
  process.env.SCREENSHOTS_ADMIN_EMAIL ?? 'portfolio.admin@example.test'
const adminPassword =
  process.env.SCREENSHOTS_ADMIN_PASSWORD ??
  `Portfolio-${randomBytes(18).toString('base64url')}!`
const authSecret = randomBytes(32).toString('base64url')

assertSafeDatabase(database, databaseName)

run('docker', ['compose', 'up', '-d', 'postgres'])

const databaseExists = run(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'localco',
    '-d',
    'postgres',
    '-tAc',
    `SELECT 1 FROM pg_database WHERE datname='${databaseName}'`,
  ],
  { capture: true },
).trim()

if (databaseExists !== '1') {
  run('docker', [
    'compose',
    'exec',
    '-T',
    'postgres',
    'createdb',
    '-U',
    'localco',
    databaseName,
  ])
}

const screenshotEnvironment = {
  ...process.env,
  CI: 'true',
  DATABASE_URL: databaseUrl,
  BOOTSTRAP_USER_EMAIL: adminEmail,
  BOOTSTRAP_USER_PASSWORD: adminPassword,
  BOOTSTRAP_USER_NAME: 'Portfolio Admin',
  BOOTSTRAP_USER_ROLE: 'admin',
  SCREENSHOTS_ADMIN_EMAIL: adminEmail,
  SCREENSHOTS_ADMIN_PASSWORD: adminPassword,
  SCREENSHOTS_AUTH_SECRET: authSecret,
  BETTER_AUTH_SECRET: authSecret,
  BETTER_AUTH_URL: 'http://127.0.0.1:4200',
  API_INTERNAL_URL: 'http://127.0.0.1:4400/api',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4200/api',
  NEXT_PUBLIC_AUTH_URL: 'http://127.0.0.1:4200',
}

run('pnpm', ['--filter', '@localco/api', 'db:deploy'], {
  env: screenshotEnvironment,
})
run('pnpm', ['--filter', '@localco/api', 'seed'], {
  env: screenshotEnvironment,
})
run('pnpm', ['--filter', '@localco/api', 'seed:screenshots'], {
  env: screenshotEnvironment,
})
run('pnpm', ['--filter', '@localco/web', 'bootstrap:user'], {
  env: screenshotEnvironment,
})
run('pnpm', ['--filter', '@localco/api', 'build'], {
  env: screenshotEnvironment,
})
run('pnpm', ['--filter', '@localco/web', 'build'], {
  env: screenshotEnvironment,
})
run('pnpm', ['--filter', '@localco/shop', 'build'], {
  env: {
    ...screenshotEnvironment,
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4201/api',
  },
})
run('pnpm', ['--filter', '@localco/shop', 'screenshots:run'], {
  env: screenshotEnvironment,
})

function assertSafeDatabase(databaseUrl, name) {
  const isLocalHost = ['localhost', '127.0.0.1'].includes(databaseUrl.hostname)

  if (!isLocalHost || !/screenshots?/i.test(name)) {
    throw new Error(
      'Screenshot generation refused: use a local database whose name contains "screenshot"',
    )
  }
}

function run(command, args, options = {}) {
  const usePnpmEntrypoint = command === 'pnpm' && process.env.npm_execpath
  const executable = usePnpmEntrypoint ? process.execPath : command
  const executableArgs = usePnpmEntrypoint
    ? [process.env.npm_execpath, ...args]
    : args
  const result = spawnSync(executable, executableArgs, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  }

  return options.capture ? result.stdout ?? '' : ''
}
