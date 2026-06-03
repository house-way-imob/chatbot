import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { customers } from '../../../db/schema'
import type { Customer } from './model'

export async function insertCustomer(customer: Customer) {
  return await db.insert(customers).values(customer)
}

export async function findCustomer(phone: string) {
  return await db.query.customers.findFirst({
    where: eq(customers.phone, phone),
  })
}
