import {useRef} from "react";
import {MediaType} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery, useQueryClient} from "@tanstack/react-query";
import {Header} from "@/lib/client/components/media/base/Header";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";
import {AlertTriangle, Bookmark, Grid2X2, ListFilter, Play, Plus, PlusCircle, Search, Settings2, Star, Users} from "lucide-react";
import {
    OnboardingContainer,
    OnboardingDemoBox,
    OnboardingFeatureCard,
    OnboardingGrid,
    OnboardingNote,
    OnboardingSection,
    OnboardingSubSection
} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/manage-lists")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(mediaListOptions(MediaType.MOVIES, "DemoProfile", {}));
    },
    component: ListsOnboarding,
});


function ListsOnboarding() {
    const queryClient = useQueryClient();
    const apiData = useSuspenseQuery(mediaListOptions(MediaType.MOVIES, "DemoProfile", {})).data;
    const prevMediaIdRef = useRef<number | null>(null);

    const handleSurpriseMe = async () => {
        const totalItems = apiData.results.pagination.totalItems;
        if (totalItems === 0) return;

        const perPage = 50;

        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * totalItems);
            const targetPage = Math.floor(randomIndex / perPage) + 1;
            const itemIndex = randomIndex % perPage;

            const items = (await queryClient.fetchQuery(
                mediaListOptions(MediaType.MOVIES, "DemoProfile", { page: targetPage, perPage })
            )).results.items;

            const item = items[itemIndex];
            if (item && item.mediaId !== prevMediaIdRef.current) {
                prevMediaIdRef.current = item.mediaId;
                window.open(`/details/movies/${item.mediaId}`, '_blank');
                return;
            }
        }
    };

    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={Grid2X2}
                title="Your Lists"
                description="These are your personal lists. Whether it's 10 items or 1,000, these tools should help you to
                keep everything organized and accessible."
            />

            <OnboardingSubSection
                icon={Search}
                title="Finding & Filtering"
                description={
                    "Use the header tools to drill down into your list. You can search by name, " +
                    "sort by date/rating/name/etc..., or use the advanced filter panel for specific options."
                }
            >
                <OnboardingDemoBox>
                    <Header
                        filters={{}}
                        isGrid={true}
                        pagination={apiData.results.pagination}
                        onSurpriseMeClick={handleSurpriseMe}
                        onGridClick={() => undefined}
                        onSortChange={() => undefined}
                        onFilterClick={() => undefined}
                        onStatusChange={() => undefined}
                        allStatuses={statusUtils.byMediaType(MediaType.MOVIES)}
                    />
                </OnboardingDemoBox>

                <OnboardingGrid>
                    <OnboardingFeatureCard
                        icon={ListFilter}
                        title="Genres & Countries"
                        description="Filter by specific categories like 'Action' or 'Drama', or find media produced in specific countries."
                    />
                    <OnboardingFeatureCard
                        icon={Users}
                        title="Cast & Creators"
                        description="Use the search filters to find works involving specific actors, directors, or even specific networks/studios."
                    />
                    <OnboardingFeatureCard
                        icon={Star}
                        title="Miscellaneous"
                        description="Quickly isolate your Favorites, media with personal Comments, or hide items you have in common with other users."
                    />
                    <OnboardingFeatureCard
                        icon={Bookmark}
                        title="Custom Tags"
                        description="Filter using custom tags (like 'Top Sci-Fi') to view curated subsets of your lists."
                    />
                </OnboardingGrid>

                <OnboardingNote title="Note">
                    You can combine filters! For example, selecting <strong>Sci-Fi</strong> and{" "}
                    <strong>Favorites</strong> will show only your favorite science fiction titles.
                </OnboardingNote>
            </OnboardingSubSection>

            <OnboardingSubSection
                title="The Media Card"
                description="Every item in your grid displays its most important info at a glance. Here is how to read your cards:"
            >
                <OnboardingDemoBox>
                    <BaseMediaListItem
                        rating={7.5}
                        isCurrent={true}
                        allStatuses={[]}
                        isConnected={true}
                        mediaType={MediaType.MOVIES}
                        userMedia={apiData.results.items[0]}
                        queryOption={mediaListOptions(MediaType.MOVIES, "DemoProfile", {})}
                        redoDisplay={"redo" in apiData.results.items[0] && !!apiData.results.items[0].redo &&
                            <DisplayRedoValue
                                redoValue={apiData.results.items[0].redo}
                            />
                        }
                    />
                </OnboardingDemoBox>
                <OnboardingGrid>
                    <OnboardingFeatureCard
                        icon={Play}
                        title="Progression"
                        description={
                            "Top-left shows your current spot: Seasons/Episodes, Playtime, " +
                            "Pages read, Chapters read, etc. (nothing for movies)."
                        }
                    />
                    <OnboardingFeatureCard
                        icon={Settings2}
                        title="Quick Edit"
                        description={
                            "Top-right gear opens a modal to update your progress, rating, or status without leaving the page."
                        }
                    />
                </OnboardingGrid>
            </OnboardingSubSection>

            <OnboardingSubSection
                title="Managing & Quick Adding"
                description="Interaction changes depending on whose list you are viewing."
            >
                <OnboardingGrid>
                    <OnboardingFeatureCard
                        icon={Settings2}
                        title="On Your Own List"
                        description={
                            "Click the gear icon to open the full editor. You can change everything: " +
                            "specific episodes, detailed ratings, favorites, and personal comments."
                        }
                    />
                    <OnboardingFeatureCard
                        icon={Plus}
                        title="On Others' Lists (Fast Add)"
                        description={
                            <span>
                                See something you like on a follows's list? Click the <PlusCircle className="inline size-4 text-primary"/>
                                {" "} button to instantly add it to your list.
                            </span>
                        }
                    />
                </OnboardingGrid>
                <OnboardingNote title="Fast Add Behavior" variant="warning" icon={AlertTriangle}>
                    Fast Add is designed for speed. It adds the media at the very beginning (e.g., Season 1, Episode 1).
                    If you need to log specific progress for a long series, visit your own list to use the full editor!
                </OnboardingNote>

                <OnboardingNote title="List View vs Grid View">
                    Prefer a spreadsheet-style look? Use the <strong>View Toggle</strong> in the header to switch to <strong>Table Mode</strong>.
                    This is great for faster information and faster loading (no covers).
                </OnboardingNote>
            </OnboardingSubSection>
        </OnboardingContainer>
    );
}
