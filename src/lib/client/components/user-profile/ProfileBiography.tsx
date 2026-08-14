import {useEffect, useRef, useState} from "react";
import {ChevronDown, ChevronUp} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Button} from "@/lib/client/components/ui/button";
import {MarkdownContent} from "@/lib/client/components/general/MarkdownContent";


const COLLAPSED_HEIGHT_PX = 72;


export const ProfileBiography = ({ biography }: { biography?: string }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [canExpand, setCanExpand] = useState(false);

    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;

        setIsExpanded(false);
        const updateOverflow = () => setCanExpand(content.scrollHeight > COLLAPSED_HEIGHT_PX);
        const observer = new ResizeObserver(updateOverflow);

        updateOverflow();
        observer.observe(content);
        return () => observer.disconnect();
    }, [biography]);

    if (!biography) return null;

    return (
        <section className="mb-6 rounded-xl border bg-card px-5 py-4 shadow-xs" aria-labelledby="profile-biography-heading">
            <h2 id="profile-biography-heading" className="mb-2 text-sm font-semibold text-muted-foreground">
                About
            </h2>
            <div className="relative">
                <div className={cn("overflow-hidden", !isExpanded && "max-h-18")}>
                    <div ref={contentRef}>
                        <MarkdownContent>{biography}</MarkdownContent>
                    </div>
                </div>
                {canExpand && !isExpanded &&
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-card to-transparent"/>
                }
            </div>
            {canExpand &&
                <Button
                    type="button"
                    size="bare"
                    variant="ghost"
                    className="mt-2 text-xs text-brand"
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded((expanded) => !expanded)}
                >
                    {isExpanded ?
                        <>Show less <ChevronUp/></>
                        :
                        <>Show more <ChevronDown/></>
                    }
                </Button>
            }
        </section>
    );
};
