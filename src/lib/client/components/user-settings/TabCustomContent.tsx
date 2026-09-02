import React, {useId} from "react";
import {EyeOff, ListOrdered, Shuffle} from "lucide-react";
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
    { value: "random", label: "Random favorites", description: "Rotate through favorites from this list.", icon: Shuffle },
    { value: "curated", label: "Choose titles", description: "Pick and order up to seven titles yourself.", icon: ListOrdered },
    { value: "disabled", label: "Hide section", description: "Do not show this section on your profile.", icon: EyeOff },
] as const;


export const TabCustomContent = ({ activeTab, previewCache, setPreviewCache }: TabCustomContentProps) => {
    const fieldId = useId();
    const { control } = useFormContext<HighlightedMediaSettings>();
    const activeMode = useWatch({ control, name: `${activeTab}.mode` });

    return (
        <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/20 px-5 py-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-lg capitalize">
                    <MainThemeIcon type={activeTab} size={18}/>
                    {activeTab} highlights
                </CardTitle>
                <CardDescription>
                    {activeTab === "overview"
                        ? <>Choose what appears in the highlighted section at the top of your profile.</>
                        : <>Choose what appears on the {activeTab} tab of your profile.</>
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
                <FieldGroup className="gap-6">
                    <Controller
                        control={control}
                        name={`${activeTab}.title`}
                        render={({field, fieldState}) =>
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={`${fieldId}-title`}>Section title</FieldLabel>
                                <Input
                                    {...field}
                                    id={`${fieldId}-title`}
                                    maxLength={50}
                                    placeholder="Highlighted media"
                                    aria-invalid={fieldState.invalid}
                                />
                                <FieldDescription>
                                    This heading appears above the media on your profile.
                                </FieldDescription>
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
                                    <FieldLegend id={`${fieldId}-mode`} variant="label">What to show</FieldLegend>
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        aria-invalid={fieldState.invalid}
                                        aria-labelledby={`${fieldId}-mode`}
                                        className="grid gap-3 sm:grid-cols-3"
                                    >
                                        {modeOptions.map((option) => {
                                            const Icon = option.icon;

                                            return (
                                                <Field
                                                    key={option.value}
                                                    orientation="horizontal"
                                                    className="items-start rounded-xl border p-3 transition-colors
                                                    has-data-checked:border-brand/40 has-data-checked:bg-brand/5"
                                                >
                                                    <RadioGroupItem
                                                        id={`${fieldId}-mode-${option.value}`}
                                                        className="mt-0.5"
                                                        value={option.value}
                                                    />
                                                    <FieldContent>
                                                        <FieldLabel htmlFor={`${fieldId}-mode-${option.value}`} className="font-medium">
                                                            <Icon className="size-3.5 text-muted-foreground" aria-hidden="true"/>
                                                            {option.label}
                                                        </FieldLabel>
                                                        <FieldDescription className="mt-1 text-xs">
                                                            {option.description}
                                                        </FieldDescription>
                                                    </FieldContent>
                                                </Field>
                                            );
                                        })}
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
