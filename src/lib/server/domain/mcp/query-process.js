import Database from "bun:sqlite";


// This trusted program is bundled as text and executed in a disposable process.
// Only the scoped snapshot and query arrive over stdin; app configuration is absent.
try {
    const input = new Uint8Array(await Bun.stdin.arrayBuffer());

    const separator = input.indexOf(10);
    const {sql, parameters, maxRows, maxResponseBytes, sqliteHeapBytes} = JSON.parse(new TextDecoder().decode(input.subarray(0, separator)));

    using db = Database.deserialize(input.subarray(separator + 1), {readonly: true, strict: true, safeIntegers: true});

    db.run(`PRAGMA hard_heap_limit = ${sqliteHeapBytes}`);
    db.run("PRAGMA temp_store = MEMORY");
    db.run("PRAGMA trusted_schema = OFF");
    db.run("PRAGMA query_only = ON");

    const startedAt = performance.now();

    using statement = db.prepare(sql);
    const columns = statement.columnNames;
    if (new Set(columns).size !== columns.length) {
        throw new Error("Use distinct aliases for result columns with the same name.");
    }

    const rows = [];
    let truncated = false;
    let responseBytes = Buffer.byteLength(JSON.stringify({columns, rows, truncated})) + 256;

    for (const record of statement.iterate(parameters)) {
        if (rows.length === maxRows) {
            truncated = true;
            break;
        }

        const row = columns.map(column => {
            const value = record[column];

            if (typeof value === "bigint") {
                return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER ? Number(value) : String(value);
            }

            if (value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
                return value;
            }

            throw new Error("Return text or finite numbers; binary results are unavailable.");
        });

        // Reject large text before JSON escaping can allocate much larger string
        let rowBytes = row.reduce((bytes, value) => bytes + (typeof value === "string" ? Buffer.byteLength(value) : 0), 0);
        if (responseBytes + rowBytes <= maxResponseBytes) {
            rowBytes = Buffer.byteLength(JSON.stringify(row)) + 1;
        }

        if (responseBytes + rowBytes > maxResponseBytes) {
            if (rows.length === 0) throw new Error("A result row exceeds the response limit. Select smaller values or fewer columns.");
            truncated = true;
            break;
        }

        rows.push(row);
        responseBytes += rowBytes;
    }

    console.log(JSON.stringify({columns, rows, truncated, queryMs: performance.now() - startedAt}));
} catch (error) {
    console.log(JSON.stringify({error: String(error.message).slice(0, 500)}));
}
