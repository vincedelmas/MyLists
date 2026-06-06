import {toast} from "sonner";
import {useState} from "react";
import {CircleHelp} from "lucide-react";
import {useForm} from "react-hook-form";
import {PrivacyType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {FormZodError} from "@/lib/utils/error-classes";
import {Button} from "@/lib/client/components/ui/button";
import {ImageCropper} from "@/lib/client/components/user-settings/ImageCropper";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {useGeneralSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


type FormValues = {
    username: string;
    profileImage?: File;
    privacy: PrivacyType;
    backgroundImage?: File;
};


// A bit less than 10 Mb
const MAX_FILE_SIZE = 10 * 1024 * 1000;


export const GeneralForm = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const generalSettingsMutation = useGeneralSettingsMutation();
    const [imageCropperKey, setImageCropperKey] = useState(Date.now());
    const form = useForm<FormValues>({
        values: {
            username: currentUser?.name ?? "",
            privacy: currentUser?.privacy ?? PrivacyType.RESTRICTED,
        },
    });

    const onSubmit = async (submittedData: FormValues) => {
        const formData = new FormData();

        Object.entries(submittedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        generalSettingsMutation.mutate({ data: formData }, {
            onError: (err) => {
                if (err instanceof FormZodError) {
                    err.issues.forEach((issue) => {
                        form.setError(issue.path.join("."), { type: "server", message: issue.message });
                    });
                }
            },
            onSuccess: async () => {
                await setCurrentUser();
                setImageCropperKey(Date.now());
                form.resetField("profileImage");
                form.resetField("backgroundImage");
                toast.success("Settings successfully updated");
            },
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-90 max-sm:w-full">
                <div className="space-y-7">
                    <FormField
                        control={form.control}
                        name="username"
                        rules={{
                            required: { value: true, message: "Username is required." },
                            minLength: { value: 3, message: "Username too short (3 min)." },
                            maxLength: { value: 15, message: "Username too long (15 max)." },
                        }}
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
                        control={form.control}
                        name="privacy"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    <div className="flex items-center gap-2">
                                        Privacy
                                        <PrivacyPopover/>
                                    </div>
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        rules={{
                            validate: (file?: File) => {
                                if (!file) return true;
                                if (file.size > MAX_FILE_SIZE) return "Image must be less than 10MB.";
                                return true;
                            },
                        }}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Profile image</FormLabel>
                                <FormControl>
                                    <ImageCropper
                                        aspect={1}
                                        cropShape="round"
                                        fileName={field.name}
                                        key={imageCropperKey}
                                        onCropApplied={field.onChange}
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
                        rules={{
                            validate: (file?: File) => {
                                if (!file) return true;
                                if (file.size > MAX_FILE_SIZE) return "Image must be less than 10MB.";
                                return true;
                            },
                        }}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Background Image</FormLabel>
                                <FormControl>
                                    <ImageCropper
                                        cropShape="rect"
                                        sliceHeight={256}
                                        fileName={field.name}
                                        key={imageCropperKey + 1}
                                        onCropApplied={field.onChange}
                                        resultClassName="w-full h-16 object-cover rounded"
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </div>
                {form.formState.errors.root &&
                    <p className="mt-2 text-sm font-medium text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                }
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
