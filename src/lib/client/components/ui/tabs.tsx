import {cn} from "@/lib/utils/classnames";
import {Tabs as TabsPrimitive} from "@base-ui/react/tabs";
import {cva, type VariantProps} from "class-variance-authority";


const tabTriggerVariants = cva(
    "relative flex shrink-0 items-center gap-2 rounded-t-lg px-5 py-3 text-sm font-medium whitespace-nowrap capitalize " +
    "text-muted-foreground transition-all outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset " +
    "focus-visible:ring-ring after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand after:opacity-0 " +
    "data-[active]:after:opacity-100 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            accent: {
                true: "data-[active]:text-brand",
                false: "data-[active]:text-foreground",
            },
        },
        defaultVariants: {
            accent: false,
        },
    },
);


function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn("flex min-h-0 flex-col", className)}
            {...props}
        />
    );
}


function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn("scrollbar-thin flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b", className)}
            {...props}
        />
    );
}


function TabsTrigger({ className, accent, ...props }: TabsPrimitive.Tab.Props & VariantProps<typeof tabTriggerVariants>) {
    return (
        <TabsPrimitive.Tab
            data-slot="tabs-trigger"
            className={cn(tabTriggerVariants({ accent }), "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)}
            {...props}
        />
    );
}


function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
    return (
        <TabsPrimitive.Panel
            data-slot="tabs-content"
            className={cn("min-h-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className)}
            {...props}
        />
    );
}


export {Tabs, TabsList, TabsTrigger, TabsContent, tabTriggerVariants};
