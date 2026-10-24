import {CString, dlopen, ptr} from "bun:ffi";


// This trusted program runs in a disposable process. Use system SQLite because
// Bun's SQLite disables memory accounting, which makes hard_heap_limit a no-op.
// Only the scoped snapshot and query arrive over stdin; app configuration is absent.
try {
    const input = new Uint8Array(await Bun.stdin.arrayBuffer());
    const separator = input.indexOf(10);
    const {sql, parameters, maxRows, maxResponseBytes, sqliteHeapBytes} = JSON.parse(new TextDecoder().decode(input.subarray(0, separator)));
    const library = process.platform === "darwin" ? "/usr/lib/libsqlite3.dylib"
        : process.platform === "win32" ? "sqlite3.dll" : "libsqlite3.so.0";
    const {symbols: sqlite} = dlopen(library, {
        sqlite3_memory_used: {args: [], returns: "i64"},
        sqlite3_hard_heap_limit64: {args: ["i64"], returns: "i64"},
        sqlite3_open: {args: ["cstring", "ptr"], returns: "i32"},
        sqlite3_close: {args: ["ptr"], returns: "i32"},
        sqlite3_deserialize: {args: ["ptr", "cstring", "ptr", "i64", "i64", "u32"], returns: "i32"},
        sqlite3_exec: {args: ["ptr", "cstring", "ptr", "ptr", "ptr"], returns: "i32"},
        sqlite3_errmsg: {args: ["ptr"], returns: "cstring"},
        sqlite3_prepare_v2: {args: ["ptr", "cstring", "i32", "ptr", "ptr"], returns: "i32"},
        sqlite3_finalize: {args: ["ptr"], returns: "i32"},
        sqlite3_bind_parameter_count: {args: ["ptr"], returns: "i32"},
        sqlite3_bind_parameter_name: {args: ["ptr", "i32"], returns: "cstring"},
        sqlite3_bind_null: {args: ["ptr", "i32"], returns: "i32"},
        sqlite3_bind_double: {args: ["ptr", "i32", "f64"], returns: "i32"},
        sqlite3_bind_text: {args: ["ptr", "i32", "cstring", "i32", "ptr"], returns: "i32"},
        sqlite3_step: {args: ["ptr"], returns: "i32"},
        sqlite3_column_count: {args: ["ptr"], returns: "i32"},
        sqlite3_column_name: {args: ["ptr", "i32"], returns: "cstring"},
        sqlite3_column_type: {args: ["ptr", "i32"], returns: "i32"},
        sqlite3_column_int64: {args: ["ptr", "i32"], returns: "i64"},
        sqlite3_column_double: {args: ["ptr", "i32"], returns: "f64"},
        sqlite3_column_text: {args: ["ptr", "i32"], returns: "ptr"},
        sqlite3_column_bytes: {args: ["ptr", "i32"], returns: "i32"},
    });
    const cstring = (value) => Buffer.from(value + "\0");
    sqlite.sqlite3_hard_heap_limit64(BigInt(sqliteHeapBytes));

    const handle = new BigUint64Array(1);
    const opened = sqlite.sqlite3_open(cstring(":memory:"), ptr(handle));
    const db = Number(handle[0]);
    const check = (code) => {
        if (code !== 0) throw new Error(String(sqlite.sqlite3_errmsg(db)));
    };
    let statement = 0;
    const retainedBuffers = [input];
    try {
        check(opened);
        // Refuse libraries built without memory accounting: their heap cap is inert.
        if (sqlite.sqlite3_memory_used() <= 0n) throw new Error("System SQLite must have memory accounting enabled to enforce the query heap limit.");
        const snapshot = input.subarray(separator + 1);
        // SQLITE_DESERIALIZE_READONLY; input owns the snapshot until close.
        check(sqlite.sqlite3_deserialize(db, cstring("main"), ptr(snapshot), BigInt(snapshot.length), BigInt(snapshot.length), 4));
        check(sqlite.sqlite3_exec(db, cstring("PRAGMA temp_store=MEMORY; PRAGMA trusted_schema=OFF; PRAGMA query_only=ON;"), null, null, null));
        const startedAt = performance.now();
        const prepared = new BigUint64Array(1);
        const sqlBytes = cstring(sql);
        const preparation = sqlite.sqlite3_prepare_v2(db, sqlBytes, sqlBytes.length - 1, ptr(prepared), null);
        statement = Number(prepared[0]);
        check(preparation);
        for (let index = 1; index <= sqlite.sqlite3_bind_parameter_count(statement); index++) {
            const name = String(sqlite.sqlite3_bind_parameter_name(statement, index)).slice(1);
            if (!Object.hasOwn(parameters, name)) throw new Error(`Missing query parameter: ${name}`);
            const value = parameters[name];
            if (value === null) check(sqlite.sqlite3_bind_null(statement, index));
            else if (typeof value === "number") check(sqlite.sqlite3_bind_double(statement, index, value));
            else {
                const bytes = cstring(value);
                retainedBuffers.push(bytes);
                // SQLITE_STATIC: retain the buffers until the statement is finalized.
                check(sqlite.sqlite3_bind_text(statement, index, bytes, bytes.length - 1, null));
            }
        }

        const columns = Array.from({length: sqlite.sqlite3_column_count(statement)}, (_, index) => String(sqlite.sqlite3_column_name(statement, index)));
        if (new Set(columns).size !== columns.length) throw new Error("Use distinct aliases for result columns with the same name.");
        const rows = [];
        let truncated = false;
        let responseBytes = Buffer.byteLength(JSON.stringify({columns, rows, truncated})) + 256;
        let status;
        while ((status = sqlite.sqlite3_step(statement)) === 100) { // SQLITE_ROW
            if (rows.length === maxRows) {
                truncated = true;
                break;
            }
            const row = columns.map((_, index) => {
                switch (sqlite.sqlite3_column_type(statement, index)) {
                    case 1: { // SQLITE_INTEGER
                        const value = sqlite.sqlite3_column_int64(statement, index);
                        return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER ? Number(value) : String(value);
                    }
                    case 2: { // SQLITE_FLOAT
                        const value = sqlite.sqlite3_column_double(statement, index);
                        if (!Number.isFinite(value)) throw new Error("Return text or finite numbers; binary results are unavailable.");
                        return value;
                    }
                    case 3: { // SQLITE_TEXT
                        const text = sqlite.sqlite3_column_text(statement, index);
                        if (!text) check(7); // SQLITE_NOMEM during text conversion
                        return String(new CString(text, 0, sqlite.sqlite3_column_bytes(statement, index)));
                    }
                    case 5: // SQLITE_NULL
                        return null;
                    default:
                        throw new Error("Return text or finite numbers; binary results are unavailable.");
                }
            });

            // Reject large text before JSON escaping can allocate much larger strings.
            let rowBytes = row.reduce((bytes, value) => bytes + (typeof value === "string" ? Buffer.byteLength(value) : 0), 0);
            if (responseBytes + rowBytes <= maxResponseBytes) rowBytes = Buffer.byteLength(JSON.stringify(row)) + 1;
            if (responseBytes + rowBytes > maxResponseBytes) {
                if (rows.length === 0) throw new Error("A result row exceeds the response limit. Select smaller values or fewer columns.");
                truncated = true;
                break;
            }
            rows.push(row);
            responseBytes += rowBytes;
        }
        if (!truncated && status !== 101) check(status); // SQLITE_DONE
        console.log(JSON.stringify({columns, rows, truncated, queryMs: performance.now() - startedAt}));
    }
    finally {
        if (statement) sqlite.sqlite3_finalize(statement);
        sqlite.sqlite3_close(db);
        retainedBuffers.length = 0;
    }
} catch (error) {
    console.log(JSON.stringify({error: String(error.message).slice(0, 500)}));
}
