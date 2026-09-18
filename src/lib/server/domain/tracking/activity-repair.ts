import type Database from "bun:sqlite";
import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {MediaType, Status} from "@/lib/utils/enums";
import {dateFromUTCInput} from "@/lib/utils/formatting/date";
import {allocateActivityCorrection} from "@/lib/utils/media/activity";
import migrationJournal from "../../../../../drizzle/meta/_journal.json";


// The version date is not the deployment date. Only infer the old boolean encoding
// for additions predating this version; later ambiguous counts use the list ceiling.
const legacyRedoBefore = migrationJournal.entries.find(entry => entry.tag === "0040_explicit_monthly_activity")!.when;
// Historical repair heuristic, matching the five-minute window used to merge feed edits.
const rapidCompletionUndoMs = 5 * 60 * 1000;


type RepairFilters = { username?: string; mediaType?: MediaType; evidenceOnly?: boolean };

type Candidate = {
    userId: number;
    username: string;
    mediaId: number;
    mediaType: MediaType;
    title: string;
    currentProgress: number | null;
    currentRedo: number | null;
    currentStatus: string | null;
    lastUpdated: string | null;
    recordedProgress: number;
    recordedRedo: number;
    recordedCompletions: number;
    malformedMonths: number;
};

type ActivityRow = {
    id: number;
    monthBucket: string;
    progressGained: number;
    redoGained: number;
    hadCompletion: boolean;
    hidden: boolean;
    lastActivityAt: string;
};

type HistoryRow = {
    id: number;
    timestamp: string;
    updateType: string;
    payload: string | null;
};

type Snapshot = {
    id: number;
    userId: number;
    mediaId: number;
    mediaType: MediaType;
    timestamp: string;
    previousId: number | null;
    progressTotal: number;
    redoTotal: number;
    progressDelta: number | null;
    redoDelta: number | null;
    entriesDelta: number | null;
    statusCounts: string;
    previousStatusCounts: string | null;
};

export type ActivityRepairEntry = Candidate & {
    id: string;
    fingerprint: string;
    repairKind: "history" | "ceiling" | "orphan";
    disposition: "proposal" | "review";
    reasons: string[];
    historyIssues: string[];
    notes: string[];
    allocations: { monthBucket: string; source: "snapshots" | "earliest"; progressRemoved: number; redoRemoved: number }[];
    openingBalance: { progress: number; redo: number } | null;
    months: ActivityRow[];
    changes: { before: ActivityRow; after: ActivityRow | null }[];
    evidence: {
        id: number;
        timestamp: string;
        progressDelta: number;
        redoDelta: number;
        entriesDelta: number;
        statusChanges: string[];
    }[];
    history: HistoryRow[];
};

export type ActivityRepairAudit = {
    entries: ActivityRepairEntry[];
    scannedTitles: number;
    excludedCandidates?: number;
};


/** Standalone maintenance query: deliberately does not load the application's writable DB or services. */
export function auditActivityRepair(db: Database, filters: RepairFilters = {}): ActivityRepairAudit {
    const listQueries = Object.values(MediaType).map(type => `
        SELECT l.user_id, l.media_id, '${type}' media_type, m.name title, l.status, l.last_updated,
            ${type === MediaType.GAMES ? "COALESCE(l.playtime, 0)" : "l.total"} progress,
            ${type === MediaType.GAMES ? "0" : "l.redo"} redo
        FROM ${type}_list l LEFT JOIN ${type} m ON m.id = l.media_id
    `);
    const totals = db.query<Candidate, [string | null, string | null]>(`
        WITH lists AS (${listQueries.join(" UNION ALL ")})
        SELECT a.user_id userId, u.name username, a.media_id mediaId, a.media_type mediaType,
            COALESCE(l.title, 'Missing list entry #' || a.media_id) title,
            l.progress currentProgress, l.redo currentRedo, l.status currentStatus, l.last_updated lastUpdated,
            SUM(a.progress_gained) recordedProgress, SUM(a.redo_gained) recordedRedo,
            SUM(a.had_completion) recordedCompletions,
            SUM(a.month_bucket NOT GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'
                OR SUBSTR(a.month_bucket, 6, 2) NOT BETWEEN '01' AND '12') malformedMonths
        FROM user_media_monthly_activity a
        JOIN user u ON u.id = a.user_id
        LEFT JOIN lists l ON l.user_id = a.user_id AND l.media_id = a.media_id AND l.media_type = a.media_type
        WHERE (?1 IS NULL OR u.name = ?1) AND (?2 IS NULL OR a.media_type = ?2)
        GROUP BY a.user_id, a.media_type, a.media_id
        ORDER BY u.name, a.media_type, a.media_id
    `).all(filters.username ?? null, filters.mediaType ?? null);

    const candidates = totals.filter(row => row.currentProgress === null
        || row.recordedProgress > row.currentProgress || row.recordedRedo > row.currentRedo! || row.malformedMonths > 0
        || (row.currentProgress === 0 && row.currentStatus !== Status.COMPLETED && row.recordedCompletions > 0));
    if (candidates.length === 0) return { scannedTitles: totals.length, entries: [], excludedCandidates: filters.evidenceOnly ? 0 : undefined };

    // LAG must see all titles for each user/type: snapshots contain LIST totals, not title totals.
    const snapshots = db.query<Snapshot, []>(`
        SELECT id, user_id userId, media_id mediaId, media_type mediaType, timestamp,
            LAG(id) OVER timeline previousId,
            CASE WHEN media_type = 'games' THEN time_spent ELSE total_specific END progressTotal,
            total_redo redoTotal,
            CASE WHEN media_type = 'games' THEN time_spent - LAG(time_spent) OVER timeline
                ELSE total_specific - LAG(total_specific) OVER timeline END progressDelta,
            total_redo - LAG(total_redo) OVER timeline redoDelta,
            total_entries - LAG(total_entries) OVER timeline entriesDelta,
            status_counts statusCounts, LAG(status_counts) OVER timeline previousStatusCounts
        FROM user_media_stats_history
        WINDOW timeline AS (PARTITION BY user_id, media_type ORDER BY id)
        ORDER BY id
    `).all();
    const snapshotsByTitle = new Map<string, Snapshot[]>();
    for (const snapshot of snapshots) {
        const key = `${snapshot.mediaType}:${snapshot.userId}:${snapshot.mediaId}`;
        const group = snapshotsByTitle.get(key) ?? [];
        group.push(snapshot);
        snapshotsByTitle.set(key, group);
    }

    const monthsQuery = db.query<ActivityRow, [number, MediaType, number]>(`
        SELECT id, month_bucket monthBucket, progress_gained progressGained, redo_gained redoGained,
            had_completion hadCompletion, hidden, last_activity_at lastActivityAt
        FROM user_media_monthly_activity WHERE user_id = ? AND media_type = ? AND media_id = ?
        ORDER BY month_bucket, id
    `);
    const historyQuery = db.query<HistoryRow, [number, MediaType, number]>(`
        SELECT id, update_type updateType, payload, timestamp FROM user_media_update
        WHERE user_id = ? AND media_type = ? AND media_id = ?
            AND update_type IN ('status', 'page', 'chapter', 'playtime', 'tv', 'redo')
        ORDER BY id
    `);

    const entries = candidates.map(candidate => {
        const id = `${candidate.mediaType}:${candidate.userId}:${candidate.mediaId}`;
        const months = monthsQuery.all(candidate.userId, candidate.mediaType, candidate.mediaId)
            .map(row => ({ ...row, hidden: Boolean(row.hidden), hadCompletion: Boolean(row.hadCompletion) }));
        const history = historyQuery.all(candidate.userId, candidate.mediaType, candidate.mediaId);
        const events = snapshotsByTitle.get(id) ?? [];
        const fingerprint = createHash("sha256").update(JSON.stringify({ candidate, months, history, events })).digest("hex");
        if (candidate.currentProgress === null) {
            // Removing a list entry already deletes all its monthly activity in the
            // application. Leftover rows violate that lifecycle, regardless of history.
            return {
                ...candidate, id, fingerprint, months, history, repairKind: "orphan" as const,
                disposition: "proposal" as const, reasons: [], historyIssues: [], allocations: [], openingBalance: null, evidence: [],
                changes: months.map(before => ({ before, after: null })),
                notes: ["The title is no longer in this user's list. Removing a list entry also removes all of its monthly activity in the app; delete these leftover rows. Snapshot reconstruction is not required for this cleanup."],
            };
        }
        const reasons = new Set<string>();
        const notes: string[] = [];
        const hasAdditionBaseline = events[0]?.entriesDelta === 1 && events[0]?.previousId !== null;
        const hasZeroBaseline = events[0]?.previousId === null && events[0].progressTotal === 0 && events[0].redoTotal === 0;
        // A sole recorded month gives an unambiguous destination even if the user
        // moved the activity date or corrected the total in a later month.
        // Its counters must still reconcile with ALL observed additions below.
        const singleRecordedMonth = months.length === 1 ? months[0].monthBucket : null;
        const observedMonths = new Set<string>();
        const gross = new Map<string, { progress: number; redo: number; legacyRedo: number; legacyMonths: Set<string> }>();
        const corrected = new Map<string, ActivityRow>();
        const completionCounts = new Map<string, number>();
        const undoneCompletionMonths = new Set<string>();
        const reversalMonths = new Set<string>();
        const crossMonthCounters = new Set<"progress" | "redo">();
        const uncertainCounters = new Set<"progress" | "redo">();
        const crossMonthNotes: string[] = [];
        const evidence: ActivityRepairEntry["evidence"] = [];
        let netProgress = 0;
        let netRedo = 0;
        let snapshotGaps = false;
        let previousTimestamp = -Infinity;
        if (history.length === 0) reasons.add("Update history is missing; backdated edits and intent cannot be checked.");

        const snapshotSeconds = new Set(events.map(event => Math.floor(dateFromUTCInput(event.timestamp).getTime() / 1000)).filter(Number.isFinite));
        if (history.some(row => !snapshotSeconds.has(Math.floor(dateFromUTCInput(row.timestamp).getTime() / 1000)))) {
            reasons.add("Some update dates have no matching snapshot; history may be backdated or incomplete.");
        }
        if (months.some(month => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month.monthBucket))) {
            reasons.add("Activity contains a malformed month; the intended date needs manual review.");
        }

        const parsedEvents = events.map(event => {
            const counts: Record<string, number> = JSON.parse(event.statusCounts);
            const previousCounts: Record<string, number> = event.previousStatusCounts === null ? {} : JSON.parse(event.previousStatusCounts);
            const changedStatuses = [...new Set([...Object.keys(counts), ...Object.keys(previousCounts)])]
                .filter(status => (counts[status] ?? 0) !== (previousCounts[status] ?? 0));
            const statusDeltas = Object.fromEntries(changedStatuses.map(status => [status, (counts[status] ?? 0) - (previousCounts[status] ?? 0)]));
            const statusChanges = changedStatuses.map(status => `${status}: ${previousCounts[status] ?? 0} → ${counts[status] ?? 0}`);
            return { ...event, date: dateFromUTCInput(event.timestamp), statusDeltas, statusChanges };
        });
        // Identify whole, closed edit sequences before replaying counters. A completion
        // can be undone through intermediate statuses, not only by the very next edit.
        const undoneEvents = new Set<number>();
        const pending: typeof parsedEvents = [];
        for (const event of parsedEvents) {
            const deltas = Object.values(event.statusDeltas);
            if (!Number.isFinite(event.date.getTime()) || event.progressDelta === null || event.redoDelta === null
                || event.entriesDelta !== 0 || (deltas.length > 0 && !(deltas.length === 2 && deltas.includes(-1) && deltas.includes(1)))) {
                pending.length = 0;
                continue;
            }
            if (pending.length && event.date < pending.at(-1)!.date) pending.length = 0;
            if (event.progressDelta === 0 && event.redoDelta === 0 && deltas.length === 0) continue;
            pending.push(event);
            let progress = 0;
            let redo = 0;
            const statuses: Record<string, number> = {};
            let nextStatus: string | undefined;
            for (let start = pending.length - 1; start >= 0; start--) {
                const first = pending[start];
                const elapsed = event.date.getTime() - first.date.getTime();
                if (elapsed > rapidCompletionUndoMs) break;
                progress += first.progressDelta!;
                redo += first.redoDelta!;
                const transition = Object.entries(first.statusDeltas);
                if (transition.length > 0) {
                    const from = transition.find(([, delta]) => delta === -1)![0];
                    const to = transition.find(([, delta]) => delta === 1)![0];
                    if (nextStatus !== undefined && to !== nextStatus) break;
                    nextStatus = from;
                    for (const [status, delta] of transition) statuses[status] = (statuses[status] ?? 0) + delta;
                }
                if (first.statusDeltas[Status.COMPLETED] !== 1 || first.progressDelta! < 0 || first.redoDelta! < 0
                    || progress !== 0 || redo !== 0 || Object.values(statuses).some(delta => delta !== 0)) continue;

                const sequence = pending.splice(start);
                for (const undone of sequence) undoneEvents.add(undone.id);
                notes.push(`Snapshots #${first.id} and #${event.id}: completion was exactly reversed after ${elapsed / 1000} seconds across ${sequence.length} edits, restoring the previous status, progress and redo. Treat the sequence as an undo; clear its completion flags only where no other recorded completion remains.`);
                break;
            }
        }

        for (const [index, event] of parsedEvents.entries()) {
            const { date, statusDeltas, statusChanges } = event;
            if (!Number.isFinite(date.getTime())) {
                snapshotGaps = true;
                reasons.add("A snapshot has a malformed timestamp.");
                continue;
            }
            if (date.getTime() < previousTimestamp) {
                snapshotGaps = true;
                reasons.add("Snapshot dates are out of order; they cannot establish correction placement.");
            }
            previousTimestamp = date.getTime();
            if (index === 0 && hasZeroBaseline) {
                notes.push(`Snapshot #${event.id} at ${event.timestamp} records zero progress and redo across this media list; it establishes the starting baseline.`);
                continue;
            }
            if (event.progressDelta === null || event.redoDelta === null || event.entriesDelta === null) {
                snapshotGaps = true;
                reasons.add("A snapshot has no preceding baseline.");
                continue;
            }
            const { progressDelta, redoDelta, entriesDelta } = event;
            const observedMonth = date.toISOString().slice(0, 7);
            const monthBucket = singleRecordedMonth ?? observedMonth;
            const isRapidCompletionUndo = undoneEvents.has(event.id);
            if (entriesDelta !== 0 && !(index === 0 && hasAdditionBaseline)) {
                snapshotGaps = true;
                reasons.add("Snapshots include removal, re-addition, imports, or changes to the list baseline.");
            }
            if (!isRapidCompletionUndo && entriesDelta === 0 && [Status.PLAN_TO_PLAY, Status.PLAN_TO_READ, Status.PLAN_TO_WATCH]
                .some(status => (statusDeltas[status] ?? 0) > 0)) {
                reasons.add("A planning-status reset is not a proven quick undo; use the list ceiling.");
            }
            if (!isRapidCompletionUndo && (progressDelta < 0 || redoDelta < 0) && statusChanges.length > 0) {
                reasons.add("A reversal also changes status; an exact undo was not established.");
            }
            if ((statusDeltas[Status.COMPLETED] ?? 0) > 0) {
                if (isRapidCompletionUndo) {
                    undoneCompletionMonths.add(monthBucket);
                    reversalMonths.add(monthBucket);
                }
                else completionCounts.set(monthBucket, (completionCounts.get(monthBucket) ?? 0) + statusDeltas[Status.COMPLETED]);
            }
            if (progressDelta !== 0 || redoDelta !== 0 || entriesDelta !== 0 || statusChanges.length > 0) {
                evidence.push({ id: event.id, timestamp: event.timestamp, progressDelta, redoDelta, entriesDelta, statusChanges });
            }

            netProgress += progressDelta;
            netRedo += redoDelta;
            if (progressDelta !== 0 || redoDelta !== 0) observedMonths.add(observedMonth);
            if (progressDelta < 0 || redoDelta < 0) reversalMonths.add(monthBucket);
            const added = gross.get(monthBucket) ?? { progress: 0, redo: 0, legacyRedo: 0, legacyMonths: new Set<string>() };
            added.progress += Math.max(0, progressDelta);
            added.redo += Math.max(0, redoDelta);
            if (redoDelta > 0 && date.getTime() < legacyRedoBefore) {
                added.legacyRedo += redoDelta;
                added.legacyMonths.add(observedMonth);
            }
            gross.set(monthBucket, added);
            const month = corrected.get(monthBucket) ?? {
                id: 0, monthBucket, progressGained: 0, redoGained: 0,
                hidden: false, hadCompletion: false, lastActivityAt: event.timestamp,
            };
            corrected.set(monthBucket, month);
            if (isRapidCompletionUndo) {
                reversalMonths.add(monthBucket);
                continue;
            }
            month.progressGained += Math.max(0, progressDelta);
            month.redoGained += Math.max(0, redoDelta);

            const removal = {
                progressRemoved: Math.max(0, -progressDelta), redoRemoved: Math.max(0, -redoDelta),
            };
            const sourceMonths = new Map([[monthBucket, month]]);
            for (const [amount, field, counter] of [
                [removal.progressRemoved, "progressGained", "progress"],
                [removal.redoRemoved, "redoGained", "redo"],
            ] as const) {
                if (amount <= month[field]) continue;

                // Later additions cannot fund this reversal. Outside its own month,
                // allocation is unique only with one source or when all balances go to zero.
                const available = [...corrected.values()].filter(row => row.monthBucket <= monthBucket && row[field] > 0);
                const total = available.reduce((sum, row) => sum + row[field], 0);
                if (amount > total || (available.length > 1 && amount !== total)) {
                    uncertainCounters.add(counter);
                    reasons.add(singleRecordedMonth
                        ? "A reversal exceeds the observed additions available in the sole recorded month; earlier history needs manual review."
                        : `A reversal reaches earlier months; its ${counter} source is ambiguous or not fully covered by retained history.`);
                    continue;
                }
                crossMonthCounters.add(counter);
                for (const source of available) {
                    sourceMonths.set(source.monthBucket, source);
                    reversalMonths.add(source.monthBucket);
                }
                crossMonthNotes.push(`Snapshot #${event.id} at ${event.timestamp}: the ${counter} reversal ${available.length === 1
                    ? `has only one available source month, ${available[0].monthBucket}`
                    : `consumes all available balances in ${available.map(row => row.monthBucket).join(", ")}`}. Only additions recorded before this edit are considered; later additions stay in their own months.`);
            }

            const allocation = allocateActivityCorrection({
                version: "", months: [...sourceMonths.values()].sort((a, b) => b.monthBucket.localeCompare(a.monthBucket)), ...removal,
            });
            for (const change of allocation.changes) {
                const source = corrected.get(change.monthBucket)!;
                source.progressGained -= change.progressRemoved;
                source.redoGained -= change.redoRemoved;
            }
        }

        // Existing titles can have progress predating the retained snapshots. Keep it
        // outside the reconstructed months instead of demanding a zero opening balance.
        const openingBalance = candidate.currentProgress !== null && candidate.currentRedo !== null
            ? { progress: candidate.currentProgress - netProgress, redo: candidate.currentRedo - netRedo }
            : null;
        if (openingBalance && (openingBalance.progress < 0 || openingBalance.redo < 0
            || ((hasAdditionBaseline || hasZeroBaseline) && (openingBalance.progress !== 0 || openingBalance.redo !== 0)))) {
            snapshotGaps = true;
            reasons.add("Snapshot changes do not reconcile with the current list totals.");
        }
        for (const counter of crossMonthCounters) {
            if (openingBalance && openingBalance[counter] > 0) {
                uncertainCounters.add(counter);
                reasons.add(`A reversal reaches earlier months with ${counter} predating retained snapshots; its source month needs manual review.`);
            }
        }
        const recorded = new Map(months.map(month => [month.monthBucket, month]));
        // A cross-month allocation also needs the other rows to reconcile, so a
        // missing or manually moved source cannot masquerade as a unique one.
        const checkedMonths = crossMonthCounters.size > 0
            ? new Set([...gross.keys(), ...recorded.keys()]) : reversalMonths;
        for (const monthBucket of checkedMonths) {
            const expected = gross.get(monthBucket);
            const result = corrected.get(monthBucket);
            if (!expected || !result) {
                reasons.add(`${monthBucket}: activity has no reconstructed additions; earlier history or moved activity needs manual review.`);
                continue;
            }
            const actual = recorded.get(monthBucket);
            const progress = actual?.progressGained ?? 0;
            const redo = actual?.redoGained ?? 0;
            // A counter may already be corrected while the other still needs repair.
            // Legacy months stored "any redo" as a boolean, followed by counted additions.
            // Moving several months into one row can sum their legacy flags.
            const legacyRedo = expected.legacyMonths.size + expected.redo - expected.legacyRedo;
            const matchesLegacyRedo = expected.legacyRedo > 1 && redo === legacyRedo;
            if ((progress !== expected.progress && progress !== result.progressGained)
                || (redo !== expected.redo && redo !== result.redoGained && !matchesLegacyRedo)) {
                reasons.add(`${monthBucket}: counters match neither snapshot additions nor the corrected result: possible manual edits, earlier repairs, imports, or missing history.`);
            }
            if (matchesLegacyRedo) {
                notes.push(`${monthBucket}: redo matches the legacy boolean representation; the reconstructed count is ${result.redoGained}.`);
            }
            if (progress === result.progressGained && progress !== expected.progress) {
                notes.push(`${monthBucket}: progress already matches the corrected result and is preserved.`);
            }
            if (redo === result.redoGained && redo !== expected.redo) {
                notes.push(`${monthBucket}: redo already matches the corrected result and is preserved.`);
            }
        }
        if (!evidence.some(event => event.progressDelta < 0 || event.redoDelta < 0) && undoneCompletionMonths.size === 0) {
            reasons.add("No recorded reversal accounts for the excess.");
        }

        const changes: ActivityRepairEntry["changes"] = [];
        if (reasons.size === 0) {
            notes.push(...crossMonthNotes);
            for (const before of months) {
                if (!reversalMonths.has(before.monthBucket)) continue;
                const progressGained = candidate.recordedProgress > candidate.currentProgress
                    ? Math.min(before.progressGained, corrected.get(before.monthBucket)?.progressGained ?? 0) : before.progressGained;
                const redoGained = candidate.recordedRedo > candidate.currentRedo!
                    ? Math.min(before.redoGained, corrected.get(before.monthBucket)?.redoGained ?? 0) : before.redoGained;
                const hadCompletion = before.hadCompletion
                    && !(undoneCompletionMonths.has(before.monthBucket) && (completionCounts.get(before.monthBucket) ?? 0) === 0);
                if (before.progressGained === progressGained && before.redoGained === redoGained && before.hadCompletion === hadCompletion) continue;
                const after = progressGained === 0 && redoGained === 0 && !hadCompletion
                    ? null : { ...before, progressGained, redoGained, hadCompletion };
                changes.push({ before, after });
            }
            if (changes.length === 0) {
                reasons.add("Snapshot reconstruction does not establish another monthly reduction.");
            }
            else if (singleRecordedMonth && [...observedMonths].some(month => month !== singleRecordedMonth)) {
                notes.push(`All observed additions and reversals reconcile with the sole recorded activity month, ${singleRecordedMonth}. Snapshot edits occurred in ${[...observedMonths].join(", ")}; the correction keeps the recorded activity month and date. Feed/update timestamps are preserved.`);
            }
        }

        const projected = new Map(months.map(month => [month.id, { ...month }]));
        for (const change of changes) {
            projected.set(change.before.id, change.after ?? { ...change.before, progressGained: 0, redoGained: 0, hadCompletion: false });
        }
        let progressExcess = Math.max(0, [...projected.values()].reduce((sum, row) => sum + row.progressGained, 0) - candidate.currentProgress);
        let redoExcess = Math.max(0, [...projected.values()].reduce((sum, row) => sum + row.redoGained, 0) - candidate.currentRedo!);
        const allocations: ActivityRepairEntry["allocations"] = [];
        let repairKind: ActivityRepairEntry["repairKind"] = "history";
        if (progressExcess > 0 || redoExcess > 0) {
            repairKind = "ceiling";
            notes.push("The current list is authoritative for this repair. Remove the excess even when the history cannot establish an exact reconstruction; counters already below their list total are preserved.");
            // A reconstructed monthly reduction gives a useful placement estimate
            // even if feed dates/history or the recorded monthly counts differ.
            // Gaps in the snapshots themselves invalidate that estimate.
            if (!snapshotGaps) {
                for (const before of months) {
                    const result = corrected.get(before.monthBucket);
                    if (!result || !reversalMonths.has(before.monthBucket)) continue;
                    const row = projected.get(before.id)!;
                    const progressRemoved = uncertainCounters.has("progress") ? 0 : Math.min(progressExcess, Math.max(0, row.progressGained - result.progressGained));
                    const redoRemoved = uncertainCounters.has("redo") ? 0 : Math.min(redoExcess, Math.max(0, row.redoGained - result.redoGained));
                    if (progressRemoved === 0 && redoRemoved === 0) continue;
                    row.progressGained -= progressRemoved;
                    row.redoGained -= redoRemoved;
                    progressExcess -= progressRemoved;
                    redoExcess -= redoRemoved;
                    allocations.push({ monthBucket: row.monthBucket, source: "snapshots", progressRemoved, redoRemoved });
                }
            }

            // Legacy month keys can lack zero padding. Use their activity date for
            // ordering, without changing the stored date or month. If neither is
            // usable, row creation order is the best available chronology.
            const ordered = [...projected.values()].map(row => {
                const date = dateFromUTCInput(row.lastActivityAt);
                const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(row.monthBucket) ? row.monthBucket
                    : Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 7) : null;
                return { row, month };
            });
            if (ordered.some(item => item.month === null)) {
                if (progressExcess > 0 || redoExcess > 0) notes.push("Some activity dates cannot be ordered by month; the earliest-month allocation uses row creation order for this title. Stored dates are preserved.");
                ordered.sort((a, b) => a.row.id - b.row.id);
            }
            else ordered.sort((a, b) => a.month!.localeCompare(b.month!) || a.row.id - b.row.id);
            const allocation = allocateActivityCorrection({
                version: "", months: ordered.map(item => item.row), progressRemoved: progressExcess, redoRemoved: redoExcess,
            });
            for (const change of allocation.changes) {
                const row = projected.get(change.id)!;
                row.progressGained -= change.progressRemoved;
                row.redoGained -= change.redoRemoved;
                allocations.push({ monthBucket: row.monthBucket, source: "earliest", progressRemoved: change.progressRemoved, redoRemoved: change.redoRemoved });
            }
        }

        const clearCompletions = candidate.currentProgress === 0 && candidate.currentRedo === 0 && candidate.currentStatus !== Status.COMPLETED;
        if (clearCompletions && candidate.recordedCompletions > 0) {
            notes.push("The list has zero progress and redo and is not Completed; clear the remaining completion flags, including older status resets.");
            if (reasons.size > 0) repairKind = "ceiling";
        }
        changes.length = 0;
        for (const before of months) {
            const after = projected.get(before.id)!;
            const drainedByCeiling = allocations.some(allocation => allocation.monthBucket === before.monthBucket)
                && after.progressGained === 0 && after.redoGained === 0;
            if (clearCompletions || (drainedByCeiling && !(candidate.currentProgress === 0 && candidate.currentStatus === Status.COMPLETED))) {
                after.hadCompletion = false;
            }
            if (before.progressGained === after.progressGained && before.redoGained === after.redoGained && before.hadCompletion === after.hadCompletion) continue;
            changes.push({ before, after: after.progressGained === 0 && after.redoGained === 0 && !after.hadCompletion ? null : after });
        }
        if (allocations.length > 0) notes.push("Rows fully emptied by the ceiling correction lose their completion flag and are deleted; a current zero-progress Completed entry retains its completion.");

        return {
            ...candidate, id, fingerprint, months, history, evidence, changes, notes, repairKind, allocations,
            openingBalance: events.length === 0 || hasAdditionBaseline || hasZeroBaseline || snapshotGaps ? null : openingBalance,
            disposition: changes.length > 0 ? "proposal" as const : "review" as const,
            reasons: changes.length > 0 ? [] : [...reasons],
            historyIssues: [...reasons],
        };
    });

    const included = filters.evidenceOnly ? entries.filter(entry => entry.disposition === "proposal" && (
        entry.repairKind === "orphan"
        || (entry.repairKind === "history" && entry.historyIssues.length === 0 && entry.allocations.length === 0)
    )) : entries;

    return {
        scannedTitles: totals.length,
        entries: included,
        excludedCandidates: filters.evidenceOnly ? entries.length - included.length : undefined,
    };
}


/** Recompute under a write lock; never execute values supplied by an edited or stale report. */
export function applyActivityRepairs(db: Database, reviewed: { id: string }[], selectedIds: string[], backup: () => void) {
    if (selectedIds.length === 0 || new Set(selectedIds).size !== selectedIds.length) {
        throw new Error("Select one or more distinct proposal IDs from the saved report.");
    }

    return db.transaction(() => {
        const fresh = auditActivityRepair(db);
        const selected = selectedIds.map(id => {
            const saved = reviewed.find(entry => entry.id === id);
            const current = fresh.entries.find(entry => entry.id === id);
            if (!saved || !current || current.disposition !== "proposal" || !isDeepStrictEqual(saved, current)) {
                throw new Error(`Proposal ${id} is missing, changed, already applied, or not eligible. Generate a new report; nothing was changed.`);
            }
            return current;
        });

        // Required before any mutation; a failed backup aborts the transaction.
        backup();
        for (const entry of selected) {
            for (const change of entry.changes) {
                if (change.after === null) {
                    db.run("DELETE FROM user_media_monthly_activity WHERE id = ? AND user_id = ?", [change.before.id, entry.userId]);
                }
                else {
                    db.run("UPDATE user_media_monthly_activity SET progress_gained = ?, redo_gained = ?, had_completion = ? WHERE id = ? AND user_id = ?",
                        [change.after.progressGained, change.after.redoGained, Number(change.after.hadCompletion), change.before.id, entry.userId]);
                }
            }
        }
        return selected;
    }).immediate();
}
