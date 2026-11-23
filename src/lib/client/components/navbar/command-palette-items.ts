import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import type {useNavigate} from "@tanstack/react-router";
import {getActiveMediaSettings, resolveMediaTypeActive, type MediaListActivationSetting} from "@/lib/utils/media/list-activation";
import {
    Activity,
    Award,
    BarChart2,
    BookOpenCheck,
    BookPlus,
    Brush,
    Calendar,
    ChartNoAxesColumn,
    CircleUserRound,
    Clapperboard,
    GitCompareArrows,
    KeyRound,
    LibraryBig,
    Lightbulb,
    ListOrdered,
    ListPlus,
    ListRestart,
    LogIn,
    Play,
    Plug,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    TrendingUp,
    Trophy,
    Upload,
    User,
    UserPlus,
    UsersRound,
    Zap,
    type LucideIcon,
} from "lucide-react";


export interface PaletteNavItem {
    id: string;
    label: string;
    keywords: string;
    icon?: LucideIcon;
    onSelect: () => void;
    mediaType?: MediaType;
    section: "quick" | "lists" | "pages";
}


interface CommandPaletteUser {
    name: string;
    settings: readonly MediaListActivationSetting[];
    capabilities: {
        enterAdminDashboard: boolean;
    };
}


export const matchesPaletteTokens = (query: string, label: string, keywords: string) => {
    const haystack = `${label} ${keywords}`.toLowerCase();

    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every(token => haystack.includes(token));
};


const getPublicNavItems = (navigate: ReturnType<typeof useNavigate>): PaletteNavItem[] => [
    {
        section: "pages",
        label: "Moviedle",
        icon: Clapperboard,
        id: "page-moviedle",
        keywords: "daily game guess movie poster",
        onSelect: () => void navigate({ to: "/moviedle" }),
    },
    {
        id: "page-wcf",
        section: "pages",
        icon: GitCompareArrows,
        label: "Which Came First?",
        keywords: "wcf game release date quiz",
        onSelect: () => void navigate({ to: "/which-came-first" }),
    },
    {
        section: "pages",
        icon: ListOrdered,
        label: "Community Collections",
        id: "page-discover-collections",
        keywords: "discover browse public lists",
        onSelect: () => void navigate({ to: "/collections/discover" }),
    },
    {
        icon: Trophy,
        section: "pages",
        label: "Hall of Fame",
        id: "page-hall-of-fame",
        keywords: "leaderboard rankings top users",
        onSelect: () => void navigate({ to: "/hall-of-fame" }),
    },
    {
        icon: BarChart2,
        section: "pages",
        label: "Platform Stats",
        id: "page-platform-stats",
        keywords: "global site statistics",
        onSelect: () => void navigate({ to: "/platform-stats" }),
    },
    {
        label: "Trends",
        section: "pages",
        icon: TrendingUp,
        id: "page-trends",
        keywords: "trending popular movies series games",
        onSelect: () => void navigate({ to: "/trends" }),
    },
    {
        icon: Activity,
        section: "pages",
        id: "page-features",
        label: "News & Features",
        keywords: "changelog updates release notes",
        onSelect: () => void navigate({ to: "/features" }),
    },
    {
        icon: Lightbulb,
        section: "pages",
        id: "page-feature-votes",
        label: "Feature Voting",
        keywords: "ideas suggestions roadmap vote",
        onSelect: () => void navigate({ to: "/features-vote" }),
    },
];


interface PaletteNavItemsProps {
    currentDate?: string;
    currentUser: CommandPaletteUser | null;
    navigate: ReturnType<typeof useNavigate>;
}


export const getCommandPaletteNavItems = ({ navigate, currentUser, currentDate }: PaletteNavItemsProps): PaletteNavItem[] => {
    if (!currentUser) {
        return [
            {
                icon: LogIn,
                label: "Login",
                id: "auth-login",
                section: "quick",
                keywords: "sign in account",
                onSelect: () => void navigate({ to: "/login" }),
            },
            {
                icon: UserPlus,
                section: "quick",
                label: "Register",
                id: "auth-register",
                keywords: "sign up create account",
                onSelect: () => void navigate({ to: "/register" }),
            },
            ...getPublicNavItems(navigate),
        ];
    }

    const activeMediaSettings = getActiveMediaSettings(currentUser.settings);
    const [currentYear, currentMonth] = currentDate?.split("-") ?? [];
    const booksActive = resolveMediaTypeActive(currentUser.settings, MediaType.BOOKS);

    return [
        {
            icon: Calendar,
            section: "quick",
            id: "quick-calendar",
            label: "Release Calendar",
            keywords: "upcoming releases schedule episodes movies games",
            onSelect: () => void navigate({ to: "/release-calendar" }),
        },
        {
            icon: LibraryBig,
            section: "quick",
            id: "quick-lists",
            label: "Lists & Collections",
            keywords: "my media library dynamic lists collections",
            onSelect: () => void navigate({ to: "/lists/$username", params: { username: currentUser.name } }),
        },
        {
            icon: ListPlus,
            section: "quick",
            label: "New Collection",
            id: "quick-new-collection",
            keywords: "create list rank mix media",
            onSelect: () => void navigate({ to: "/lists/collections/create" }),
        },
        {
            section: "quick",
            icon: SlidersHorizontal,
            label: "New Dynamic List",
            id: "quick-new-dynamic-list",
            keywords: "create smart filter rule list",
            onSelect: () => void navigate({ to: "/lists/dynamic/create" }),
        },
        ...(booksActive ? [{
            icon: BookPlus,
            id: "quick-add-book",
            label: "Add Manual Book",
            section: "quick" as const,
            keywords: "create book custom edition",
            onSelect: () => void navigate({ to: "/add-book" }),
        }] : []),
        ...activeMediaSettings.map(setting => ({
            section: "lists" as const,
            mediaType: setting.mediaType,
            id: `list-${setting.mediaType}`,
            label: `${capitalize(setting.mediaType)} List`,
            keywords: `tracking list my ${setting.mediaType}`,
            onSelect: () => void navigate({
                to: "/lists/tracking/$mediaType/$username",
                params: { mediaType: setting.mediaType, username: currentUser.name },
            }),
        })),
        {
            icon: Play,
            section: "lists",
            label: "Continue",
            id: "list-continue",
            keywords: "in progress watching reading playing queue",
            onSelect: () => void navigate({ to: "/lists/continue/$username", params: { username: currentUser.name } }),
        },
        {
            icon: User,
            section: "pages",
            id: "page-profile",
            label: "My Profile",
            keywords: `account user ${currentUser.name}`,
            onSelect: () => void navigate({ to: "/profile/$username", params: { username: currentUser.name } }),
        },
        {
            section: "pages",
            label: "My Stats",
            id: "page-my-stats",
            icon: ChartNoAxesColumn,
            keywords: "statistics analytics charts hours ratings",
            onSelect: () => void navigate({ to: "/stats/$username", params: { username: currentUser.name } }),
        },
        ...(currentYear && currentMonth ? [{
            icon: Zap,
            label: "My Activity",
            id: "page-my-activity",
            section: "pages" as const,
            keywords: "monthly history recap calendar log",
            onSelect: () => void navigate({
                to: "/activity/$username",
                params: { username: currentUser.name },
                search: { year: currentYear, month: String(Number(currentMonth)) },
            }),
        }] : []),
        {
            icon: Award,
            section: "pages",
            id: "page-achievements",
            label: "My Achievements",
            keywords: "badges trophies milestones",
            onSelect: () => void navigate({ to: "/achievements/$username", params: { username: currentUser.name } }),
        },
        {
            icon: UsersRound,
            section: "pages",
            label: "Taste Matches",
            id: "page-taste-matches",
            keywords: "similarity compatible users ratings",
            onSelect: () => void navigate({ to: "/taste-matches" }),
        },
        {
            section: "pages",
            icon: CircleUserRound,
            id: "page-settings-general",
            label: "Settings — General",
            onSelect: () => void navigate({ to: "/settings/general" }),
            keywords: "settings preferences identity username avatar banner images privacy",
        },
        {
            section: "pages",
            icon: LibraryBig,
            id: "page-settings-content-lists",
            label: "Settings — Content & Lists",
            onSelect: () => void navigate({ to: "/settings/content-lists" }),
            keywords: "settings media types activate ratings score feeling exports csv notifications",
        },
        {
            icon: Upload,
            section: "pages",
            id: "page-settings-imports",
            label: "Settings — Imports",
            keywords: "settings csv letterboxd imdb mylists import",
            onSelect: () => void navigate({ to: "/settings/imports" }),
        },
        {
            icon: Brush,
            section: "pages",
            id: "page-settings-profile-customization",
            label: "Settings — Profile Customization",
            keywords: "settings current media profile highlights pinned layout",
            onSelect: () => void navigate({ to: "/settings/profile-customization" }),
        },
        {
            section: "pages",
            icon: ListRestart,
            id: "page-settings-activity-cleanup",
            label: "Settings — Activity Cleanup",
            keywords: "settings hide imported activity bulk cleanup history",
            onSelect: () => void navigate({ to: "/settings/activity-cleanup" }),
        },
        {
            icon: KeyRound,
            section: "pages",
            id: "page-settings-email-password",
            label: "Settings — Email & Password",
            keywords: "settings security sign-in login credentials account",
            onSelect: () => void navigate({ to: "/settings/email-password" }),
        },
        {
            icon: Plug,
            section: "pages",
            id: "page-settings-connected-apps",
            label: "Settings — Connected Apps (MCP)",
            onSelect: () => void navigate({ to: "/settings/connected-apps" }),
            keywords: "settings assistant oauth chatgpt claude api permissions",
        },
        {
            section: "pages",
            icon: BookOpenCheck,
            id: "page-settings-walkthrough",
            label: "Settings — Features Walkthrough",
            keywords: "settings replay tour onboarding guide help",
            onSelect: () => void navigate({ to: "/settings/features-walkthrough" }),
        },
        {
            section: "pages",
            icon: ShieldAlert,
            id: "page-settings-danger",
            label: "Settings — Danger Zone",
            keywords: "settings delete account permanent remove",
            onSelect: () => void navigate({ to: "/settings/danger" }),
        },
        ...(currentUser.capabilities.enterAdminDashboard ? [{
            id: "page-admin",
            icon: ShieldCheck,
            label: "Admin Panel",
            section: "pages" as const,
            keywords: "dashboard management moderation",
            onSelect: () => void navigate({ to: "/admin" }),
        }] : []),
        ...getPublicNavItems(navigate),
    ];
};
