import { join, resolve } from 'path'

export const UPLOADS_PUBLIC_PREFIX = '/uploads/'

export function resolveUploadsRoot(
  environment: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  const configuredPath = environment.UPLOADS_DIR?.trim()

  return resolve(cwd, configuredPath || 'uploads')
}

export function resolveArticleUploadsDirectory(
  environment: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  return join(resolveUploadsRoot(environment, cwd), 'articles')
}

export const UPLOADS_ROOT = resolveUploadsRoot()
export const ARTICLE_UPLOADS_DIRECTORY = resolveArticleUploadsDirectory()
