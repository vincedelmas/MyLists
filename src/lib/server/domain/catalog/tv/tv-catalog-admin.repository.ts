import {eq} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {catalogItem, tvDetails} from "@/lib/server/database/schema";
import {hasDefinedCatalogFields} from "@/lib/server/domain/catalog/catalog-admin-fields";


export type TvCatalogEdit = Partial<{
    name: string;
    originalName: string | null;
    releaseDate: string | null;
    lastAirDate: string | null;
    homepage: string | null;
    createdBy: string | null;
    duration: number;
    originCountry: string | null;
    prodStatus: string | null;
    synopsis: string | null;
    lockStatus: boolean;
    imageCover: string;
}>;


/** Manager edit boundary for canonical TV catalog fields. */
export class TvCatalogAdminRepository {
    constructor(private readonly kind: TvMediaType) {}

    async getEditableFields(catalogItemId: number) {
        const fields = await getDbClient()
            .select({
                name: catalogItem.name,
                originalName: tvDetails.originalName,
                releaseDate: catalogItem.releaseDate,
                lastAirDate: tvDetails.lastAirDate,
                homepage: tvDetails.homepage,
                createdBy: tvDetails.createdBy,
                duration: tvDetails.episodeDurationMinutes,
                originCountry: tvDetails.originCountry,
                prodStatus: tvDetails.productionStatus,
                synopsis: catalogItem.synopsis,
                lockStatus: catalogItem.locked,
            })
            .from(catalogItem)
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId))
            .get();
        return fields ? { kind: this.kind, fields } : undefined;
    }

    async updateEditableFields(catalogItemId: number, edit: TvCatalogEdit) {
        const catalogFields = {
            name: edit.name,
            releaseDate: edit.releaseDate,
            synopsis: edit.synopsis,
            locked: edit.lockStatus,
            imageCover: edit.imageCover ? getImageFilename(edit.imageCover) : undefined,
        };
        const detailFields = {
            originalName: edit.originalName,
            lastAirDate: edit.lastAirDate,
            homepage: edit.homepage,
            createdBy: edit.createdBy,
            episodeDurationMinutes: edit.duration,
            originCountry: edit.originCountry,
            productionStatus: edit.prodStatus,
        };
        if (hasDefinedCatalogFields(catalogFields)) {
            await getDbClient().update(catalogItem).set(catalogFields).where(eq(catalogItem.id, catalogItemId));
        }
        if (hasDefinedCatalogFields(detailFields)) {
            await getDbClient().update(tvDetails).set(detailFields).where(eq(tvDetails.catalogItemId, catalogItemId));
        }
        return true;
    }
}
