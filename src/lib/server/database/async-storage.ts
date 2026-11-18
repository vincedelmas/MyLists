import {db} from "@/lib/server/database/db";
import {isAsyncFunction} from "node:util/types";
import {AsyncLocalStorage} from "node:async_hooks";


type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ActionType<T> = (tx: TransactionClient) => T & (T extends PromiseLike<unknown> ? never : unknown);


const dbTransactionLocalStorage = new AsyncLocalStorage<TransactionClient>();


export const getDbClient = () => {
    const transactionalClient = dbTransactionLocalStorage.getStore();
    return transactionalClient || db;
};


// Bun SQLite commits when callback returns. Promises must never escape transaction callback.
export const withTransaction = <T>(action: ActionType<T>) => {
    if (isAsyncFunction(action)) {
        throw new TypeError("Transaction callbacks must be synchronous");
    }

    const run = (tx: TransactionClient) => {
        const result = action(tx);
        if (result != null && typeof (result as { then?: unknown }).then === "function") {
            throw new TypeError("Transaction callbacks must return synchronous result; execute Drizzle queries " +
                "with .run(), .get(), or .all()");
        }

        return result;
    };

    const existingTransaction = dbTransactionLocalStorage.getStore();
    if (existingTransaction) {
        return run(existingTransaction);
    }

    // Acquire the write lock before reading to avoid snapshot upgrade failures.
    return db
        .transaction((tx) => {
            return { value: dbTransactionLocalStorage.run(tx, () => run(tx)) };
        }, { behavior: "immediate" }).value;
};
