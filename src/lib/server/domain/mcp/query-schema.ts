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


export const querySnapshotTables = {
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
    ...Object.entries(querySnapshotTables).map(([name, {
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

