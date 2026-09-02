export const ORDER_CLOCK = Symbol('ORDER_CLOCK')

export type OrderClock = {
  now: () => Date
}

export const systemOrderClock: OrderClock = {
  now: () => new Date(),
}
