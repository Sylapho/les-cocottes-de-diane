import request from 'supertest'
import { ROLES } from '../src/auth/roles'
import { createArticle } from './fixtures/articles'
import { authAs } from './helpers/auth'
import { createTestApp, E2eTestApp } from './helpers/create-test-app'
import { truncateBusinessTables } from './helpers/database'

describe('API E2E - article permissions', () => {
  let testApp: E2eTestApp

  beforeAll(async () => {
    testApp = await createTestApp()
  })

  beforeEach(async () => {
    await truncateBusinessTables(testApp.prisma)
  })

  afterAll(async () => {
    await testApp.app.close()
  })

  it('allows an administrator to update the price and delete an article', async () => {
    const article = await createArticle(testApp.prisma, { prixCents: 500 })

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.ADMIN))
      .send({ prixCents: 650 })
      .expect(200)

    expect(
      await testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      }),
    ).toMatchObject({ prixCents: 650 })

    await request(testApp.app.getHttpServer())
      .delete(`/api/articles/${article.id}`)
      .set(authAs(ROLES.ADMIN))
      .expect(200)

    await expect(
      testApp.prisma.article.findUnique({ where: { id: article.id } }),
    ).resolves.toBeNull()
  })

  it('allows a manager to update non-price fields', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Article initial',
      prixCents: 500,
    })

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .send({ nom: 'Article renommÃ©', online: false })
      .expect(200)

    expect(
      await testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      }),
    ).toMatchObject({
      nom: 'Article renommÃ©',
      prixCents: 500,
      online: false,
    })
  })

  it('accepts an unchanged price sent by a manager form', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Article initial',
      prixCents: 500,
    })

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .send({ nom: 'Article renommÃ©', prixCents: 500 })
      .expect(200)

    expect(
      await testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      }),
    ).toMatchObject({ nom: 'Article renommÃ©', prixCents: 500 })
  })

  it('rejects a combined manager price change atomically', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Article initial',
      prixCents: 500,
    })

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .send({ nom: 'Modification interdite', prixCents: 650 })
      .expect(403)

    expect(
      await testApp.prisma.article.findUniqueOrThrow({
        where: { id: article.id },
      }),
    ).toMatchObject({ nom: 'Article initial', prixCents: 500 })
  })

  it('rejects manager deletion without changing persisted data', async () => {
    const article = await createArticle(testApp.prisma, {
      nom: 'Article protÃ©gÃ©',
      prixCents: 500,
    })

    await request(testApp.app.getHttpServer())
      .delete(`/api/articles/${article.id}`)
      .set(authAs(ROLES.GERANT))
      .expect(403)

    await expect(
      testApp.prisma.article.findUnique({ where: { id: article.id } }),
    ).resolves.toMatchObject({ nom: 'Article protÃ©gÃ©', prixCents: 500 })
  })

  it('keeps unauthenticated and unrelated roles rejected', async () => {
    const article = await createArticle(testApp.prisma)

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .send({ nom: 'Non authentifiÃ©' })
      .expect(401)

    await request(testApp.app.getHttpServer())
      .patch(`/api/articles/${article.id}`)
      .set(authAs(ROLES.VENDEUR))
      .send({ nom: 'Vendeur' })
      .expect(403)
  })
})
