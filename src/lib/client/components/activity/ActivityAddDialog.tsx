import {toast} from "sonner";
import {useState} from "react";
import {Search} from "lucide-react";
import {useForm} from "react-hook-form";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {Label} from "@/lib/client/components/ui/label";
import {Button} from "@/lib/client/components/ui/button";
import {displayContainerError} from "@/lib/utils/error-display";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Separator} from "@/lib/client/components/ui/separator";
import {capitalize} from "@/lib/utils/text-formatting";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {activityMediaAddSearchOptions} from "@/lib/client/react-query/query-options";
import {useAddActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {getActivityInputStep, getActivityUnitLabel, getDefaultActivityDate, toActivityStoredValue} from "@/lib/utils/activity-utils";


type FormValues = {
    isRedo: boolean;
    lastUpdate: string;
    isCompleted: boolean;
    specificGained: number;
}


interface ActivityAddDialogProps {
    year: number;
    open: boolean;
    month: number;
    mediaTypes: MediaType[];
    onOpenChange: (open: boolean) => void;
}


export const ActivityAddDialog = ({ open, year, month, mediaTypes, onOpenChange }: ActivityAddDialogProps) => {
    const addMutation = useAddActivityMutation({ noGlobalErrorToast: true });
    const [selectedType, setSelectedType] = useState<MediaType>(mediaTypes[0] ?? MediaType.SERIES);
    const [selectedMedia, setSelectedMedia] = useState<{ id: number; name: string; imageCover: string } | null>(null);
    const { search, setSearch, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer({
        onReset: () => undefined,
    });
    const { data: searchResults = [], isFetching, error } = useQuery(activityMediaAddSearchOptions(selectedType, debouncedSearch));

    const form = useForm<FormValues>({
        values: {
            isRedo: false,
            specificGained: 1,
            isCompleted: false,
            lastUpdate: getDefaultActivityDate(year, month),
        },
    });

    const handleTypeChange = (value: MediaType) => {
        reset();
        setSelectedType(value);
        setSelectedMedia(null);
    };

    const handleSubmit = (values: FormValues) => {
        if (!selectedMedia) {
            toast.error("Choose a media first.");
            return;
        }

        addMutation.mutate({
            data: {
                isRedo: values.isRedo,
                mediaType: selectedType,
                mediaId: selectedMedia.id,
                isCompleted: values.isCompleted,
                lastUpdate: `${values.lastUpdate}T12:00:00.000Z`,
                specificGained: toActivityStoredValue(selectedType, values.specificGained),
            },
        }, {
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[min(620px,calc(100vw-2rem))]">
                <DialogHeader>
                    <DialogTitle>Add Activity</DialogTitle>
                    <DialogDescription>
                        Add progress to the selected month's activity.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                    <div className="grid gap-2 w-36">
                        <Label>Media type</Label>
                        <Select value={selectedType} onValueChange={handleTypeChange}>
                            <SelectTrigger className="w-36">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                {mediaTypes.map((type) =>
                                    <SelectItem key={type} value={type}>
                                        {capitalize(type)}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Media</Label>
                        {selectedMedia ?
                            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <img
                                        alt="media-cover"
                                        src={selectedMedia.imageCover}
                                        className="h-16 w-11 shrink-0 rounded-sm object-cover"
                                    />
                                    <div className="min-w-0 max-w-50">
                                        <div className="truncate font-medium line-clamp-1">
                                            {selectedMedia.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {capitalize(selectedType)}
                                        </div>
                                    </div>
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedMedia(null)}>
                                    Change
                                </Button>
                            </div>
                            :
                            <div ref={containerRef} className="relative">
                                <div className="flex items-center overflow-hidden rounded-md border border-border
                                focus-within:border-app-accent focus-within:ring-2 focus-within:ring-app-accent/50">
                                    <div className="px-3 text-muted-foreground">
                                        <Search className="size-4"/>
                                    </div>
                                    <Input
                                        value={search}
                                        inputMode="search"
                                        className="border-none focus-visible:ring-0"
                                        onChange={(ev) => setSearch(ev.target.value)}
                                        placeholder={`Search your ${capitalize(selectedType)} list...`}
                                    />
                                </div>

                                <SearchContainer
                                    error={error}
                                    search={search}
                                    isOpen={isOpen}
                                    isPending={isFetching}
                                    debouncedSearch={debouncedSearch}
                                    hasResults={searchResults.length > 0}
                                >
                                    <div className="flex max-h-80 flex-col overflow-y-auto">
                                        {searchResults.map((item) =>
                                            <div key={item.mediaId}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMedia({
                                                            id: item.mediaId,
                                                            name: item.mediaName,
                                                            imageCover: item.customCover ?? item.mediaCover,
                                                        });
                                                        reset();
                                                    }}
                                                    className="w-full text-left hover:bg-popover/70"
                                                >
                                                    <div className="flex items-center gap-3 p-3">
                                                        <div className="relative shrink-0">
                                                            <img
                                                                alt=""
                                                                src={item.customCover ?? item.mediaCover}
                                                                className="h-16 w-11 rounded-sm object-cover"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="line-clamp-2 font-medium">
                                                                {item.mediaName}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                In your {capitalize(selectedType)} list
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                                <Separator className="m-0"/>
                                            </div>
                                        )}
                                    </div>
                                </SearchContainer>
                            </div>
                        }
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                        <div className="grid gap-2">
                            <Label>{getActivityUnitLabel(selectedType, "long") ?? "Units gained"}</Label>
                            <Input
                                type="number"
                                step={getActivityInputStep(selectedType)}
                                {...form.register("specificGained", { valueAsNumber: true, min: 0 })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Progress date</Label>
                            <Input
                                type="date"
                                max={toDateInputValue(new Date())}
                                {...form.register("lastUpdate", { required: true })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm" htmlFor="is-progress">
                            <Checkbox
                                id="is-progress"
                                checked={form.watch().isCompleted}
                                onCheckedChange={(val) => {
                                    form.setValue("isCompleted", !!val);
                                    if (val) form.setValue("isRedo", false);
                                }}
                            />
                            Completed
                        </label>
                        <label className="flex items-center gap-2 text-sm" htmlFor="is-re-experience">
                            <Checkbox
                                id="is-re-experience"
                                checked={form.watch().isRedo}
                                onCheckedChange={(val) => {
                                    form.setValue("isRedo", !!val);
                                    if (val) form.setValue("isCompleted", false);
                                }}
                            />
                            Re-experience
                        </label>
                    </div>

                    {addMutation.isError &&
                        <InlineErrorContainer>
                            {displayContainerError({ error: addMutation.error })}
                        </InlineErrorContainer>
                    }

                    <DialogFooter>
                        <Button type="submit" disabled={addMutation.isPending || !selectedMedia}>
                            Add activity
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
