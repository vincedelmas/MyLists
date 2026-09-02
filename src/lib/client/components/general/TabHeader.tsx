import React, {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";


export interface TabItem<TId extends string = string> {
    id: TId;
    isAccent?: boolean;
    icon?: React.ReactNode;
    label: string | React.ReactNode;
}


interface TabTriggerProps {
    className: string;
    children: ReactNode;
    "aria-current"?: "page";
}


type TabHeaderInteraction<TItem extends TabItem> = {
    onValueChange?: never;
    renderTrigger: (item: TItem, props: TabTriggerProps) => ReactNode;
} | {
    renderTrigger?: never;
    onValueChange: (value: TItem["id"]) => void;
};


type TabHeaderProps<TItem extends TabItem> = TabHeaderInteraction<TItem> & {
    value: TItem["id"];
    trailing?: ReactNode;
    tabs: readonly TItem[];
    triggerClassName?: string;
};


export const TabHeader = <TItem extends TabItem>(props: TabHeaderProps<TItem>) => {
    const { tabs, value, trailing, triggerClassName } = props;

    return (
        <div className="flex items-center justify-between border-b">
            <div className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = value === tab.id;

                    const tabClassName = cn(
                        "relative flex shrink-0 items-center gap-2 rounded-t-lg px-5 py-3 text-sm font-medium transition-all",
                        isActive ? tab.isAccent ? "text-brand" : "text-foreground" : "text-muted-foreground hover:text-foreground",
                        triggerClassName,
                    );

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

                            {isActive &&
                                <span
                                    aria-hidden="true"
                                    className="bg-brand absolute bottom-0 left-0 right-0 h-0.5"
                                />
                            }
                        </>
                    );

                    if (props.renderTrigger) {
                        return (
                            <React.Fragment key={tab.id}>
                                {props.renderTrigger(tab, {
                                    children: tabContent,
                                    className: tabClassName,
                                    "aria-current": isActive ? "page" : undefined,
                                })}
                            </React.Fragment>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            aria-pressed={isActive}
                            className={tabClassName}
                            onClick={() => props.onValueChange(tab.id)}
                        >
                            {tabContent}
                        </button>
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
