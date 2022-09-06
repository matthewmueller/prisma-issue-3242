import { PrismaClient } from '@prisma/client'
import * as pg from 'pg'
import envp from 'envp'

// Load the environment
const env = envp({
  DATABASE_URL: String
})

// Initialize Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  },
  // log: ["query"],
})

// Initialize a Postgres Pool
const pgPool = new pg.Pool({
  connectionString: env.DATABASE_URL
})

// Prisma under test
async function prismaUpsert(prisma: PrismaClient) {
  const promises: any[] = []
  // Try upserting the same ID twice 10 times concurrently
  for (let i = 0; i < 10; i++) {
    promises.push(prisma.test.upsert({
      where: { testId: `prisma-${i}` },
      create: { testId: `prisma-${i}` },
      update: {},
    }))
    promises.push(prisma.test.upsert({
      where: { testId: `prisma-${i}` },
      create: { testId: `prisma-${i}` },
      update: {},
    }))
  }
  return Promise.all(promises);
}

// PostgreSQL under test
async function pgUpsert(client: pg.PoolClient) {
  const promises: any[] = []
  // Try upserting the same ID twice 10 times concurrently
  for (let i = 0; i < 10; i++) {
    promises.push(client.query(`
      insert into "Test" ("testId") values ($1)
      on conflict ("testId") do update
      set "testId" = $1
    `, [`pg-${i}`]))
    promises.push(client.query(`
      insert into "Test" ("testId") values ($1)
      on conflict ("testId") do update
      set "testId" = $1
    `, [`pg-${i}`]))
  }
  return Promise.all(promises);
}

async function main() {
  console.log('truncating')
  let pgClient = await pgPool.connect()
  pgClient.query(`truncate "Test"`)
  pgClient.release()
  console.log('truncated')

  // Run with pg
  console.log("pg: connecting")
  pgClient = await pgPool.connect()
  try {
    console.log("pg: upserting")
    await pgUpsert(pgClient)
    console.log("pg: upserted")
  } catch (err) {
    console.error("pg:", err)
  }
  // console.log((await pgClient.query(`select * from "Test";`)).rows)
  console.log("pg: disconnecting")
  pgClient.release()
  await pgPool.end()
  console.log("pg: disconnected")

  // Run with Prisma
  try {
    console.log("prisma: connecting")
    await prisma.$connect()
    console.log("prisma: upserting")
    await prismaUpsert(prisma)
    console.log("prisma: upserted")
  } catch (err) {
    console.error("prisma: error", err)
  }
  // console.log(await prisma.test.findMany())
  console.log("prisma: disconnecting")
  await prisma.$disconnect()
  console.log("prisma: disconnected")
}

main().catch(err => console.error(err))
