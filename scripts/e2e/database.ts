import {join} from "node:path";
import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {hashPassword} from "better-auth/crypto";
import {MediaType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {createLocalAccountIssuer} from "better-auth/db";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {movies, password, privateCollection, privateImport, publicCollection, users} from "./data";


// This script can reset data only in test runner temp dir
if (!process.env.MYLISTS_E2E_DIR) {
    throw new Error("Start browser tests with bun run test:e2e.");
}


const sqlite = new Database(join(process.env.MYLISTS_E2E_DIR, "site.db"));

sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA busy_timeout = 10000");

const db = drizzle(sqlite, { schema, casing: "snake_case" });
migrate(db, { migrationsFolder: "./drizzle" });

sqlite.run("PRAGMA foreign_keys = ON");


const now = new Date();
const hashedPassword = await hashPassword(password);

db.transaction(() => {
    db.delete(schema.user).run();

    // Route fixtures also create media and season metadata; clear them between tests.
    db.delete(schema.seriesEpisodesPerSeason).run();
    db.delete(schema.animeEpisodesPerSeason).run();
    for (const mediaType of Object.values(MediaType)) {
        db.delete(schema[mediaType]).run();
    }

    for (const user of Object.values(users)) {
        db.insert(schema.user)
            .values({
                ...user,
                emailVerified: true,
                showOnboarding: false,
                showUpdateModal: false,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            }).run();

        db.insert(schema.account)
            .values({
                createdAt: now,
                updatedAt: now,
                userId: user.id,
                providerId: "credential",
                password: hashedPassword,
                accountId: String(user.id),
                issuer: createLocalAccountIssuer("credential"),
            }).run();

        for (const mediaType of Object.values(MediaType)) {
            const statuses = getMediaDefinition(mediaType).statuses;
            const seededList = mediaType === MediaType.MOVIES && (user.id === users.owner.id || user.id === users.restricted.id);

            db.insert(schema.userMediaSettings)
                .values({
                    mediaType,
                    userId: user.id,
                    totalEntries: seededList ? 1 : 0,
                    active: mediaType === MediaType.MOVIES || mediaType === MediaType.SERIES,
                    statusCounts: Object.fromEntries(statuses.map(status => [
                        status, seededList && status === Status.PLAN_TO_WATCH ? 1 : 0,
                    ])) as Record<Status, number>,
                }).run();
        }
    }

    db.insert(schema.followers)
        .values({
            status: "accepted",
            followedId: users.owner.id,
            followerId: users.follower.id,
        }).run();

    db.insert(schema.movies)
        .values(Object.values(movies).map(movie => ({
            ...movie,
            duration: 100,
            apiId: movie.id,
            lockStatus: true,
            releaseDate: "2020-01-01",
            imageCover: "default.jpg",
        }))).run();

    db.insert(schema.moviesList)
        .values([users.owner, users.restricted].map(user => ({
            userId: user.id,
            mediaId: movies.private.id,
            status: Status.PLAN_TO_WATCH,
        }))).run();

    db.insert(schema.collections)
        .values([
            {
                ...privateCollection,
                privacy: "private",
                ownerId: users.owner.id,
                mediaType: MediaType.MOVIES,
            },
            {
                ...publicCollection,
                privacy: "public",
                ownerId: users.owner.id,
                mediaType: MediaType.MOVIES,
            },
        ]).run();

    db.insert(schema.collectionItems)
        .values({
            orderIndex: 0,
            mediaId: movies.editable.id,
            mediaType: MediaType.MOVIES,
            collectionId: privateCollection.id,
        }).run();

    db.insert(schema.importJobs)
        .values({
            totalCount: 1,
            failedCount: 1,
            processedCount: 1,
            source: "mylists",
            id: privateImport.id,
            userId: users.owner.id,
            status: "completed_with_errors",
        }).run();

    db.insert(schema.importItems)
        .values({
            payload: {},
            rowNumber: 2,
            status: "failed",
            jobId: privateImport.id,
            name: privateImport.name,
            statusReason: privateImport.reason,
        }).run();
});


sqlite.close();
