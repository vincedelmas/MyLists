import {Newspaper, Sparkles} from "lucide-react";
import type {AdminUpdatePayload} from "@/lib/schemas";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface UserPromptsProps {
    isPending: boolean;
    pendingPrompt?: "news" | "onboarding";
    onUpdate: (payload: Pick<AdminUpdatePayload, "showUpdateModal" | "showOnboarding">) => void;
}


const prompts = [
    {
        id: "news",
        icon: Newspaper,
        title: "Product news",
        payload: { showUpdateModal: true },
        buttonLabel: "Show news to everyone",
        description: "Show the update notice again to all users.",
    },
    {
        id: "onboarding",
        icon: Sparkles,
        title: "Onboarding",
        payload: { showOnboarding: true },
        buttonLabel: "Show onboarding to everyone",
        description: "Show the onboarding flow again to all users.",
    },
] as const;


export function UserPrompts({ isPending, pendingPrompt, onUpdate }: UserPromptsProps) {
    return (
        <Card className="my-6 min-w-0">
            <CardHeader>
                <CardTitle>
                    Prompts for everyone
                </CardTitle>
                <CardDescription>
                    These actions apply to every account
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                {prompts.map(({ id, icon: Icon, title, description, buttonLabel, payload }) =>
                    <div key={id} className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
                        <div className="flex items-start gap-3">
                            <Icon className="mt-1 size-4 shrink-0 text-brand"/>
                            <div>
                                <h3 className="text-sm font-medium">
                                    {title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                        <LoadingButton
                            variant="outline"
                            disabled={isPending}
                            isLoading={pendingPrompt === id}
                            onClick={() => onUpdate(payload)}
                        >
                            {buttonLabel}
                        </LoadingButton>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
