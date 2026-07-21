import {db} from "@/lib/server/database/db";
import {AsyncLocalStorage} from "node:async_hooks";
import * as schema from "@/lib/server/database/schema";
import {ExtractTablesWithRelations} from "drizzle-orm";
import {SQLiteBunTransaction} from "drizzle-orm/bun-sqlite";


export type TransactionClient = SQLiteBunTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

const dbTransactionLocalStorage = new AsyncLocalStorage<TransactionClient>();


export const getDbClient = () => {
    const transactionalClient = dbTransactionLocalStorage.getStore();
    return transactionalClient || db;
};


export const withTransaction = async <T>(action: (tx: TransactionClient) => Promise<T>) => {
    const existingTransaction = dbTransactionLocalStorage.getStore();
    if (existingTransaction) {
        return action(existingTransaction);
    }

    const result = await db.transaction(async (tx) => {
        const handlerResult = await dbTransactionLocalStorage.run(tx, async () => await action(tx));
        return handlerResult;
    });

    return result;
};
