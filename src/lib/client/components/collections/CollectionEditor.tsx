import {toast} from "sonner";
import {useState} from "react";
import {CreateCollection} from "@/lib/schemas";
import {useBlocker} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {DraftItem} from "@/lib/types/collections.types";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {useFieldArray, UseFormReturn} from "react-hook-form";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {GripVertical, List, ListOrdered, Trash2} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {CollectionSearch} from "@/lib/client/components/collections/CollectionSearch";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


interface CollectionEditorProps {
    submitLabel: string;
    mediaType: MediaType;
    isSubmitting?: boolean;
    form: UseFormReturn<CreateCollection>;
    onSubmit: (values: CreateCollection) => void;
}


export const CollectionEditor = ({ form, onSubmit, mediaType, submitLabel, isSubmitting }: CollectionEditorProps) => {
    const { isDirty } = form.formState;
    const ordered = form.watch("ordered");
    const orderedLabel = ordered ? "Ranked" : "Unranked";
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "items" });

    useBlocker({
        shouldBlockFn: () => {
            if (!isDirty || isSubmitting) return false;
            return !confirm("Your edit will be lost. Are you sure you want to leave this page?");
        },
    })

    const handleDrop = (index: number) => {
        if (dragIndex === null || dragIndex === index) return;
        move(dragIndex, index);
        setDragIndex(null);
    };

    const handleAddItem = (item: DraftItem) => {
        if (fields.some((field) => field.mediaId === item.mediaId)) {
            toast.warning("That media is already in your collection.");
            return;
        }

        append({
            annotation: "",
            mediaId: item.mediaId,
            mediaName: item.mediaName,
            mediaCover: item.mediaCover,
        }, { shouldFocus: false });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-2">
                        <h2 className="font-semibold tracking-tight">
                            2. Collection details
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="gap-1 text-xs capitalize">
                                <MainThemeIcon type={mediaType} size={14}/> {mediaType}
                            </Badge>
                            <Badge variant="outline" className="gap-1 text-xs">
                                {ordered ? <ListOrdered className="size-3"/> : <List className="size-3"/>}
                                {orderedLabel}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {submitLabel}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-8 space-y-6 max-lg:col-span-12">
                        <FormField
                            name="title"
                            control={form.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Ex: Top 50 Animated Films"
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                        <FormField
                            name="description"
                            control={form.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ""}
                                            placeholder="What is this collection about?"
                                        />
                                    </FormControl>
                                    <div className="flex justify-between items-center">
                                        <FormMessage/>
                                        <span className="text-[10px] text-muted-foreground">
                                            {field.value?.length || 0} / 400
                                        </span>
                                    </div>
                                </FormItem>
                            }
                        />

                        <FormField
                            name="items"
                            control={form.control}
                            render={() => (
                                <FormItem>
                                    <FormLabel>Items ({fields.length})</FormLabel>
                                    <CollectionSearch
                                        onAdd={handleAddItem}
                                        mediaType={mediaType}
                                        disabled={isSubmitting}
                                    />
                                    <FormMessage/>

                                    {fields.length === 0 ?
                                        <EmptyState
                                            className="py-20"
                                            icon={ListOrdered}
                                            message="No items added to the collection yet."
                                        />
                                        :
                                        <div className="space-y-3 pt-3">
                                            {fields.map((field, idx) =>
                                                <div
                                                    key={field.id}
                                                    draggable={ordered}
                                                    onDrop={() => handleDrop(idx)}
                                                    onDragEnd={() => setDragIndex(null)}
                                                    onDragStart={() => ordered && setDragIndex(idx)}
                                                    onDragOver={(ev) => ordered && ev.preventDefault()}
                                                    className="flex items-center gap-3 rounded-lg border bg-background p-3"
                                                >
                                                    {ordered &&
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <span className="w-6 text-center text-xs font-semibold">
                                                                {idx + 1}
                                                            </span>
                                                            <GripVertical className="size-4 cursor-grab"/>
                                                        </div>
                                                    }
                                                    <div className="h-20 w-14 overflow-hidden rounded-md bg-muted">
                                                        <img
                                                            alt={field.mediaName}
                                                            src={field.mediaCover}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="line-clamp-1 font-semibold">
                                                            {field.mediaName}
                                                        </div>
                                                        <Input
                                                            placeholder="Add annotation..."
                                                            {...form.register(`items.${idx}.annotation`)}
                                                        />
                                                    </div>
                                                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(idx)}>
                                                        <Trash2 className="size-4"/>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    }
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="col-span-4 space-y-6 max-lg:col-span-12">
                        <div className="space-y-5 rounded-lg border p-4">
                            <FormField
                                name="privacy"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem className="space-y-4">
                                        <FormLabel className="text-base">Privacy Settings</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                                                {[PrivacyType.PRIVATE, PrivacyType.RESTRICTED, PrivacyType.PUBLIC].map((pt) =>
                                                    <FormItem key={pt} className="flex items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value={pt} className="mt-1"/>
                                                        </FormControl>
                                                        <div className="grid gap-1.5 leading-none">
                                                            <FormLabel className="font-normal flex items-center gap-1">
                                                                <PrivacyIcon type={pt}/>
                                                                {pt === PrivacyType.RESTRICTED
                                                                    ? "Profile Only" : pt === PrivacyType.PRIVATE
                                                                        ? "Only Me" : "Public"
                                                                }
                                                            </FormLabel>
                                                            <FormDescription className="text-xs">
                                                                {pt === PrivacyType.PRIVATE &&
                                                                    <span>
                                                                        Visible only to you. Hidden from profiles,
                                                                        direct links, and discovery.
                                                                    </span>
                                                                }
                                                                {pt === PrivacyType.RESTRICTED &&
                                                                    <span>
                                                                        Hidden from community discovery. Visible to people
                                                                        who can view your profile: everyone if public,
                                                                        signed-in users if restricted, approved followers
                                                                        if private.
                                                                    </span>
                                                                }
                                                                {pt === PrivacyType.PUBLIC &&
                                                                    <span>
                                                                        Visible to everyone by direct link and in community
                                                                        discovery, even if your account is private.
                                                                    </span>
                                                                }
                                                            </FormDescription>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                }
                            />

                            <FormField
                                name="ordered"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem className="flex items-center justify-between rounded-md border px-3 py-2 space-y-0">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm font-semibold">
                                                Ranked list
                                            </FormLabel>
                                            <FormDescription className="text-xs">
                                                Enable drag & drop ranking.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                }
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Form>
    );
};
