import {FormattedError} from "@/lib/utils/error-classes";
import {QUERY_SNAPSHOT_LIMITS} from "@/lib/server/core/mcp/config";
import Database, {SQLiteError, type SQLQueryBindings} from "bun:sqlite";


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
    columns: Partial<Record<keyof typeof entryColumns, string>>;
};


export type QuerySnapshot = {
    data: Uint8Array;
    rowCount: number;
    snapshotAt: string;
    extractionMs: number;
};


const entryColumns = {
    profile_id: "INTEGER NOT NULL",
    media_type: "TEXT NOT NULL",
    media_id: "INTEGER NOT NULL",
    title: "TEXT NOT NULL",
    status: "TEXT NOT NULL",
    rating: "REAL",
    favorite: "INTEGER",
    comment: "TEXT",
    added_at: "TEXT",
    last_updated: "TEXT",
    release_date: "TEXT",
    synopsis: "TEXT",
    original_title: "TEXT",
    language: "TEXT",
    duration_minutes: "INTEGER",
    catalog_rating: "REAL",
    catalog_vote_count: "REAL",
    page_count: "INTEGER",
    chapter_count: "INTEGER",
    volume_count: "INTEGER",
    total_seasons: "INTEGER",
    total_episodes: "INTEGER",
    current_season: "INTEGER",
    current_episode: "INTEGER",
    current_page: "INTEGER",
    current_chapter: "INTEGER",
    playtime_minutes: "INTEGER",
    platform: "TEXT",
    redo: "INTEGER",
    progress_total: "INTEGER",
    budget: "REAL",
    revenue: "REAL",
    hltb_main_hours: "REAL",
    hltb_main_extra_hours: "REAL",
    hltb_completionist_hours: "REAL",
};


const snapshotTables = {
    profiles: {
        key: "profile_id",
        columns: {
            username: "TEXT NOT NULL",
            profile_id: "INTEGER NOT NULL",
            rating_system: "TEXT NOT NULL",
        },
    },
    entries: {
        columns: entryColumns,
        key: "profile_id, media_type, media_id",
    },
    labels: {
        key: "profile_id, media_type, media_id, name",
        columns: {
            name: "TEXT NOT NULL",
            media_type: "TEXT NOT NULL",
            media_id: "INTEGER NOT NULL",
            profile_id: "INTEGER NOT NULL",
        },
    },
    seasons: {
        key: "profile_id, media_type, media_id, season",
        columns: {
            rating: "REAL",
            episode_count: "INTEGER",
            redo: "INTEGER NOT NULL",
            season: "INTEGER NOT NULL",
            media_type: "TEXT NOT NULL",
            media_id: "INTEGER NOT NULL",
            profile_id: "INTEGER NOT NULL",
        },
    },
    activity: {
        key: "profile_id, media_type, media_id, month_bucket",
        columns: {
            title: "TEXT",
            media_type: "TEXT NOT NULL",
            media_id: "INTEGER NOT NULL",
            month_bucket: "TEXT NOT NULL",
            profile_id: "INTEGER NOT NULL",
            redo_gained: "INTEGER NOT NULL",
            progress_gained: "REAL NOT NULL",
            last_activity_at: "TEXT NOT NULL",
            had_completion: "INTEGER NOT NULL",
        },
    },
    media_genres: {
        key: "media_type, media_id, name",
        columns: {
            name: "TEXT NOT NULL",
            media_type: "TEXT NOT NULL",
            media_id: "INTEGER NOT NULL",
        },
    },
    media_people: {
        key: "media_type, media_id, role, name",
        columns: {
            role: "TEXT NOT NULL",
            name: "TEXT NOT NULL",
            media_type: "TEXT NOT NULL",
            media_id: "INTEGER NOT NULL",
        },
    },
    media_attributes: {
        key: "media_type, media_id, kind, name",
        columns: {
            kind: "TEXT NOT NULL",
            name: "TEXT NOT NULL",
            media_type: "TEXT NOT NULL",
            media_id: "INTEGER NOT NULL",
        },
    },
};


export const QUERY_SCHEMA = [
    "SQLite schema for the connected user's active media data and catalog metadata. Hidden activity and unattached labels are excluded.",
    ...Object.entries(snapshotTables).map(([name, {
        columns,
        key
    }]) => `${name} (${Object.entries(columns).map(([column, type]) => `${column} ${type}`).join(", ")}); PRIMARY KEY (${key}).`),
    "my_entries is an alias of entries. profiles contains only the connected user; rating_system is score/feeling. Media types: movies, series, anime, games, books, manga. Inapplicable fields are NULL.",
    "Join media on (media_type, media_id); include profile_id for labels, seasons and activity. Use EXISTS or DISTINCT when combining multiple facets to avoid double counting.",
    "rating: 0–10, NULL = unrated. catalog_rating: games use IGDB's 0–100 scale; movies, series, anime and manga use 0–10. Books have no catalog rating. A catalog rating of 0 can mean no votes; check catalog_vote_count. favorite: 0/1, NULL = unset.",
    "added_at/last_updated/last_activity_at are UTC; use JULIANDAY for timestamp ordering/comparisons because stored formats can differ. last_updated records edits, not consumption. month_bucket is YYYY-MM, not an exact completion date. had_completion is 0/1 for at least one completion in that month, not a completion count.",
    "progress_total includes repeats: movie viewings, TV episodes, book pages or manga chapters. Games use playtime_minutes. progress_gained uses those units, or minutes for games; do not sum mixed units. redo/redo_gained count repeats; for series/anime these are season rewatches, not complete-series rewatches. duration_minutes is movie or episode runtime; HLTB values are hours.",
    "For series/anime, entry rating is the mean of rated available seasons. seasons retains ratings/rewatches for unavailable seasons with episode_count = NULL; exclude those seasons when recomputing current totals.",
    "Activity can reference media removed from entries; title is NULL if its catalog metadata was deleted.",
    "media_people.role: actor, director, composer, creator, author, developer, publisher. media_attributes.kind: network, country, production_status, publisher, available_platform, game_engine, game_mode, player_perspective. Catalog string fields can contain combined values.",
    "Movie/TV actors and genres are limited to five stored names per title; actor names are not person IDs.",
    "Example, five recently edited movies rated above 8: SELECT title, rating FROM my_entries WHERE media_type = 'movies' AND rating > 8 AND last_updated IS NOT NULL ORDER BY JULIANDAY(last_updated) DESC LIMIT 5;",
].join("\n");


const ownerProfile = `WITH owner_profile AS (
    SELECT id AS profile_id, name AS username, rating_system
    FROM user WHERE id = $userId
)`;


const commonProjection: Partial<Record<keyof typeof entryColumns, string>> = {
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


const tvProjection: Partial<Record<keyof typeof entryColumns, string>> = {
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

        for (const [table, { columns, key }] of Object.entries(snapshotTables)) {
            snapshot.run(`CREATE TABLE ${table} (${Object.entries(columns).map(([column, type]) => `${column} ${type}`).join(", ")}, PRIMARY KEY (${key})) WITHOUT ROWID`);
        }

        snapshot.run("CREATE VIEW my_entries AS SELECT * FROM entries");

        const copyRows = (table: keyof typeof snapshotTables, sql: string) => {
            const columns = Object.keys(snapshotTables[table].columns);
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

                    copyRows("entries", `${ownerProfile} SELECT ${Object.keys(entryColumns).map(column => `${projection[column as keyof typeof entryColumns] ?? "NULL"} AS ${column}`).join(", ")}
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
