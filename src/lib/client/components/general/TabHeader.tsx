import {cn} from "@/lib/utils/classnames";
import React, {ReactNode} from "react";


export interface TabItem<T> {
    id: T;
    isAccent?: boolean;
    icon?: React.ReactNode;
    label: string | React.ReactNode;
}


interface TabHeaderProps<T extends string> {
    activeTab: T;
    tabs: TabItem<T>[];
    className?: string;
    children?: ReactNode;
    setActiveTab: (value: T) => void;
}


export const TabHeader = <T extends string>({ tabs, activeTab, setActiveTab, children, className }: TabHeaderProps<T>) => {
    return (
        <div className="flex items-center justify-between border-b">
            <div className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex shrink-0 items-center gap-2 rounded-t-lg px-5 py-3 text-sm font-medium transition-all",
                                isActive ? tab.isAccent ? "text-app-accent" : "text-primary" : "text-muted-foreground hover:text-primary",
                                className,
                            )}
                        >
                            {tab.icon &&
                                <span className="shrink-0">
                                    {tab.icon}
                                </span>
                            }
                            <span className="whitespace-nowrap capitalize">
                                {tab.label}
                            </span>
                            {isActive &&
                                <div className="bg-app-accent absolute bottom-0 left-0 right-0 h-0.5"/>
                            }
                        </button>
                    );
                })}
            </div>

            {children &&
                <div className="flex shrink-0 items-center px-2">
                    {children}
                </div>
            }
        </div>
    );
};
