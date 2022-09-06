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
