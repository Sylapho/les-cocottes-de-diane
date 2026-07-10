import { join, resolve } from 'path'
import {
  resolveArticleUploadsDirectory,
  resolveUploadsRoot,
} from './uploads-path'

describe('uploads paths', () => {
  const cwd = join('workspace', 'apps', 'api')

  it('uses UPLOADS_DIR when configured', () => {
    expect(resolveUploadsRoot({ UPLOADS_DIR: '/app/uploads' }, cwd)).toBe(
      resolve('/app/uploads'),
    )
  })

  it('resolves a relative UPLOADS_DIR from the working directory', () => {
    expect(resolveUploadsRoot({ UPLOADS_DIR: 'shared/uploads' }, cwd)).toBe(
      resolve(cwd, 'shared/uploads'),
    )
  })

  it('falls back to the legacy working-directory location', () => {
    expect(resolveUploadsRoot({ UPLOADS_DIR: '  ' }, cwd)).toBe(
      resolve(cwd, 'uploads'),
    )
  })

  it('keeps article uploads under the configured root', () => {
    expect(
      resolveArticleUploadsDirectory({ UPLOADS_DIR: '/app/uploads' }, cwd),
    ).toBe(join(resolve('/app/uploads'), 'articles'))
  })
})
