import {z} from "zod";
import {RoleType} from "@/lib/utils/enums";
import {auth} from "@/lib/server/core/auth";
import type {UserWithRole} from "better-auth/plugins";
import {createLocalAccountIssuer} from "better-auth/db";
import {defineTask} from "@/lib/server/tasks/define-task";


export const createUserTask = defineTask({
    visibility: "admin",
    name: "create-user" as const,
    description: "Create a new user account",
    inputSchema: z.object({
        email: z.email().describe("Email address"),
        password: z.string().min(8).describe("Password (min 8 characters)"),
        username: z.string().min(3).describe("Username for the new account"),
        role: z.enum(RoleType).default(RoleType.USER).describe("User role"),
    }),
    handler: async (ctx, input) => {
        const authCtx = await auth.$context;

        await ctx.step("create-and-verify-user", async () => {
            const email = input.email.toLowerCase();
            const isValidEmail = z.email().safeParse(email);
            if (!isValidEmail.success) {
                throw new Error(`Invalid email address: ${email}`);
            }

            const existUser = await authCtx.internalAdapter.findUserByEmail(email);
            if (existUser) {
                throw new Error(`User with email ${email} already exists.`);
            }

            const user = await authCtx.internalAdapter.createUser<UserWithRole>({
                email,
                role: input.role,
                emailVerified: true,
                name: input.username,
            }, { method: "admin" });
            if (!user) {
                throw new Error("Failed to create user.");
            }

            const hashedPassword = await authCtx.password.hash(input.password);
            await authCtx.internalAdapter.linkAccount({
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: hashedPassword,
                issuer: createLocalAccountIssuer("credential"),
            });

            ctx.metric("userId", user.id);
            ctx.metric("role", input.role);
            ctx.metric("username", user.name);
            ctx.info(`Account ${input.email} created and verified.`);
        });
    },
});
