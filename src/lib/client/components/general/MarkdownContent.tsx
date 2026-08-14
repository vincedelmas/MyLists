import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {cn} from "@/lib/utils/classnames";


interface MarkdownContentProps {
    children: string;
    className?: string;
}


export const MarkdownContent = ({ children, className }: MarkdownContentProps) => {
    return (
        <div className={cn(
            "min-w-0 break-words text-sm leading-6 text-foreground",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            "[&_p]:my-3 [&_h1]:my-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-4 [&_h2]:text-xl [&_h2]:font-semibold",
            "[&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:my-3 [&_h4]:font-semibold",
            "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul.contains-task-list]:list-none [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
            "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
            "[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-80",
            "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
            "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3",
            "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:my-5 [&_hr]:border-border",
            "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left",
            "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_input]:mr-2",
            "[&_img]:my-4 [&_img]:max-h-120 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:object-contain",
            className,
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children: linkChildren }) => (
                        <a href={href} target="_blank" rel="nofollow noopener noreferrer">
                            {linkChildren}
                        </a>
                    ),
                    img: ({ src, alt }) => (
                        <img src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer"/>
                    ),
                    table: ({ children: tableChildren }) => (
                        <div className="my-3 overflow-x-auto">
                            <table>{tableChildren}</table>
                        </div>
                    ),
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
};
