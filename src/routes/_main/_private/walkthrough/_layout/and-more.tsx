import {createFileRoute} from "@tanstack/react-router";
import {Award, LayoutGrid, Popcorn, TrendingUp, Trophy} from "lucide-react";
import {OnboardingContainer, OnboardingFeatureCard, OnboardingGrid, OnboardingNote, OnboardingSection} from "@/lib/client/components/onboarding/OnBoardingShared";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/and-more")({
    component: AndMoreOnboarding,
});


function AndMoreOnboarding() {
    return (
        <OnboardingContainer>
            <OnboardingSection
                icon={LayoutGrid}
                title="And More..."
                description={
                    "MyLists.info is more than just a tracking tool. Explore our community features " +
                    "and daily challenges."
                }
            />

            <OnboardingGrid>
                <OnboardingFeatureCard
                    icon={Trophy}
                    title="Hall of Fame"
                    description="See how you stack up against the community! The HoF ranks profiles by time spent and
                    lists size. You can view global rankings or filter by specific media types to see your personal rank."
                />
                <OnboardingFeatureCard
                    icon={Popcorn}
                    title="Moviedle Game"
                    description="Test your film knowledge with our daily 'Moviedle' challenge. Try to guess the
                     movie of the day in as few tries as possible and share your score with friends."
                />
                <OnboardingFeatureCard
                    icon={TrendingUp}
                    title="Global Trends"
                    description="Stay up to date with what's hot. The Trends section shows the most popular
                    movies and series currently trending on TMDB, helping you find your next obsession."
                />
                <OnboardingFeatureCard
                    icon={Award}
                    title="Achievements"
                    description="Earn badges and awards as you grow your lists! From 'Movie Buff' to 'Manga Sage',
                    your profile showcases your dedication to your favorite hobbies."
                />
            </OnboardingGrid>

            <OnboardingNote title="Where to find these?">
                All of these features are available in the <strong>top navigation bar</strong>. Click on 'Community' at any time to
                jump straight into the action!
            </OnboardingNote>
        </OnboardingContainer>
    );
}
