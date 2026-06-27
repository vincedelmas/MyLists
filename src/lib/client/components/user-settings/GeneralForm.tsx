import {toast} from "sonner";
import {useState} from "react";
import {CircleHelp} from "lucide-react";
import {useForm} from "react-hook-form";
import {PrivacyType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {GeneralSettings, generalSettingsSchema} from "@/lib/schemas";
import {ImageCropper} from "@/lib/client/components/user-settings/ImageCropper";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {useGeneralSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const GeneralForm = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const generalSettingsMutation = useGeneralSettingsMutation();
    const [imageCropperResetKey, setImageCropperResetKey] = useState(0);
    const form = useForm<GeneralSettings>({
        resolver: zodResolver(generalSettingsSchema),
        values: {
            username: currentUser?.name ?? "",
            privacy: currentUser?.privacy ?? PrivacyType.RESTRICTED,
        },
    });

    const onSubmit = async (submittedData: GeneralSettings) => {
        const formData = new FormData();

        Object.entries(submittedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        generalSettingsMutation.mutate({ data: formData }, {
            onSuccess: async () => {
                await setCurrentUser();
                form.resetField("profileImage");
                form.resetField("backgroundImage");
                setImageCropperResetKey((key) => key + 1);
                toast.success("Settings successfully updated");
            },
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-90 max-sm:w-full">
                <div className="space-y-7">
                    <FormField
                        name="username"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="privacy"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    <div className="flex items-center gap-2">
                                        Privacy
                                        <PrivacyPopover/>
                                    </div>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a privacy mode"/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={PrivacyType.PUBLIC}>Public</SelectItem>
                                        <SelectItem value={PrivacyType.RESTRICTED}>Restricted</SelectItem>
                                        <SelectItem value={PrivacyType.PRIVATE}>Private</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="profileImage"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Profile image</FormLabel>
                                <FormControl>
                                    <ImageCropper
                                        aspect={1}
                                        cropShape="round"
                                        fileName={field.name}
                                        onCropApplied={field.onChange}
                                        key={`profile-${imageCropperResetKey}`}
                                        resultClassName="h-[150px] rounded-full"
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="backgroundImage"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Background Image</FormLabel>
                                <FormControl>
                                    <ImageCropper
                                        cropShape="rect"
                                        sliceHeight={256}
                                        fileName={field.name}
                                        onCropApplied={field.onChange}
                                        key={`background-${imageCropperResetKey}`}
                                        resultClassName="w-full h-16 object-cover rounded"
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" className="mt-5" disabled={!form.formState.isDirty || generalSettingsMutation.isPending}>
                    Update
                </Button>
            </form>
        </Form>
    );
};


const PrivacyPopover = () => {
    return (
        <Popover>
            <PopoverTrigger className="opacity-50 hover:opacity-80">
                <CircleHelp className="w-4 h-4"/>
            </PopoverTrigger>
            <PopoverContent className="p-5 w-80">
                <div className="mb-3 text-sm font-medium text-muted-foreground">
                    Determine who can see your profile, lists, stats, media updates, etc...
                </div>
                <ul className="text-sm list-disc space-y-3 pl-4">
                    <li>
                        <span className="font-semibold text-green-500">Public:</span>
                        {" "}Anyone can see your profile, lists, stats, and media updates.
                    </li>
                    <li>
                        <span className="font-semibold text-amber-500">Restricted (default):</span>
                        {" "}Only logged-in users can see your profile, lists, stats, and media updates.
                    </li>
                    <li>
                        <span className="font-semibold text-red-500">Private:</span>
                        {" "}Only approved followers can see your profile, lists, stats, and media updates.
                    </li>
                </ul>
            </PopoverContent>
        </Popover>
    );
};
