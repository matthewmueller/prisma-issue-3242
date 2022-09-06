# Prisma Upsert Race Condition

This is a reproduction for https://github.com/prisma/prisma/issues/3242 on PostgreSQL. It compares the difference between node-pg and Prisma.

## Installation

```sh
git clone github.com/matthewmueller/prisma-issue-3242
npm install
export DATABASE_URL="postgres://..."
npx prisma db push
npx ts-node main.ts
```

## Expectation

You'd expect the script to run without any errors. If you run it a few times you should encounter is the following:

```sh
Invalid `promises.push(prisma.test.upsert()` invocation in
prisma/issue-3242/main.ts:31:31

  28   create: { testId: `prisma-${i}` },
  29   update: {},
  30 }))
→ 31 promises.push(prisma.test.upsert(
Unique constraint failed on the fields: (`testId`)
    at RequestHandler.handleRequestError (prisma/issue-3242/node_modules/@prisma/client/runtime/index.js:29909:13)
    at RequestHandler.request (prisma/issue-3242/node_modules/@prisma/client/runtime/index.js:29892:12)
    at async PrismaClient._request (prisma/issue-3242/node_modules/@prisma/client/runtime/index.js:30864:16)
    at async Promise.all (index 7) {
  code: 'P2002',
  clientVersion: '4.3.1',
  meta: { target: [ 'testId' ] }
}
```

This occurs because Prisma ran SELECTs on the same unique constraint concurrently, saw that it wasn't there and races to INSERT that value into the database. This error is the result of the 2nd insert failing a unique constraint violation.

This doesn't occur in node-pg because you can issue a single query to PostgreSQL that atomically inserts or updates:

> ON CONFLICT DO UPDATE guarantees an atomic INSERT or UPDATE outcome; provided there is no independent error, one of those two outcomes is guaranteed, even under high concurrency. This is also known as UPSERT — “UPDATE or INSERT”.

([source](https://www.postgresql.org/docs/current/sql-insert.html))
