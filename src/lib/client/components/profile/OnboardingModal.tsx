import {useState} from "react";
import {useNavigate} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {ArrowRight, LayoutDashboard, Search, Settings2} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {useUpdateOnboardingMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const OnboardingModal = () => {
    const navigate = useNavigate();
    const mutation = useUpdateOnboardingMutation();
    const [open, setOpen] = useState(true);

    const handleStartTour = async () => {
        mutation.mutate({});
        setOpen(false);
        await navigate({ to: "/walkthrough/search-media" });
    };

    const handleNoThanks = async () => {
        mutation.mutate({});
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={() => {
        }}>
            <DialogContent className="sm:max-w-110 gap-0 p-0 overflow-hidden" hideClose>
                <div className="p-8">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-bold tracking-tight">
                            Master MyLists.info
                        </DialogTitle>
                        <p className="text-muted-foreground mt-2">
                            Welcome to MyLists. Would you like a quick walkthrough of our core features?
                        </p>
                    </DialogHeader>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 rounded-md bg-accent/50">
                                <Search className="size-4 text-app-accent"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Search & Discovery
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Find movies, series, games, and more across all providers.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 rounded-md bg-accent/50">
                                <LayoutDashboard className="size-4 text-app-accent"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Personalized Lists
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Learn how to organize and filter your media effectively.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 rounded-md bg-accent/50">
                                <Settings2 className="size-4 text-app-accent"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Customization
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Enable specific media types like Anime or Manga in your settings.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button className="flex-1 h-11 font-semibold group" onClick={handleStartTour}>
                            Start Walkthrough
                            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform"/>
                        </Button>

                        <Button variant="outline" className="flex-1 h-11" onClick={handleNoThanks}>
                            I know my way around
                        </Button>
                    </div>

                    <p className="text-[10px] text-center text-muted-foreground mt-6 uppercase tracking-widest font-medium">
                        Takes approximately 3 minutes
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
