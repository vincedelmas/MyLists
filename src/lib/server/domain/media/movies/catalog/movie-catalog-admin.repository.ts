import {and, count, eq, lte, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType} from "@/lib/utils/enums";
import {catalogItem, movieDetails} from "@/lib/server/database/schema";
import {hasDefinedCatalogFields} from "@/lib/server/domain/media/shared/catalog/catalog-admin-fields";


export type MovieCatalogEdit = Partial<{
    originalName: string | null;
    name: string;
    directorName: string | null;
    releaseDate: string | null;
    duration: number;
    synopsis: string | null;
    budget: number | null;
    revenue: number | null;
    tagline: string | null;
    originalLanguage: string | null;
    lockStatus: boolean;
    homepage: string | null;
    imageCover: string;
}>;


/** Manager edit boundary for the canonical movie catalog. */
export class MovieCatalogAdminRepository {
    async getEditableFields(catalogItemId: number) {
        const fields = getDbClient()
            .select({
                name: catalogItem.name,
                originalName: movieDetails.originalName,
                directorName: movieDetails.directorName,
                releaseDate: catalogItem.releaseDate,
                duration: movieDetails.durationMinutes,
                synopsis: catalogItem.synopsis,
                budget: movieDetails.budget,
                revenue: movieDetails.revenue,
                tagline: movieDetails.tagline,
                originalLanguage: movieDetails.originalLanguage,
                lockStatus: catalogItem.locked,
                homepage: movieDetails.homepage,
            })
            .from(catalogItem)
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId))
            .get();

        return fields ? { kind: MediaType.MOVIES, fields } : undefined;
    }

    async lockOldMovies() {
        const [{ value }] = await getDbClient()
            .select({ value: count() })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.MOVIES),
                eq(catalogItem.locked, false),
                lte(catalogItem.releaseDate, sql`date('now', '-6 months')`),
            ));
        await getDbClient().update(catalogItem).set({ locked: true }).where(and(
            eq(catalogItem.kind, MediaType.MOVIES),
            eq(catalogItem.locked, false),
            lte(catalogItem.releaseDate, sql`date('now', '-6 months')`),
        ));
        return value;
    }

    async updateEditableFields(catalogItemId: number, edit: MovieCatalogEdit) {
        const catalogFields = {
            name: edit.name,
            synopsis: edit.synopsis,
            locked: edit.lockStatus,
            releaseDate: edit.releaseDate,
            imageCover: edit.imageCover ? getImageFilename(edit.imageCover) : undefined,
        };

        const detailFields = {
            originalName: edit.originalName,
            directorName: edit.directorName,
            durationMinutes: edit.duration,
            budget: edit.budget,
            revenue: edit.revenue,
            tagline: edit.tagline,
            originalLanguage: edit.originalLanguage,
            homepage: edit.homepage,
        };
        if (hasDefinedCatalogFields(catalogFields)) {
            await getDbClient().update(catalogItem).set(catalogFields).where(eq(catalogItem.id, catalogItemId));
        }
        if (hasDefinedCatalogFields(detailFields)) {
            await getDbClient().update(movieDetails).set(detailFields).where(eq(movieDetails.catalogItemId, catalogItemId));
        }
        return true;
    }
}
