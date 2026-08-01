import {createFileRoute} from "@tanstack/react-router";
import {SearchBar} from "@/lib/client/components/navbar/SearchBar";
import {ArrowBigUpDash, Search, TriangleAlert} from "lucide-react";
import {OnboardingContainer, OnboardingDemoBox, OnboardingNote, OnboardingSection, OnboardingSubSection} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/search-media")({
    component: SearchMediaOnboarding,
});


function SearchMediaOnboarding() {
    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={Search}
                title="How To Search For Media"
                description={
                    <span>
                        Everything on MyLists starts with a search. You can find the search bar
                        at the <span className="text-foreground font-semibold">top of your screen</span> in the navbar.
                    </span>
                }
            >
            </OnboardingSection>

            <OnboardingSubSection
                title="1. Select the Search Type"
                description={
                    "Click the left dropdown to choose what kind of media you are looking for. " +
                    "It defaults to Media (Series, Movies, and Anime)."
                }
            >
                <OnboardingDemoBox>
                    <div className="flex items-center w-full max-w-md shadow-sm opacity-70">
                        <SearchBar/>
                    </div>
                    <div className="absolute bottom-0 left-10 bg-primary text-primary-foreground font-bold text-[10px] px-2 py-1
                    rounded flex items-center gap-1">
                        HERE TO CHANGE MEDIA TYPE <ArrowBigUpDash className="size-3 animate-bounce"/>
                    </div>
                </OnboardingDemoBox>

                <OnboardingNote title="Note" icon={TriangleAlert} variant="warning">
                    The <b>Anime list</b> is not activated by default.
                    See 'Activate More Lists Type', on the left sidebar.
                </OnboardingNote>

                <OnboardingNote title="Info">
                    You can search for <strong>Users</strong> too! Switch the type to 'Users' to
                    find your friends and see their profile and lists.
                </OnboardingNote>
            </OnboardingSubSection>

            <OnboardingSubSection
                title="2. View Results"
                description="As you type, results will appear in a dropdown. We show the title, media type, and release date."
            >
                <OnboardingNote title="Caveat" icon={TriangleAlert} variant="warning">
                    The quality of the search is tied to the API used by MyLists under the hood. Sometimes results are
                    not what you would expect (looking at you Games!).
                </OnboardingNote>
            </OnboardingSubSection>
        </OnboardingContainer>
    );
}
