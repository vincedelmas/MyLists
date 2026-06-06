import {z} from "zod";
import {Command} from "commander";
import {runTask} from "@/lib/server/tasks/task-runner";
import {getAllTasks} from "@/lib/server/tasks/registry";


const program = new Command();

program
    .name("mylists-cli")
    .description("CLI for MyLists")
    .version("1.0.0");

const tasks = getAllTasks();

for (const task of tasks) {
    const cmd = program
        .command(task.name)
        .description(task.description)
        .option("-j, --json", "Output logs as JSON");

    const cliOptions = extractCLIOptions(task.inputSchema);

    for (const option of cliOptions) {
        const description = option.defaultValue === undefined
            ? option.description
            : `${option.description} (default: ${formatDefaultValue(option.defaultValue)})`;

        if (option.required) {
            cmd.requiredOption(option.flag, description);
        }
        else {
            cmd.option(option.flag, description);
        }
    }

    cmd.action(async (options) => {
        try {
            const rawInput = parseClIOptions(options, cliOptions);
            const input = task.inputSchema.parse(rawInput);

            console.log(`\nRunning task: ${task.name}`);
            console.log(`Input: ${JSON.stringify(input, null, 2)}\n`);

            await runTask({
                input: input as any,
                taskName: task.name,
                triggeredBy: "cron/cli",
                stdoutAsJson: options.json,
            });

            process.exit(0);
        }
        catch (error) {
            console.error("Failed to run task:", error);
            process.exit(1);
        }
    });
}


if (process.argv.slice(2).length) {
    await program.parseAsync(process.argv);
}
else {
    program.outputHelp();
}


interface CLIOption {
    flag: string;
    required: boolean;
    description: string;
    enumValues?: string[];
    defaultValue?: unknown;
    arrayItemType?: "string" | "number";
    type: "string" | "number" | "boolean" | "enum" | "array";
}


function parseClIOptions(options: Record<string, any>, definitions: CLIOption[]) {
    const result: Record<string, any> = {};

    for (const def of definitions) {
        const match = def.flag.match(/--([a-z-]+)/);
        if (!match) continue;

        const kebabKey = match[1];
        const camelKey = kebabKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const value = options[camelKey];
        if (value === undefined) continue;

        switch (def.type) {
            case "number":
                result[camelKey] = Number(value);
                break;
            case "boolean":
                result[camelKey] = value === true || value === "true";
                break;
            case "enum":
                if (def.enumValues && !def.enumValues.includes(value)) {
                    throw new Error(`Invalid value "${value}" for ${camelKey}. Valid: ${def.enumValues.join(", ")}`);
                }
                result[camelKey] = value;
                break;
            case "array": {
                const arr = Array.isArray(value) ? value : [value];
                if (def.arrayItemType === "number") {
                    result[camelKey] = arr.map(Number);
                }
                else {
                    result[camelKey] = arr;
                }
                if (def.enumValues) {
                    for (const item of result[camelKey]) {
                        if (!def.enumValues.includes(item)) {
                            throw new Error(`Invalid value "${item}" for ${camelKey}. Valid: ${def.enumValues.join(", ")}`);
                        }
                    }
                }
                break;
            }
            default:
                result[camelKey] = value;
        }
    }

    return result;
}


function extractCLIOptions(schema: z.ZodObject) {
    const options: CLIOption[] = [];
    const takenShortFlags = new Set<string>(["j", "h", "v"]);

    for (const [key, fieldSchema] of Object.entries(schema.shape)) {
        const option = extractSingleOption(key, fieldSchema, takenShortFlags);
        if (option) options.push(option);
    }

    return options;
}


function extractSingleOption(key: string, schema: z.ZodType, takenShortFlags: Set<string>) {
    const { innerSchema, required, defaultValue, description } = unwrapClISchema(key, schema);

    let enumValues: string[] | undefined;
    let type: CLIOption["type"] = "string";
    let arrayItemType: CLIOption["arrayItemType"];

    if (innerSchema instanceof z.ZodNumber) {
        type = "number";
    }
    else if (innerSchema instanceof z.ZodBoolean) {
        type = "boolean";
    }
    else if (innerSchema instanceof z.ZodEnum) {
        type = "enum";
        enumValues = innerSchema.options as string[];
    }
    else if (innerSchema instanceof z.ZodArray) {
        type = "array";
        const elementSchema = innerSchema.element;
        if (elementSchema instanceof z.ZodNumber) {
            arrayItemType = "number";
        }
        else {
            arrayItemType = "string";
        }

        if (elementSchema instanceof z.ZodEnum) {
            enumValues = elementSchema.options as string[];
        }
    }

    // Build flag
    const kebab = kebabCase(key);
    let shortFlag = key[0].toLowerCase();
    if (takenShortFlags.has(shortFlag)) {
        shortFlag = "";
    }
    else {
        takenShortFlags.add(shortFlag);
    }

    const flagBase = shortFlag ? `-${shortFlag}, --${kebab}` : `--${kebab}`;
    const flag = type === "boolean"
        ? flagBase
        : type === "array"
            ? `${flagBase} <values...>`
            : `${flagBase} <value>`;

    let finalDescription = description;
    if (enumValues) {
        finalDescription += ` (choices: ${enumValues.join(", ")})`;
    }

    return {
        flag,
        type,
        required,
        enumValues,
        defaultValue,
        arrayItemType,
        description: finalDescription,
    };
}


function unwrapClISchema(key: string, schema: z.ZodType) {
    let required = true;
    let innerSchema = schema;
    let defaultValue: CLIOption["defaultValue"];
    const wrapperDescription = schema.description;

    while (true) {
        if (innerSchema instanceof z.ZodOptional) {
            required = false;
            innerSchema = innerSchema.unwrap() as any;
            continue;
        }

        if (innerSchema instanceof z.ZodDefault) {
            required = false;
            defaultValue = innerSchema.def.defaultValue as any;
            innerSchema = innerSchema.def.innerType as any;
            continue;
        }

        break;
    }

    return {
        required,
        innerSchema,
        defaultValue,
        description: wrapperDescription ?? innerSchema.description ?? `The ${key} parameter`,
    };
}


function formatDefaultValue(value: CLIOption["defaultValue"]) {
    return Array.isArray(value) ? value.join(", ") : String(value);
}


function kebabCase(str: string) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
