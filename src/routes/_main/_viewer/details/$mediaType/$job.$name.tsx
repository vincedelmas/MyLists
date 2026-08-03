import React from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {mediaDetailsJobSchema, paginationSchema} from "@/lib/schemas";
import {jobDetailsOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardRightCorner, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const Route = createFileRoute("/_main/_viewer/details/$mediaType/$job/$name")({
    params: {
        parse: (params) => {
            const result = mediaDetailsJobSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    validateSearch: paginationSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, params: { mediaType, job, name }, deps: { search } }) => {
        return queryClient.ensureQueryData(jobDetailsOptions(mediaType, job, name, search));
    },
    component: JobInfoPage,
});


function JobInfoPage() {
    const { currentUser } = useAuth();
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { mediaType, job, name } = Route.useParams();
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);
    const apiData = useSuspenseQuery(jobDetailsOptions(mediaType, job, name, filters)).data;

    const onPageChange = async (newPage: number) => {
        await navigate({ search: { page: newPage } });
    };

    return (
        <PageTitle
            title={`${name}'s ${capitalize(mediaType)}`}
            subtitle={`Found ${apiData.total} titles across ${apiData.pages} pages`}
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-4">
                {apiData.items.map((item) =>
                    <MediaCard item={item} mediaType={mediaType}>
                        {(isMediaTypeActive && item.inUserList) &&
                            <MediaCardRightCorner>
                                <DisplayInUserListCheck/>
                            </MediaCardRightCorner>
                        }
                        <MediaCardFooter>
                            <MediaCardTitle title={item.mediaName}>
                                {item.mediaName}
                            </MediaCardTitle>
                            <MediaCardMeta>
                                <MediaCardDetails>
                                    <MediaReleaseDate date={item.releaseDate}/>
                                </MediaCardDetails>
                            </MediaCardMeta>
                        </MediaCardFooter>
                    </MediaCard>
                )}
            </div>
            <Pagination
                totalPages={apiData.pages}
                onChangePage={onPageChange}
                currentPage={filters.page ?? 1}
            />
        </PageTitle>
    );
}
