import {FormattedError} from "@/lib/utils/error-classes";
import Database, {SQLiteError, type SQLQueryBindings} from "bun:sqlite";
import {querySnapshotTables} from "@/lib/server/domain/mcp/query-schema";
import {QUERY_SNAPSHOT_LIMITS} from "@/lib/server/domain/mcp/query.config";


type EntryColumn = keyof typeof querySnapshotTables.entries.columns;


type Facet = {
    role: string;
    table?: string;
    column?: string;
    condition?: string;
};


type MediaProjection = {
    type: string;
    people: Facet[];
    attributes: Facet[];
    columns: Partial<Record<EntryColumn, string>>;
};


export type QuerySnapshot = {
    data: Uint8Array;
    rowCount: number;
    snapshotAt: string;
    extractionMs: number;
};


const ownerProfile = `WITH owner_profile AS (
    SELECT id AS profile_id, name AS username, rating_system
    FROM user WHERE id = $userId
)`;


const commonProjection: Partial<Record<EntryColumn, string>> = {
    title: "m.name",
    status: "l.status",
    rating: "l.rating",
    comment: "l.comment",
    media_id: "l.media_id",
    favorite: "l.favorite",
    added_at: "l.added_at",
    synopsis: "m.synopsis",
    profile_id: "l.user_id",
    last_updated: "l.last_updated",
    release_date: "m.release_date",
};


const tvProjection: Partial<Record<EntryColumn, string>> = {
    redo: "l.redo",
    progress_total: "l.total",
    duration_minutes: "m.duration",
    catalog_rating: "m.vote_average",
    total_seasons: "m.total_seasons",
    original_title: "m.original_name",
    catalog_vote_count: "m.vote_count",
    total_episodes: "m.total_episodes",
    current_season: "l.current_season",
    current_episode: "l.current_episode",
};


const mediaProjections: MediaProjection[] = [
    {
        type: "movies",
        columns: {
            redo: "l.redo",
            budget: "m.budget",
            revenue: "m.revenue",
            progress_total: "l.total",
            duration_minutes: "m.duration",
            language: "m.original_language",
            catalog_rating: "m.vote_average",
            original_title: "m.original_name",
            catalog_vote_count: "m.vote_count",
        },
        people: [
            { table: "movies_actors", role: "actor" },
            { column: "director_name", role: "director" },
            { column: "compositor_name", role: "composer" },
        ],
        attributes: [],
    },
    ...["series", "anime"].map(type => ({
        type, columns: tvProjection,
        people: [
            { table: `${type}_actors`, role: "actor" },
            { column: "created_by", role: "creator" },
        ],
        attributes: [
            { table: `${type}_network`, role: "network" },
            { column: "origin_country", role: "country" },
            { column: "prod_status", role: "production_status" },
        ],
    })),
    {
        type: "games",
        columns: {
            platform: "l.platform",
            playtime_minutes: "l.playtime",
            catalog_rating: "m.vote_average",
            catalog_vote_count: "m.vote_count",
            hltb_main_hours: "m.hltb_main_time",
            hltb_main_extra_hours: "m.hltb_main_and_extra_time",
            hltb_completionist_hours: "m.hltb_total_complete_time",
        },
        people: [
            { table: "games_companies", role: "developer", condition: "f.developer = 1" },
            { table: "games_companies", role: "publisher", condition: "f.publisher = 1" },
        ],
        attributes: [
            { column: "game_modes", role: "game_mode" },
            { column: "game_engine", role: "game_engine" },
            { table: "games_platforms", role: "available_platform" },
            { column: "player_perspective", role: "player_perspective" },
        ],
    },
    {
        type: "books",
        columns: {
            redo: "l.redo",
            page_count: "m.pages",
            language: "m.language",
            progress_total: "l.total",
            current_page: "l.actual_page",
        },
        people: [{ table: "books_authors", role: "author" }],
        attributes: [{ column: "publishers", role: "publisher" }],
    },
    {
        type: "manga",
        columns: {
            redo: "l.redo",
            volume_count: "m.volumes",
            progress_total: "l.total",
            chapter_count: "m.chapters",
            catalog_rating: "m.vote_average",
            original_title: "m.original_name",
            catalog_vote_count: "m.vote_count",
            current_chapter: "l.current_chapter"
        },
        people: [{ table: "manga_authors", role: "author" }],
        attributes: [
            { column: "publishers", role: "publisher" },
            { column: "prod_status", role: "production_status" },
        ],
    },
];


export function buildQuerySnapshot(source: Database, userId: number, limits = QUERY_SNAPSHOT_LIMITS): QuerySnapshot {
    const startedAt = performance.now();
    const snapshot = new Database(":memory:");

    let rowCount = 0;
    let snapshotAt = "";
    const bindings = { $userId: userId };

    try {
        snapshot.run(`PRAGMA page_size = 4096; PRAGMA max_page_count = ${Math.max(1, Math.floor(limits.maxBytes / 4096))}`);

        for (const [table, { columns, key }] of Object.entries(querySnapshotTables)) {
            snapshot.run(`CREATE TABLE ${table} (${Object.entries(columns).map(([column, type]) => `${column} ${type}`).join(", ")}, PRIMARY KEY (${key})) WITHOUT ROWID`);
        }

        snapshot.run("CREATE VIEW my_entries AS SELECT * FROM entries");

        const copyRows = (table: keyof typeof querySnapshotTables, sql: string) => {
            const columns = Object.keys(querySnapshotTables[table].columns);
            const insert = snapshot.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`);
            const select = source.prepare<Record<string, SQLQueryBindings>, typeof bindings>(sql);

            try {
                for (const row of select.iterate(bindings)) {
                    if (++rowCount > limits.maxRows) {
                        throw new FormattedError(`Query snapshot exceeds the ${limits.maxRows} row limit.`);
                    }

                    insert.run(...columns.map(column => row[column]));
                }
            }
            finally {
                select.finalize();
                insert.finalize();
            }
        };

        source.transaction(() => {
            snapshotAt = new Date().toISOString();

            snapshot.transaction(() => {
                copyRows("profiles", `${ownerProfile} SELECT * FROM owner_profile`);

                for (const { type, columns, people, attributes } of mediaProjections) {
                    const activeLists = `FROM ${type}_list l
                        JOIN owner_profile p ON p.profile_id = l.user_id
                        JOIN user_media_settings s ON s.user_id = l.user_id AND s.media_type = '${type}' AND s.active = 1`;

                    const activeActivity = `FROM user_media_monthly_activity a
                        JOIN owner_profile p ON p.profile_id = a.user_id
                        JOIN user_media_settings s ON s.user_id = a.user_id AND s.media_type = a.media_type AND s.active = 1
                        WHERE a.media_type = '${type}' AND a.hidden = 0`;

                    const scopedMedia = `${ownerProfile}, scoped_media AS (
                        SELECT l.media_id ${activeLists}
                        UNION SELECT a.media_id ${activeActivity}
                    )`;

                    const projection = { ...commonProjection, ...columns, media_type: `'${type}'` };

                    copyRows("entries", `${ownerProfile} SELECT ${Object.keys(querySnapshotTables.entries.columns).map(column => `${projection[column as EntryColumn] ?? "NULL"} AS ${column}`).join(", ")}
                        ${activeLists} JOIN ${type} m ON m.id = l.media_id`);

                    copyRows("labels", `${ownerProfile} SELECT l.user_id AS profile_id, '${type}' AS media_type, l.media_id, t.name
                        ${activeLists} JOIN ${type}_tags t ON t.user_id = l.user_id AND t.media_id = l.media_id`);

                    copyRows("activity", `${ownerProfile} SELECT a.user_id AS profile_id, a.media_type, a.media_id,
                        (SELECT name FROM ${type} WHERE id = a.media_id) AS title,
                        a.month_bucket, a.progress_gained, a.redo_gained, a.had_completion, a.last_activity_at ${activeActivity}`);

                    if (type === "series" || type === "anime") {
                        copyRows("seasons", `${ownerProfile} SELECT l.user_id AS profile_id, '${type}' AS media_type, l.media_id,
                            r.season, r.rating, r.redo, e.episodes AS episode_count ${activeLists}
                            JOIN ${type}_list_seasons r ON r.list_id = l.id
                            LEFT JOIN ${type}_episodes_per_season e ON e.media_id = l.media_id AND e.season = r.season`);
                    }

                    copyRows("media_genres", `${scopedMedia} SELECT '${type}' AS media_type, f.media_id, f.name
                        FROM ${type}_genre f JOIN scoped_media v ON v.media_id = f.media_id`);

                    for (const [table, facets, roleColumn] of [["media_people", people, "role"], ["media_attributes", attributes, "kind"]] as const) {
                        for (const { table: facetTable, column, role, condition } of facets) {
                            copyRows(table, facetTable
                                ? `${scopedMedia} SELECT DISTINCT '${type}' AS media_type, f.media_id, '${role}' AS ${roleColumn}, f.name
                                    FROM ${facetTable} f JOIN scoped_media v ON v.media_id = f.media_id ${condition ? `WHERE ${condition}` : ""}`
                                : `${scopedMedia} SELECT '${type}' AS media_type, m.id AS media_id, '${role}' AS ${roleColumn}, m.${column} AS name
                                    FROM ${type} m JOIN scoped_media v ON v.media_id = m.id WHERE m.${column} IS NOT NULL AND m.${column} <> ''`);
                        }
                    }
                }
            })();
        }).deferred();

        const data = snapshot.serialize();

        if (data.byteLength > limits.maxBytes) {
            throw new FormattedError(`Query snapshot exceeds the ${limits.maxBytes} byte limit.`);
        }

        return {
            data,
            rowCount,
            snapshotAt,
            extractionMs: performance.now() - startedAt,
        };
    }
    catch (error) {
        if (error instanceof SQLiteError && error.code === "SQLITE_FULL") {
            throw new FormattedError(`Query snapshot exceeds the ${limits.maxBytes} byte limit.`);
        }

        throw error;
    }
    finally {
        snapshot.close();
    }
}
