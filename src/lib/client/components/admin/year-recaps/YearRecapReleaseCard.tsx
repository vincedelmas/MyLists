import {useId} from "react";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatDate} from "@/lib/utils/formatting/date";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import type {YearRecapReleaseMode, YearRecapReleaseStatus} from "@/lib/types/year-recap.types";
import {useAdminUpdateYearRecapReleaseMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


const releaseModes: { value: YearRecapReleaseMode; label: string; description: string }[] = [
    {
        value: "automatic",
        label: "Automatic",
        description: "Follow the December 20 release schedule.",
    },
    {
        value: "enabled",
        label: "Enabled",
        description: "Make this recap available now.",
    },
    {
        value: "disabled",
        label: "Disabled",
        description: "Keep this recap unavailable, even after its release date.",
    },
];


export function YearRecapReleaseCard({ release }: { release: YearRecapReleaseStatus }) {
    const fieldId = useId();
    const mutation = useAdminUpdateYearRecapReleaseMutation();
    const selectedMode = mutation.isPending ? mutation.variables.data.mode : release.mode;

    return (
        <Card role="region" aria-label={`${release.year} recap release`}>
            <CardHeader>
                <CardTitle>
                    {release.year} recap
                </CardTitle>
                <CardDescription>
                    Automatic release: {formatDate(release.automaticReleaseAt)} at 00:00 UTC.
                </CardDescription>
                <CardAction>
                    <Badge variant={release.isAvailable ? "success" : "secondary"}>
                        {release.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardContent>
                <FieldSet disabled={mutation.isPending} aria-busy={mutation.isPending}>
                    <FieldLegend id={`${fieldId}-mode`} variant="label">
                        Release mode
                    </FieldLegend>
                    <RadioGroup
                        value={selectedMode}
                        disabled={mutation.isPending}
                        aria-labelledby={`${fieldId}-mode`}
                        aria-describedby={`${fieldId}-save-status`}
                        className="grid gap-3 sm:grid-cols-3"
                        onValueChange={mode => mutation.mutate({
                            data: {
                                year: release.year,
                                mode: mode as YearRecapReleaseMode,
                            },
                        })}
                    >
                        {releaseModes.map(mode =>
                            <Field
                                key={mode.value}
                                orientation="horizontal"
                                data-disabled={mutation.isPending}
                                className="items-start rounded-xl border p-3 transition-colors
                                has-data-checked:border-brand/40 has-data-checked:bg-brand/5"
                            >
                                <RadioGroupItem
                                    value={mode.value}
                                    className="mt-0.5"
                                    id={`${fieldId}-${mode.value}`}
                                    aria-describedby={`${fieldId}-${mode.value}-description`}
                                />
                                <FieldContent>
                                    <FieldLabel htmlFor={`${fieldId}-${mode.value}`} className="font-medium">
                                        {mode.label}
                                    </FieldLabel>
                                    <FieldDescription id={`${fieldId}-${mode.value}-description`} className="mt-1 text-xs">
                                        {mode.description}
                                    </FieldDescription>
                                </FieldContent>
                            </Field>
                        )}
                    </RadioGroup>
                    <p role="status" id={`${fieldId}-save-status`} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {mutation.isPending
                            ? <>
                                <Spinner aria-hidden="true"/>
                                Saving release mode…
                            </>
                            : "Changes save automatically and apply to all accounts."
                        }
                    </p>
                    {mutation.isError &&
                        <FieldError>
                            {mutation.error.message}
                        </FieldError>
                    }
                </FieldSet>
            </CardContent>
        </Card>
    );
}
