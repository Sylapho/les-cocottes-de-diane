import { Test } from '@nestjs/testing'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { BetterAuthGuard } from '../../src/auth/better-auth.guard'
import { configureApp } from '../../src/bootstrap/configure-app'
import { AppModule } from '../../src/app.module'
import { EmailsService } from '../../src/emails/emails.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { StripeCheckoutGateway } from '../../src/commandes/stripe-checkout.gateway'
import { E2eBetterAuthGuard } from './auth'
import { prepareE2eEnvironment } from './database'
import { FakeEmailsService } from './fake-emails.service'
import { FakeStripeCheckoutGateway } from './fake-stripe-checkout.gateway'
import { ORDER_CLOCK } from '../../src/commandes/order-clock'

export type E2eTestApp = {
  app: NestExpressApplication
  prisma: PrismaService
  emails: FakeEmailsService
  stripe: FakeStripeCheckoutGateway
}

type CreateTestAppOptions = {
  orderNow?: Date
}

export async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<E2eTestApp> {
  prepareE2eEnvironment()

  const emails = new FakeEmailsService()
  const stripe = new FakeStripeCheckoutGateway()

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailsService)
    .useValue(emails)
    .overrideProvider(StripeCheckoutGateway)
    .useValue(stripe)
    .overrideGuard(BetterAuthGuard)
    .useClass(E2eBetterAuthGuard)

  if (options.orderNow) {
    const orderNow = new Date(options.orderNow)
    moduleBuilder.overrideProvider(ORDER_CLOCK).useValue({
      now: () => new Date(orderNow),
    })
  }

  const moduleFixture = await moduleBuilder.compile()

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    rawBody: true,
  })
  configureApp(app)
  await app.init()

  return {
    app,
    prisma: app.get(PrismaService),
    emails,
    stripe,
  }
}
