import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatDate} from "@/lib/utils/date-formatting";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {mediaDetailsJobSchema, paginationSchema} from "@/lib/schemas";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";
import {jobDetailsOptions} from "@/lib/client/react-query/query-options";
import {MediaCornerCommon} from "@/lib/client/components/media/base/MediaCornerCommon";


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
    const apiData = useSuspenseQuery(jobDetailsOptions(mediaType, job, name, filters)).data;
    const isMediaTypeActive = currentUser?.settings.some((s) => s.mediaType === apiData.kind && s.active) ?? false;

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
                    <MediaCard key={item.mediaId} mediaType={apiData.kind} item={item}>
                        <div className="absolute bottom-0 w-full space-y-1 rounded-b-sm p-3">
                            <div className="flex w-full items-center justify-between space-x-2 max-sm:text-sm">
                                <h3 className="grow truncate font-semibold text-primary" title={item.mediaName}>
                                    {item.mediaName}
                                </h3>
                            </div>
                            <div className="flex w-full flex-wrap items-center justify-between">
                                <div className="shrink-0 text-xs font-medium text-muted-foreground">
                                    {formatDate(item.releaseDate)}
                                </div>
                            </div>
                        </div>
                        {isMediaTypeActive && item.inUserList &&
                            <MediaCornerCommon
                                isCommon={item.inUserList}
                            />
                        }
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
