import React from "react";
import {JobType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/number-formatting";
import {THEME_ICONS_MAP} from "@/lib/utils/theme-utils";
import {Building2, Clapperboard, Music2, RadioTower, UserRound} from "lucide-react";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
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
            return result.success ? result.data : false;
        },
    },
    validateSearch: paginationSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ params: { mediaType, job, name }, deps: { search } }) => ({
        jobDetailsQueryOptions: jobDetailsOptions(mediaType, job, name, search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.jobDetailsQueryOptions);
    },
    component: JobInfoPage,
});


const JOB_PRESENTATION = {
    [JobType.ACTOR]: {
        icon: UserRound,
        sectionTitle: "Filmography",
        descriptionVerb: "featuring",
        descriptionSuffix: " in the cast",
    },
    [JobType.CREATOR]: {
        icon: Clapperboard,
        sectionTitle: "Works",
        descriptionVerb: "created by",
        descriptionSuffix: "",
    },
    [JobType.COMPOSITOR]: {
        icon: Music2,
        sectionTitle: "Credits",
        descriptionVerb: "featuring music by",
        descriptionSuffix: "",
    },
    [JobType.PUBLISHER]: {
        icon: Building2,
        sectionTitle: "Catalogue",
        descriptionVerb: "published by",
        descriptionSuffix: "",
    },
    [JobType.PLATFORM]: {
        icon: RadioTower,
        sectionTitle: "Catalogue",
        descriptionVerb: "associated with",
        descriptionSuffix: "",
    },
};


function JobInfoPage() {
    const { currentUser } = useAuth();
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { mediaType, job, name } = Route.useParams();
    const { jobDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(jobDetailsQueryOptions).data;
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);
    const MediaIcon = THEME_ICONS_MAP[mediaType];
    const { icon: JobIcon, sectionTitle, descriptionVerb, descriptionSuffix } = JOB_PRESENTATION[job];

    const onPageChange = async (newPage: number) => {
        await navigate({ search: { page: newPage } });
    };

    return (
        <PageTitle title={`${name}'s ${capitalize(mediaType)}`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title={name}
                    asideIcon={MediaIcon}
                    eyebrowIcon={JobIcon}
                    eyebrow={`${capitalize(job)} · ${capitalize(mediaType)}`}
                    asideLabel={`In this ${sectionTitle.toLowerCase()}`}
                    description={`${capitalize(mediaType)} ${descriptionVerb} ${name}${descriptionSuffix}.`}
                    asideValue={<>{formatNumber(apiData.total)} {apiData.total === 1 ? "title" : "titles"}</>}
                />

                <div className="flex items-center justify-between gap-4 pb-4 pt-6">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {sectionTitle}
                    </h2>
                    {apiData.pages > 1 &&
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            Page {filters.page ?? 1} / {apiData.pages}
                        </span>
                    }
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {apiData.items.map((item) =>
                        <MediaCard key={item.mediaId} item={item} mediaType={mediaType}>
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
            </div>
        </PageTitle>
    );
}
