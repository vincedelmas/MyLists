import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, Status, TagAction} from "@/lib/utils/enums";
import {UpdateUserCustomCover, UpdateUserMedia} from "@/lib/schemas";
import {TvLibraryWriter} from "@/lib/server/domain/library/tv/tv-library.writer";
import {MovieLibraryWriter} from "@/lib/server/domain/library/movies/movie-library.writer";
import {GameLibraryWriter} from "@/lib/server/domain/library/games/game-library.writer";
import {BookLibraryWriter} from "@/lib/server/domain/library/books/book-library.writer";
import {MangaLibraryWriter} from "@/lib/server/domain/library/manga/manga-library.writer";
import {TvLibraryReadRepository} from "@/lib/server/domain/library/tv/tv-library-read.repository";
import {MovieLibraryReadRepository} from "@/lib/server/domain/library/movies/movie-library-read.repository";
import {GameLibraryReadRepository} from "@/lib/server/domain/library/games/game-library-read.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/library/books/book-library-read.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/library/manga/manga-library-read.repository";
import {getDbClient} from "@/lib/server/database/async-storage";
import {libraryTag} from "@/lib/server/database/schema";
import {and, asc, eq} from "drizzle-orm";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {CoverType} from "@/lib/types/media-common.types";


type TvKind = typeof MediaType.SERIES | typeof MediaType.ANIME;


/** Command boundary for canonical route-level catalog IDs. */
export class LibraryCommandService {
    constructor(
        private readonly tvWriters: Record<TvKind, TvLibraryWriter>,
        private readonly movieWriter: MovieLibraryWriter,
        private readonly gameWriter: GameLibraryWriter,
        private readonly bookWriter: BookLibraryWriter,
        private readonly mangaWriter: MangaLibraryWriter,
        private readonly tvReaders: Record<TvKind, TvLibraryReadRepository>,
        private readonly movieReader: MovieLibraryReadRepository,
        private readonly gameReader: GameLibraryReadRepository,
        private readonly bookReader: BookLibraryReadRepository,
        private readonly mangaReader: MangaLibraryReadRepository,
    ) {}

    async add(params: { userId: number; mediaType: MediaType; mediaId: number; status?: Status; silent?: boolean }) {
        const { userId, mediaType, mediaId, status, silent } = params;
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            await this.tvWriters[mediaType].add({ userId, mediaType, mediaId, status, silent });
        }
        else if (mediaType === MediaType.MOVIES) await this.movieWriter.add({ userId, mediaId, status, silent });
        else if (mediaType === MediaType.GAMES) await this.gameWriter.add({ userId, mediaId, status, silent });
        else if (mediaType === MediaType.BOOKS) await this.bookWriter.add({ userId, mediaId, status, silent });
        else await this.mangaWriter.add({ userId, mediaId, status, silent });
        return this.requireUserMedia(userId, mediaType, mediaId);
    }

    async update(params: { userId: number; mediaType: MediaType; mediaId: number; payload: UpdateUserMedia["payload"] }) {
        const { userId, mediaType, mediaId, payload } = params;
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            await this.tvWriters[mediaType].update({ userId, mediaType, mediaId, payload });
        }
        else if (mediaType === MediaType.MOVIES) await this.movieWriter.update({ userId, mediaId, payload });
        else if (mediaType === MediaType.GAMES) await this.gameWriter.update({ userId, mediaId, payload });
        else if (mediaType === MediaType.BOOKS) await this.bookWriter.update({ userId, mediaId, payload });
        else await this.mangaWriter.update({ userId, mediaId, payload });
        return this.requireUserMedia(userId, mediaType, mediaId);
    }

    async remove(params: { userId: number; mediaType: MediaType; mediaId: number }) {
        const { userId, mediaType, mediaId } = params;
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            await this.tvWriters[mediaType].remove({ userId, mediaType, mediaId });
        }
        else if (mediaType === MediaType.MOVIES) await this.movieWriter.remove(userId, mediaId);
        else if (mediaType === MediaType.GAMES) await this.gameWriter.remove(userId, mediaId);
        else if (mediaType === MediaType.BOOKS) await this.bookWriter.remove(userId, mediaId);
        else await this.mangaWriter.remove(userId, mediaId);
    }

    getTagNames(userId: number, mediaType: MediaType) {
        return getDbClient().select({ name: libraryTag.name }).from(libraryTag).where(and(
            eq(libraryTag.userId, userId),
            eq(libraryTag.kind, mediaType),
        )).orderBy(asc(libraryTag.name));
    }

    editTag(params: {
        userId: number;
        mediaType: MediaType;
        mediaId?: number;
        action: TagAction;
        tag: { name: string; oldName?: string };
    }) {
        const { userId, mediaType, mediaId, action, tag } = params;
        if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
            return this.tvWriters[mediaType].editTag({ userId, mediaType, mediaId, action, tag });
        }
        if (mediaType === MediaType.MOVIES) return this.movieWriter.editTag({ userId, mediaId, action, tag });
        if (mediaType === MediaType.GAMES) return this.gameWriter.editTag({ userId, mediaId, action, tag });
        if (mediaType === MediaType.BOOKS) return this.bookWriter.editTag({ userId, mediaId, action, tag });
        return this.mangaWriter.editTag({ userId, mediaId, action, tag });
    }

    async updateCustomCover(userId: number, payload: UpdateUserCustomCover) {
        await this.requireUserMedia(userId, payload.mediaType, payload.mediaId);
        let customCover: string | null = null;
        if (!payload.remove) {
            const dirSaveName = `${payload.mediaType}-covers` as CoverType;
            customCover = payload.imageFile
                ? await saveUploadedImage({ dirSaveName, file: payload.imageFile })
                : await saveImageFromUrl({ dirSaveName, imageUrl: payload.imageUrl });
            if (!customCover || customCover === "default.jpg") {
                throw new FormattedError("Could not update the custom cover. Please choose another one.");
            }
        }

        if (payload.mediaType === MediaType.SERIES || payload.mediaType === MediaType.ANIME) {
            await this.tvWriters[payload.mediaType].updateCustomCover({
                userId, mediaType: payload.mediaType, mediaId: payload.mediaId, customCover,
            });
        }
        else if (payload.mediaType === MediaType.MOVIES) {
            await this.movieWriter.updateCustomCover({ userId, mediaId: payload.mediaId, customCover });
        }
        else if (payload.mediaType === MediaType.GAMES) {
            await this.gameWriter.updateCustomCover({ userId, mediaId: payload.mediaId, customCover });
        }
        else if (payload.mediaType === MediaType.BOOKS) {
            await this.bookWriter.updateCustomCover({ userId, mediaId: payload.mediaId, customCover });
        }
        else await this.mangaWriter.updateCustomCover({ userId, mediaId: payload.mediaId, customCover });
        return this.requireUserMedia(userId, payload.mediaType, payload.mediaId);
    }

    private async requireUserMedia(userId: number, mediaType: MediaType, mediaId: number): Promise<any> {
        const result = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME
            ? await this.tvReaders[mediaType].findUserMedia(userId, mediaId)
            : mediaType === MediaType.MOVIES
                ? await this.movieReader.findUserMedia(userId, mediaId)
                : mediaType === MediaType.GAMES
                    ? await this.gameReader.findUserMedia(userId, mediaId)
                    : mediaType === MediaType.BOOKS
                        ? await this.bookReader.findUserMedia(userId, mediaId)
                        : await this.mangaReader.findUserMedia(userId, mediaId);
        if (!result) throw new FormattedError("Media not in your list");
        return result;
    }
}
