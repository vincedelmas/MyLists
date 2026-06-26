import {z} from "zod";
import {TaskVisibility} from "@/lib/types/tasks.types";
import {TaskContext} from "@/lib/server/tasks/task-context";


export type TaskDefinition<TName extends string, TInputSchema extends z.ZodType> = {
    name: TName;
    description: string;
    inputSchema: TInputSchema;
    visibility: TaskVisibility;
    handler: (ctx: TaskContext, input: z.input<TInputSchema>) => Promise<void>;
};

type TaskDefinitionConfig<TName extends string, TInputSchema extends z.ZodType> =
    Omit<TaskDefinition<TName, TInputSchema>, "handler"> & {
        handler: (ctx: TaskContext, input: z.output<TInputSchema>) => Promise<void>;
    };


export const defineTask = <
    TName extends string,
    TInputSchema extends z.ZodType,
>(def: TaskDefinitionConfig<TName, TInputSchema>): TaskDefinition<TName, TInputSchema> => {
    return {
        ...def,
        handler: (ctx, input) => def.handler(ctx, def.inputSchema.parse(input)),
    };
}
