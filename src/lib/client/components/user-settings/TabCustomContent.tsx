import React from "react";
import {Input} from "@/lib/client/components/ui/input";
import {Label} from "@/lib/client/components/ui/label";
import {Controller, useFormContext, useWatch} from "react-hook-form";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {CuratedMediaManager} from "@/lib/client/components/user-settings/CuratedMediaManager";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {HighlightedMediaSearchItem, HighlightedMediaSettings, HighlightedMediaTab} from "@/lib/types/profile-custom.types";


interface TabCustomContentProps {
    activeTab: HighlightedMediaTab;
    previewCache: Record<string, HighlightedMediaSearchItem>;
    setPreviewCache: React.Dispatch<React.SetStateAction<Record<string, HighlightedMediaSearchItem>>>;
}


const modeOptions = [
    { value: "random", label: "Random", description: "Automatically pull random favorites from this list." },
    { value: "curated", label: "Curated", description: "Choose exactly which media to highlight." },
    { value: "disabled", label: "Disabled", description: "Hide this section on the profile tab." },
] as const;


export const TabCustomContent = ({ activeTab, previewCache, setPreviewCache }: TabCustomContentProps) => {
    const { register, control } = useFormContext<HighlightedMediaSettings>();
    const activeMode = useWatch({ control, name: `${activeTab}.mode` });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base capitalize">
                    <MainThemeIcon type={activeTab} size={18}/>
                    {activeTab}
                </CardTitle>
                <CardDescription>
                    {activeTab === "overview"
                        ? <>Mix media from any of your activated lists.</>
                        : <>Only {activeTab} from your {activeTab} list.</>
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="highlighted-media-title">Custom Title</Label>
                    <Input
                        maxLength={50}
                        id="highlighted-media-title"
                        placeholder="Highlighted Media"
                        {...register(`${activeTab}.title`)}
                    />
                </div>

                <div className="space-y-3">
                    <Label>Display Mode</Label>
                    <Controller
                        control={control}
                        name={`${activeTab}.mode`}
                        render={({ field }) =>
                            <RadioGroup value={field.value} onValueChange={field.onChange}>
                                {modeOptions.map((option) =>
                                    <Label key={option.value} className="flex items-start gap-3 rounded-lg border p-3 font-normal">
                                        <RadioGroupItem
                                            className="mt-0.5"
                                            value={option.value}
                                        />
                                        <div>
                                            <div className="font-medium text-primary">
                                                {option.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {option.description}
                                            </div>
                                        </div>
                                    </Label>
                                )}
                            </RadioGroup>
                        }
                    />
                </div>

                {activeMode === "curated" &&
                    <CuratedMediaManager
                        activeTab={activeTab}
                        previewCache={previewCache}
                        setPreviewCache={setPreviewCache}
                    />
                }
            </CardContent>
        </Card>
    );
};
