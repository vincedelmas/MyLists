import React, {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {tabTriggerVariants} from "@/lib/client/components/ui/tabs";


export interface TabItem<TId extends string = string> {
    id: TId;
    isAccent?: boolean;
    icon?: React.ReactNode;
    label: string | React.ReactNode;
}


interface TabTriggerProps {
    className: string;
    "data-active"?: "";
    children: ReactNode;
    "aria-current"?: "page";
}


interface TabNavProps<TItem extends TabItem> {
    value: TItem["id"];
    trailing?: ReactNode;
    tabs: readonly TItem[];
    triggerClassName?: string;
    renderTrigger: (item: TItem, props: TabTriggerProps) => ReactNode;
}


export const TabNav = <TItem extends TabItem>(props: TabNavProps<TItem>) => {
    const { tabs, value, trailing, triggerClassName } = props;

    return (
        <div className="flex items-center justify-between border-b">
            <div className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = value === tab.id;

                    const tabContent = (
                        <>
                            {tab.icon &&
                                <span className="shrink-0">
                                    {tab.icon}
                                </span>
                            }
                            <span className="whitespace-nowrap capitalize">
                                {tab.label}
                            </span>
                        </>
                    );

                    return (
                        <React.Fragment key={tab.id}>
                            {props.renderTrigger(tab, {
                                children: tabContent,
                                "data-active": isActive ? "" : undefined,
                                "aria-current": isActive ? "page" : undefined,
                                className: cn(tabTriggerVariants({ accent: tab.isAccent }), triggerClassName),
                            })}
                        </React.Fragment>
                    );
                })}
            </div>

            {trailing &&
                <div className="flex shrink-0 items-center px-2">
                    {trailing}
                </div>
            }
        </div>
    );
};
