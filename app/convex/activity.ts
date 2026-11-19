import { query } from "./_generated/server";

/** Latest audit-log entries – feeds the notification bell. */
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("auditLogs").order("desc").take(10);
    return rows.map((r) => ({
      _id: r._id,
      at: r._creationTime,
      action: r.action,
      entity: r.entity,
      summary: r.summary,
    }));
  },
});
