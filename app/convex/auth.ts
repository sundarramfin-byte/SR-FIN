import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

/** The first account, created automatically the first time anyone signs in. Change the password after go-live. */
const DEFAULT_EMAIL = "srfin@gmail.com";
const DEFAULT_PASSWORD = "SR@123";

const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return hex(bits);
}

const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));

async function createUser(ctx: MutationCtx, email: string, password: string) {
  const salt = randomHex(16);
  return ctx.db.insert("users", { email, salt, passwordHash: await hashPassword(password, salt) });
}

/** Sign in. Returns a session token the browser keeps until the user logs out. */
export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    if ((await ctx.db.query("users").first()) === null) await createUser(ctx, DEFAULT_EMAIL, DEFAULT_PASSWORD);

    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).unique();
    const ok = user !== null && (await hashPassword(password, user.salt)) === user.passwordHash;
    if (!user || !ok) throw new Error("Wrong email or password");

    const token = randomHex(32);
    await ctx.db.insert("sessions", { token, userId: user._id });
    return token;
  },
});

/** Who is signed in for this token (null if the token is unknown or logged out). */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!s) return null;
    const user = await ctx.db.get(s.userId);
    return user ? { email: user.email } : null;
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});
