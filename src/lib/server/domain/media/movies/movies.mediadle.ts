import type {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {defineMediadleCatalog} from "@/lib/server/domain/mediadle/mediadle-catalog";
import type {MovieServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";


export const createMoviesMediadleCatalog = (definition: MovieServerDefinition, mediaService: MoviesService) => {
    return defineMediadleCatalog({
        mediaService,
        mediaType: definition.identity.mediaType,
    });
};
