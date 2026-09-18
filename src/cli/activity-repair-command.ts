import {z} from "zod";
import Database from "bun:sqlite";
import {randomUUID} from "node:crypto";
import {Command, Option} from "commander";
import {MediaType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/formatting/number";
import {basename, dirname, join, resolve} from "node:path";
import {mkdirSync, readFileSync, realpathSync, writeFileSync} from "node:fs";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {type ActivityRepairAudit, applyActivityRepairs, auditActivityRepair} from "@/lib/server/domain/tracking/activity-repair";


const savedReportSchema = z.object({
    databasePath: z.string(),
    version: z.literal(1),
    entries: z.array(z.object({ id: z.string() }).loose()),
});


function formatProgress(mediaType: MediaType, value: number | null) {
    if (value === null) return "unavailable";

    const { unit, timing } = getMediaDefinition(mediaType).progress;
    const formatted = formatNumber(value, { locale: "en", maximumFractionDigits: 6 });

    if (timing.kind === "stored-minutes") {
        return `${formatNumber(value / timing.minutesPerInputUnit, { locale: "en", maximumFractionDigits: 4 })} hours (${formatted} minutes)`;
    }

    return `${formatted} ${Math.abs(value) === 1 ? unit.singular : unit.plural}`;
}


function renderReport(audit: ActivityRepairAudit, databasePath: string, applied = false, excludedCandidates?: number) {
    const proposals = audit.entries.filter(entry => entry.disposition === "proposal");
    const review = audit.entries.filter(entry => entry.disposition === "review");
    const includesEstimates = audit.entries.some(entry => entry.repairKind === "ceiling");
    const kindLabels = { history: "historical correction", ceiling: "list ceiling correction", orphan: "orphaned activity cleanup" };

    const lines = [
        applied ? "APPLIED ACTIVITY REPAIRS" : "ACTIVITY REPAIR — DRY RUN (database unchanged)",
        `Database: ${databasePath}`,
        `${audit.scannedTitles} titles checked; ${proposals.length} selectable proposals; ${review.length} review-only candidates.`,
        ...(excludedCandidates === undefined ? [] : [`Evidence-only selection: ${excludedCandidates} other candidates excluded.`]),
        "All six media types are checked. Games use stored minutes; dates and month boundaries are UTC.",
        includesEstimates
            ? "Policy: this report includes estimated reductions to current list totals. These assume the list is authoritative; they do not establish past user intent."
            : "Policy: historical corrections supported by retained evidence and orphaned activity cleanup. No estimated list ceiling corrections are included.",
        includesEstimates
            ? "Use historical evidence where available, then remove remaining excess from the earliest recorded months. Estimated allocations are labeled."
            : "Historical evidence includes exact completion undo sequences within five minutes.",
        "Only monthly activity changes. Visibility and dates on surviving rows, lists and update history are preserved.",
        includesEstimates
            ? "Orphaned and emptied rows are deleted. Zero totals on a non-Completed list entry clear completion flags; quick undos can also clear them."
            : "Orphaned and emptied rows are deleted. Supported completion undos can also clear completion flags.",
        "",
        "PROPOSAL INDEX",
        ...proposals.map(entry => `  ${entry.id} | @${entry.username} | ${entry.title} | ${kindLabels[entry.repairKind]} | ${entry.changes.map(change =>
            `${change.before.monthBucket}: ${formatProgress(entry.mediaType, change.before.progressGained)} → ${formatProgress(entry.mediaType, change.after?.progressGained ?? 0)}, redo ${change.before.redoGained} → ${change.after?.redoGained ?? 0}${change.before.hadCompletion !== (change.after?.hadCompletion ?? false) ? `, completion ${change.before.hadCompletion} → ${change.after?.hadCompletion ?? false}` : ""}${change.after === null ? entry.repairKind === "orphan" ? " [DELETE ORPHANED ROW]" : " [DELETE EMPTY ROW]" : ""}`
        ).join("; ")}`),
    ];

    for (const entry of [...proposals, ...review]) {
        lines.push("", "=".repeat(80),
            `${entry.disposition === "proposal" ? (applied ? "APPLIED" : "PROPOSAL") : "REVIEW ONLY — no selectable change"}: ${entry.id}`,
            `Username: @${entry.username} (user #${entry.userId})`,
            `Title: ${entry.title} (${entry.mediaType} #${entry.mediaId})`,
            `Repair kind: ${kindLabels[entry.repairKind]}`,
            `Current list: ${formatProgress(entry.mediaType, entry.currentProgress)}; redo ${entry.currentRedo ?? "unavailable"}; status ${entry.currentStatus ?? "unavailable"}`,
            `Recorded activity across all months: ${formatProgress(entry.mediaType, entry.recordedProgress)}; redo ${entry.recordedRedo}`,
            `Months with a recorded completion: ${entry.recordedCompletions}`,
        );

        if (entry.disposition === "proposal") {
            const progress = entry.recordedProgress + entry.changes.reduce((sum, change) => sum + (change.after?.progressGained ?? 0) - change.before.progressGained, 0);
            const redo = entry.recordedRedo + entry.changes.reduce((sum, change) => sum + (change.after?.redoGained ?? 0) - change.before.redoGained, 0);
            lines.push(`Proposed activity across all months: ${formatProgress(entry.mediaType, progress)}; redo ${redo}`);
        }

        if (entry.openingBalance) {
            lines.push(`Existing progress before retained snapshots (inferred): ${formatProgress(entry.mediaType, entry.openingBalance.progress)}; redo ${entry.openingBalance.redo}. This is not added to the corrected months.`);
        }
        lines.push(...entry.notes.map(note => `Note: ${note}`));
        for (const allocation of entry.allocations) {
            lines.push(`Allocation — ${allocation.source === "snapshots" ? "estimate from snapshots" : "earliest recorded month"}: ${allocation.monthBucket}: subtract ${formatProgress(entry.mediaType, allocation.progressRemoved)}; redo ${allocation.redoRemoved}.`);
        }
        if (entry.disposition === "proposal" && entry.repairKind === "history") {
            lines.push("Evidence checks: snapshot deltas have preceding list baselines; months reconcile with additions/corrections, allowing legacy redo flags; reversals fit their own month, the sole recorded month, or an unambiguous allocation from earlier balances.");
        }
        if (entry.disposition === "review") {
            lines.push(...entry.reasons.map(reason => `Skipped: ${reason}`));
        }
        else if (entry.repairKind === "ceiling") {
            lines.push(...entry.historyIssues.map(reason => `History limitation (does not block the ceiling correction): ${reason}`));
        }

        lines.push("Monthly rows:");
        for (const month of entry.months) {
            const change = entry.changes.find(item => item.before.id === month.id);
            const before = `${formatProgress(entry.mediaType, month.progressGained)}; redo ${month.redoGained}`;
            const after = change ? ` → ${formatProgress(entry.mediaType, change.after?.progressGained ?? 0)}; redo ${change.after?.redoGained ?? 0}${change.after === null ? entry.repairKind === "orphan" ? " [DELETE ORPHANED ROW]" : " [DELETE EMPTY ROW]" : ""}` : " [unchanged]";
            lines.push(`  ${month.monthBucket} (row #${month.id}): ${before}${after}`,
                `    completion=${month.hadCompletion}${change && month.hadCompletion !== (change.after?.hadCompletion ?? false) ? ` → ${change.after?.hadCompletion ?? false}` : ""}, hidden=${month.hidden}, last activity=${month.lastActivityAt}`);
        }

        lines.push(entry.repairKind === "orphan" ? "Statistics reconstruction: not required for orphan cleanup." : "Statistics snapshot changes (list totals differenced across ALL titles):");
        for (const event of entry.evidence) {
            lines.push(`  ${event.timestamp} [snapshot #${event.id}]: progress ${event.progressDelta > 0 ? "+" : ""}${formatProgress(entry.mediaType, event.progressDelta)}, redo ${event.redoDelta > 0 ? "+" : ""}${event.redoDelta}; list entries ${event.entriesDelta > 0 ? "+" : ""}${event.entriesDelta}${event.statusChanges.length ? `; ${event.statusChanges.join(", ")}` : ""}`);
        }

        lines.push("Retained update history (rapid edits may have been merged):");
        for (const update of entry.history) {
            lines.push(`  ${update.timestamp} [update #${update.id}] ${update.updateType}: ${update.payload ?? "no payload"}`);
        }
    }

    return lines.join("\n") + "\n";
}


export function createActivityRepairCommand() {
    return new Command()
        .name("activity-repair")
        .description("Audit historical activity, or apply all evidence-only repairs with an automatic backup.")
        .option("--db <path>", "SQLite database path (defaults to DATABASE_URL)")
        .option("--username <name>", "Audit one exact username")
        .addOption(new Option("--media-type <type>", "Audit one media type").choices(Object.values(MediaType)))
        .option("--evidence-only", "Include only historical corrections without history limitations or estimates, and orphan cleanup")
        .option("--output <file.json>", "Save the review plan as JSON and a readable .txt report; refuses to overwrite files")
        .option("--apply [file.json]", "Apply all evidence-only repairs directly, or selected proposals from a saved report")
        .option("--select <ids>", "Comma-separated proposal IDs to apply, e.g. books:131:3514")
        .action(options => {
            const directApply = options.apply === true;
            if (directApply && !options.evidenceOnly) {
                throw new Error("Use --evidence-only --apply to apply qualifying repairs directly.");
            }
            if (directApply && options.select) {
                throw new Error("Direct evidence-only repair automatically selects all qualifying entries; omit --select.");
            }
            if (!directApply && Boolean(options.apply) !== Boolean(options.select)) {
                throw new Error("Applying requires both --apply <report.json> and --select <proposal IDs>.");
            }
            if (options.apply && options.output) {
                throw new Error("Use --output for a dry run; applied changes are printed to the terminal.");
            }
            if (!directApply && options.apply && (options.username || options.mediaType || options.evidenceOnly)) {
                throw new Error("Use audit filters when creating the saved report, or use --evidence-only --apply without a report.");
            }

            const configuredPath = options.db ?? process.env.DATABASE_URL;
            if (!configuredPath) throw new Error("Set DATABASE_URL or pass --db <existing SQLite database>.");

            const databasePath = realpathSync(configuredPath);
            const db = new Database(databasePath, options.apply ? { readwrite: true, create: false } : { readonly: true });

            try {
                db.run("PRAGMA busy_timeout = 10000");
                db.run("PRAGMA foreign_keys = ON");

                if (options.apply) {
                    const saved = directApply ? null : savedReportSchema.parse(JSON.parse(readFileSync(resolve(options.apply), "utf8")));
                    if (saved && saved.databasePath !== databasePath) throw new Error("The report belongs to a different database. Generate a report for this database first.");
                    const backupDirectory = join(dirname(databasePath), "activity-repair-backups");
                    const backupPath = join(backupDirectory, `${basename(databasePath)}.${Date.now()}.${randomUUID()}.db`);
                    let scannedTitles = 0;
                    let excludedCandidates: number | undefined;
                    // Keep automatic selection, backup and writes under the same write lock.
                    const selected = db.transaction(() => {
                        const audit = directApply ? auditActivityRepair(db, options) : null;
                        const entries = audit?.entries ?? saved!.entries;
                        const selectedIds = audit ? entries.map(entry => entry.id) : options.select.split(",").map((id: string) => id.trim());
                        scannedTitles = audit?.scannedTitles ?? selectedIds.length;
                        excludedCandidates = audit?.excludedCandidates;
                        if (directApply && selectedIds.length === 0) return [];

                        return applyActivityRepairs(db, entries, selectedIds, () => {
                            mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
                            // serialize includes committed WAL pages, unlike copying the main .db file.
                            writeFileSync(backupPath, db.serialize(), { flag: "wx", mode: 0o600, flush: true });
                        });
                    }).immediate();
                    console.log(selected.length > 0 ? `Backup: ${backupPath}` : "No evidence-only repairs to apply. Database unchanged.");
                    console.log(renderReport({ entries: selected, scannedTitles }, databasePath, true, excludedCandidates));
                }
                else {
                    // All reads share one snapshot even if the app is writing meanwhile.
                    const audit = db.transaction(() => auditActivityRepair(db, options))();
                    const report = { version: 1, databasePath, generatedAt: new Date().toISOString(), evidenceOnly: Boolean(options.evidenceOnly), ...audit };
                    const readable = renderReport(audit, databasePath, false, audit.excludedCandidates);

                    if (options.output) {
                        const jsonPath = resolve(options.output);
                        const textPath = jsonPath.replace(/\.json$/i, "") + ".txt";
                        mkdirSync(dirname(jsonPath), { recursive: true });
                        writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
                        writeFileSync(textPath, readable, { flag: "wx", mode: 0o600 });
                        console.log(readable.split("\n").slice(0, 9).join("\n"));
                        console.log(`\nReadable report: ${textPath}\nReview plan: ${jsonPath}`);
                    }
                    else {
                        console.log(readable);
                    }
                }
            }
            finally {
                db.close();
            }
        });
}
