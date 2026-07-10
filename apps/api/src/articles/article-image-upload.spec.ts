import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { ensureArticleImageUploadDir } from './article-image-upload'

describe('article image upload directory', () => {
  let temporaryDirectory: string

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'article-uploads-'))
  })

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  })

  it('creates the configured article directory', () => {
    const directory = join(temporaryDirectory, 'uploads', 'articles')

    expect(() => ensureArticleImageUploadDir(directory)).not.toThrow()
  })

  it('fails startup when the configured path cannot be created', () => {
    const blockingFile = join(temporaryDirectory, 'not-a-directory')
    writeFileSync(blockingFile, 'blocked')

    expect(() =>
      ensureArticleImageUploadDir(join(blockingFile, 'articles')),
    ).toThrow()
  })
})
