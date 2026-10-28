import {hashKey, type Mutation, type QueryClient} from "@tanstack/react-query";
import type {Tag} from "@/lib/types/media-common.types";
import {type MediaType, TagAction} from "@/lib/utils/enums";
import {mediaDetailsOptions} from "@/lib/client/react-query/query-options/media.options";
import type {UserMedia, UserMediaItem, ListPagination} from "@/lib/types/query.options.types";


type MediaListData = { results: { items: UserMediaItem[]; pagination: ListPagination } };


export const userMediaEditKey = (mediaType: MediaType, mediaId?: number) => {
    return ["userMediaEdit", mediaType, mediaId] as const;
}


export const createUserMediaCache = (queryClient: QueryClient, username: string, mediaType: MediaType, mediaId: number) => {
    const listsKey = ["userList", mediaType, username] as const;
    const detailsKey = mediaDetailsOptions(mediaType, mediaId).queryKey;

    const cancel = (allLists = false) => Promise.all([
        queryClient.cancelQueries({ queryKey: detailsKey, exact: true }),
        queryClient.cancelQueries({ queryKey: allLists ? ["userList", mediaType] : listsKey }),
    ]);

    return {
        cancel,

        async update(patch: Partial<UserMedia> & { tags?: never }) {
            await cancel();

            queryClient.setQueryData(detailsKey, (oldData) => {
                if (!oldData?.userMedia) return oldData;

                return {
                    ...oldData,
                    userMedia: {
                        ...oldData.userMedia,
                        ...patch,
                    },
                }
            });

            queryClient.setQueriesData<MediaListData>({ queryKey: listsKey }, (oldData) => {
                if (!oldData) return;

                return {
                    ...oldData,
                    results: {
                        ...oldData.results,
                        items: oldData.results.items.map(i => i.mediaId === mediaId
                            ? { ...i, ...Object.fromEntries(Object.entries(patch).filter(([key]) => key in i)) } : i),
                    },
                }
            });

            await queryClient.invalidateQueries({ queryKey: listsKey, refetchType: "none" });
        },

        async editTag(tag: Tag, action: typeof TagAction.ADD | typeof TagAction.DELETE_ONE) {
            await cancel();

            queryClient.setQueryData(detailsKey, (oldData) => {
                if (!oldData?.userMedia) return oldData;

                return {
                    ...oldData,
                    userMedia: {
                        ...oldData.userMedia,
                        tags: action === TagAction.ADD
                            ? [...oldData.userMedia.tags.filter(item => item.name !== tag.name), { name: tag.name }]
                            : oldData.userMedia.tags.filter(item => item.name !== tag.name),
                    },
                }
            });
        },

        async add() {
            await cancel(true);

            queryClient.setQueriesData<MediaListData>({
                queryKey: ["userList", mediaType],
                predicate: (query) => query.queryKey[2] !== username,
            }, (oldData) => {
                if (!oldData) return;

                return {
                    ...oldData,
                    results: {
                        ...oldData.results,
                        items: oldData.results.items.map(i => i.mediaId === mediaId ? { ...i, common: true } : i),
                    },
                }
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: listsKey }),
                queryClient.invalidateQueries({ queryKey: detailsKey, exact: true }),
            ]);
        },

        async remove() {
            await cancel(true);

            queryClient.setQueryData(detailsKey, oldData => oldData && ({ ...oldData, userMedia: null }));

            queryClient.setQueriesData<MediaListData>({ queryKey: listsKey }, (oldData) => {
                if (!oldData) return;

                return {
                    ...oldData,
                    results: {
                        ...oldData.results,
                        items: oldData.results.items.filter(item => item.mediaId !== mediaId),
                    },
                }
            });

            queryClient.setQueriesData<MediaListData>({
                queryKey: ["userList", mediaType],
                predicate: (query) => query.queryKey[2] !== username,
            }, (oldData) => {
                if (!oldData) return;

                return {
                    ...oldData,
                    results: {
                        ...oldData.results,
                        items: oldData.results.items.map(i => i.mediaId === mediaId ? { ...i, common: false } : i),
                    },
                }
            });
        },

        startEditing() {
            const mutations = queryClient.getMutationCache();
            const key = userMediaEditKey(mediaType, mediaId);
            const edits = new Set<Mutation>(mutations.findAll({ mutationKey: key, status: "pending" }));
            const stop = mutations.subscribe(event => {
                if (event.type === "updated" && event.action.type === "pending"
                    && hashKey(event.mutation.options.mutationKey ?? []) === hashKey(key)) {
                    edits.add(event.mutation);
                }
            });

            return {
                stop,
                async finish() {
                    stop();
                    const pending = [...edits].filter(mutation => mutation.state.status === "pending");
                    if (pending.length) {
                        await new Promise<void>(resolve => {
                            const unsubscribe = mutations.subscribe(() => {
                                if (pending.every(mutation => mutation.state.status !== "pending")) {
                                    unsubscribe();
                                    resolve();
                                }
                            });
                        });
                    }
                    // A cancelled activity correction resolves successfully with null, without saving.
                    const saved = [...edits].some(mutation => mutation.state.status === "success" && mutation.state.data !== null);
                    if (saved) await queryClient.invalidateQueries({ queryKey: listsKey });
                    return saved;
                },
            };
        },
    };
};
