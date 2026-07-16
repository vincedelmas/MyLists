import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {MediaType} from "@/lib/utils/enums";
import {check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export type CatalogProvider = "tmdb" | "google-books" | "igdb" | "jikan";


/**
 * Stable, provider-independent identity shared by every media family. Family
 * metadata stays in concrete subtype tables; this table is intentionally not a
 * nullable mega-table.
 */
export const catalogItem = sqliteTable("catalog_item", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    kind: text("kind").$type<MediaType>().notNull(),
    primaryProvider: text("primary_provider").$type<CatalogProvider>().notNull(),
    primaryExternalId: text("primary_external_id").notNull(),
    name: text("name").notNull(),
    releaseDate: text("release_date"),
    synopsis: text("synopsis"),
    imageCover: text("image_cover").notNull(),
    locked: integer("locked", { mode: "boolean" }).default(false).notNull(),
    addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
    lastProviderUpdate: text("last_provider_update"),
}, (table) => [
    check("catalog_item_kind_check", sql`${table.kind} IN ('series', 'anime', 'movies', 'books', 'games', 'manga')`),
    check("catalog_item_external_id_check", sql`length(trim(${table.primaryExternalId})) > 0`),
    uniqueIndex("ux_catalog_item_primary_source").on(table.kind, table.primaryProvider, table.primaryExternalId),
    index("ix_catalog_item_kind_name").on(table.kind, table.name),
    index("ix_catalog_item_kind_release_date").on(table.kind, table.releaseDate),
]);


/** Additional provider mappings can be attached without changing catalog identity. */
export const catalogSource = sqliteTable("catalog_source", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MediaType>().notNull(),
    provider: text("provider").$type<CatalogProvider>().notNull(),
    externalId: text("external_id").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    check("catalog_source_kind_check", sql`${table.kind} IN ('series', 'anime', 'movies', 'books', 'games', 'manga')`),
    check("catalog_source_external_id_check", sql`length(trim(${table.externalId})) > 0`),
    uniqueIndex("ux_catalog_source_provider_external").on(table.kind, table.provider, table.externalId),
    uniqueIndex("ux_catalog_source_item_provider").on(table.catalogItemId, table.provider),
    index("ix_catalog_source_catalog_item").on(table.catalogItemId),
]);


export const catalogGenre = sqliteTable("catalog_genre", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_catalog_genre_name").on(table.name),
]);


export const catalogItemGenre = sqliteTable("catalog_item_genre", {
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    genreId: integer("genre_id").notNull().references(() => catalogGenre.id, { onDelete: "restrict" }),
}, (table) => [
    primaryKey({ columns: [table.catalogItemId, table.genreId], name: "pk_catalog_item_genre" }),
    index("ix_catalog_item_genre_genre").on(table.genreId, table.catalogItemId),
]);


/** Series and anime deliberately share the genuinely identical TV metadata model. */
export const tvDetails = sqliteTable("tv_details", {
    catalogItemId: integer("catalog_item_id").primaryKey().notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    originalName: text("original_name"),
    lastAirDate: text("last_air_date"),
    homepage: text("homepage"),
    createdBy: text("created_by"),
    episodeDurationMinutes: integer("episode_duration_minutes").default(0).notNull(),
    totalSeasons: integer("total_seasons").default(0).notNull(),
    totalEpisodes: integer("total_episodes").default(0).notNull(),
    originCountry: text("origin_country"),
    productionStatus: text("production_status"),
    voteAverage: real("vote_average"),
    voteCount: real("vote_count"),
    popularity: real("popularity"),
    nextEpisodeSeason: integer("next_episode_season"),
    nextEpisodeNumber: integer("next_episode_number"),
    nextEpisodeAirDate: text("next_episode_air_date"),
}, (table) => [
    check("tv_details_duration_check", sql`${table.episodeDurationMinutes} >= 0`),
    check("tv_details_seasons_check", sql`${table.totalSeasons} >= 0`),
    check("tv_details_episodes_check", sql`${table.totalEpisodes} >= 0`),
]);


/** Movie-only catalog fields remain concrete instead of extending TV metadata. */
export const movieDetails = sqliteTable("movie_details", {
    catalogItemId: integer("catalog_item_id").primaryKey().notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    originalName: text("original_name"),
    homepage: text("homepage"),
    durationMinutes: integer("duration_minutes").default(0).notNull(),
    originalLanguage: text("original_language"),
    voteAverage: real("vote_average"),
    voteCount: real("vote_count"),
    popularity: real("popularity"),
    budget: real("budget"),
    revenue: real("revenue"),
    tagline: text("tagline"),
    collectionExternalId: integer("collection_external_id"),
    directorName: text("director_name"),
    compositorName: text("compositor_name"),
}, (table) => [
    check("movie_details_duration_check", sql`${table.durationMinutes} >= 0`),
    check("movie_details_budget_check", sql`${table.budget} IS NULL OR ${table.budget} >= 0`),
    check("movie_details_revenue_check", sql`${table.revenue} IS NULL OR ${table.revenue} >= 0`),
    index("ix_movie_details_collection").on(table.collectionExternalId, table.catalogItemId),
    index("ix_movie_details_director").on(table.directorName, table.catalogItemId),
]);


/** Game-only provider and duration metadata; playtime belongs to a library entry. */
export const gameDetails = sqliteTable("game_details", {
    catalogItemId: integer("catalog_item_id").primaryKey().notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    gameEngine: text("game_engine"),
    gameModes: text("game_modes"),
    playerPerspective: text("player_perspective"),
    voteAverage: real("vote_average"),
    voteCount: real("vote_count"),
    igdbUrl: text("igdb_url"),
    hltbMainHours: real("hltb_main_hours"),
    hltbMainExtraHours: real("hltb_main_extra_hours"),
    hltbCompletionistHours: real("hltb_completionist_hours"),
    steamAppId: text("steam_app_id"),
    collectionExternalId: integer("collection_external_id"),
}, (table) => [
    check("game_details_hltb_main_check", sql`${table.hltbMainHours} IS NULL OR ${table.hltbMainHours} >= 0`),
    check("game_details_hltb_extra_check", sql`${table.hltbMainExtraHours} IS NULL OR ${table.hltbMainExtraHours} >= 0`),
    check("game_details_hltb_completionist_check", sql`${table.hltbCompletionistHours} IS NULL OR ${table.hltbCompletionistHours} >= 0`),
    index("ix_game_details_collection").on(table.collectionExternalId, table.catalogItemId),
    index("ix_game_details_engine").on(table.gameEngine, table.catalogItemId),
    index("ix_game_details_perspective").on(table.playerPerspective, table.catalogItemId),
]);


/** Book metadata supplied by Google Books; reading progress belongs to a library entry. */
export const bookDetails = sqliteTable("book_details", {
    catalogItemId: integer("catalog_item_id").primaryKey().notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    pages: integer("pages").default(0).notNull(),
    language: text("language"),
    publisher: text("publisher"),
}, (table) => [
    check("book_details_pages_check", sql`${table.pages} >= 0`),
    index("ix_book_details_language").on(table.language, table.catalogItemId),
    index("ix_book_details_publisher").on(table.publisher, table.catalogItemId),
]);


/** Manga metadata supplied by Jikan; nullable chapter counts are provider truth, not zero. */
export const mangaDetails = sqliteTable("manga_details", {
    catalogItemId: integer("catalog_item_id").primaryKey().notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    originalName: text("original_name"),
    chapters: integer("chapters"),
    productionStatus: text("production_status"),
    siteUrl: text("site_url"),
    endDate: text("end_date"),
    volumes: integer("volumes"),
    voteAverage: real("vote_average"),
    voteCount: real("vote_count"),
    popularity: real("popularity"),
    publisher: text("publisher"),
}, (table) => [
    check("manga_details_chapters_check", sql`${table.chapters} IS NULL OR ${table.chapters} >= 0`),
    check("manga_details_volumes_check", sql`${table.volumes} IS NULL OR ${table.volumes} >= 0`),
    index("ix_manga_details_status").on(table.productionStatus, table.catalogItemId),
    index("ix_manga_details_publisher").on(table.publisher, table.catalogItemId),
]);


export const tvSeason = sqliteTable("tv_season", {
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    episodeCount: integer("episode_count").notNull(),
}, (table) => [
    primaryKey({ columns: [table.catalogItemId, table.seasonNumber], name: "pk_tv_season" }),
    check("tv_season_number_check", sql`${table.seasonNumber} > 0`),
    check("tv_season_episode_count_check", sql`${table.episodeCount} >= 0`),
]);


export const tvActor = sqliteTable("tv_actor", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_tv_actor_item_name").on(table.catalogItemId, table.name),
    index("ix_tv_actor_name_item").on(table.name, table.catalogItemId),
]);


export const tvNetwork = sqliteTable("tv_network", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_tv_network_item_name").on(table.catalogItemId, table.name),
    index("ix_tv_network_name_item").on(table.name, table.catalogItemId),
]);


export const movieActor = sqliteTable("movie_actor", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_movie_actor_item_name").on(table.catalogItemId, table.name),
    index("ix_movie_actor_name_item").on(table.name, table.catalogItemId),
]);


/** Raw IGDB platform labels used to offer compatible user platform choices. */
export const gamePlatform = sqliteTable("game_platform", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_game_platform_item_name").on(table.catalogItemId, table.name),
    index("ix_game_platform_name_item").on(table.name, table.catalogItemId),
]);


/** A company can carry both roles for one game, so identity is item plus name. */
export const gameCompany = sqliteTable("game_company", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    publisher: integer("publisher", { mode: "boolean" }).default(false).notNull(),
    developer: integer("developer", { mode: "boolean" }).default(false).notNull(),
}, (table) => [
    uniqueIndex("ux_game_company_item_name").on(table.catalogItemId, table.name),
    index("ix_game_company_name_item").on(table.name, table.catalogItemId),
]);


export const bookAuthor = sqliteTable("book_author", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").default(1).notNull(),
}, (table) => [
    uniqueIndex("ux_book_author_item_name").on(table.catalogItemId, table.name),
    uniqueIndex("ux_book_author_item_position").on(table.catalogItemId, table.position),
    index("ix_book_author_name_item").on(table.name, table.catalogItemId),
    check("book_author_position_check", sql`${table.position} > 0`),
]);


export const mangaAuthor = sqliteTable("manga_author", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_manga_author_item_name").on(table.catalogItemId, table.name),
    index("ix_manga_author_name_item").on(table.name, table.catalogItemId),
]);


export const catalogItemRelations = relations(catalogItem, ({ one, many }) => ({
    tvDetails: one(tvDetails),
    movieDetails: one(movieDetails),
    gameDetails: one(gameDetails),
    bookDetails: one(bookDetails),
    mangaDetails: one(mangaDetails),
    sources: many(catalogSource),
    genres: many(catalogItemGenre),
    tvSeasons: many(tvSeason),
    tvActors: many(tvActor),
    tvNetworks: many(tvNetwork),
    movieActors: many(movieActor),
    gamePlatforms: many(gamePlatform),
    gameCompanies: many(gameCompany),
    bookAuthors: many(bookAuthor),
    mangaAuthors: many(mangaAuthor),
}));


export const catalogSourceRelations = relations(catalogSource, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [catalogSource.catalogItemId], references: [catalogItem.id] }),
}));


export const tvDetailsRelations = relations(tvDetails, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [tvDetails.catalogItemId], references: [catalogItem.id] }),
}));


export const movieDetailsRelations = relations(movieDetails, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [movieDetails.catalogItemId], references: [catalogItem.id] }),
}));


export const gameDetailsRelations = relations(gameDetails, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [gameDetails.catalogItemId], references: [catalogItem.id] }),
}));


export const bookDetailsRelations = relations(bookDetails, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [bookDetails.catalogItemId], references: [catalogItem.id] }),
}));


export const mangaDetailsRelations = relations(mangaDetails, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [mangaDetails.catalogItemId], references: [catalogItem.id] }),
}));


export const tvSeasonRelations = relations(tvSeason, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [tvSeason.catalogItemId], references: [catalogItem.id] }),
}));


export const movieActorRelations = relations(movieActor, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [movieActor.catalogItemId], references: [catalogItem.id] }),
}));


export const gamePlatformRelations = relations(gamePlatform, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [gamePlatform.catalogItemId], references: [catalogItem.id] }),
}));


export const gameCompanyRelations = relations(gameCompany, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [gameCompany.catalogItemId], references: [catalogItem.id] }),
}));


export const bookAuthorRelations = relations(bookAuthor, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [bookAuthor.catalogItemId], references: [catalogItem.id] }),
}));


export const mangaAuthorRelations = relations(mangaAuthor, ({ one }) => ({
    catalogItem: one(catalogItem, { fields: [mangaAuthor.catalogItemId], references: [catalogItem.id] }),
}));
