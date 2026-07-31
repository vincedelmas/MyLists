import React, {useId} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {Controller, useFormContext, useWatch} from "react-hook-form";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {CuratedMediaManager} from "@/lib/client/components/user-settings/CuratedMediaManager";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
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
    const fieldId = useId();
    const { control } = useFormContext<HighlightedMediaSettings>();
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
            <CardContent>
                <FieldGroup className="gap-6">
                <Controller
                    control={control}
                    name={`${activeTab}.title`}
                    render={({field, fieldState}) =>
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={`${fieldId}-title`}>Custom Title</FieldLabel>
                            <Input
                                {...field}
                                id={`${fieldId}-title`}
                                maxLength={50}
                                placeholder="Highlighted Media"
                                aria-invalid={fieldState.invalid}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    }
                />

                <Controller
                        control={control}
                        name={`${activeTab}.mode`}
                        render={({field, fieldState}) =>
                            <Field data-invalid={fieldState.invalid}>
                                <FieldSet>
                                    <FieldLegend id={`${fieldId}-mode`} variant="label">Display Mode</FieldLegend>
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        aria-invalid={fieldState.invalid}
                                        aria-labelledby={`${fieldId}-mode`}
                                        className="flex flex-col gap-3"
                                    >
                                        {modeOptions.map((option) =>
                                            <Field key={option.value} orientation="horizontal" className="items-start rounded-lg border p-3">
                                                <RadioGroupItem
                                                    id={`${fieldId}-mode-${option.value}`}
                                                    className="mt-0.5"
                                                    value={option.value}
                                                />
                                                <FieldContent>
                                                    <FieldLabel htmlFor={`${fieldId}-mode-${option.value}`} className="font-normal">
                                                        {option.label}
                                                    </FieldLabel>
                                                    <FieldDescription className="text-xs">
                                                        {option.description}
                                                    </FieldDescription>
                                                </FieldContent>
                                            </Field>
                                        )}
                                    </RadioGroup>
                                </FieldSet>
                                <FieldError errors={[fieldState.error]}/>
                            </Field>
                        }
                    />

                {activeMode === "curated" &&
                    <CuratedMediaManager
                        activeTab={activeTab}
                        previewCache={previewCache}
                        setPreviewCache={setPreviewCache}
                    />
                }
                </FieldGroup>
            </CardContent>
        </Card>
    );
};
