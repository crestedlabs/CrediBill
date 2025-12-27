import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get comprehensive overview metrics for the dashboard
export const getOverviewMetrics = query({
  args: {
    appId: v.optional(v.id("apps")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get user's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) throw new Error("No organization found");

    const organizationId = membership.organizationId;

    // Filter by app if specified, otherwise use all apps
    let apps;
    if (args.appId) {
      const app = await ctx.db.get(args.appId);
      if (!app || app.organizationId !== organizationId) {
        throw new Error("App not found or unauthorized");
      }
      apps = [app];
    } else {
      apps = await ctx.db
        .query("apps")
        .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
        .collect();
    }

    const appIds = apps.map((app) => app._id);

    // Get all subscriptions for these apps
    const allSubscriptions = await ctx.db
      .query("subscriptions")
      .collect()
      .then((subs) =>
        subs.filter((sub) => appIds.includes(sub.appId))
      );

    // Calculate key metrics
    const activeSubscriptions = allSubscriptions.filter(
      (sub) => sub.status === "active"
    ).length;

    const trialingSubscriptions = allSubscriptions.filter(
      (sub) => sub.status === "trialing"
    ).length;

    const pastDueSubscriptions = allSubscriptions.filter(
      (sub) => sub.status === "past_due"
    ).length;

    const canceledSubscriptions = allSubscriptions.filter(
      (sub) => sub.status === "cancelled"
    ).length;

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    let totalRevenue = 0;
    const currencyBreakdown: Record<string, number> = {};

    for (const subscription of allSubscriptions) {
      if (subscription.status !== "active" && subscription.status !== "trialing") {
        continue;
      }

      const plan = await ctx.db.get(subscription.planId);
      if (!plan) continue;

      // Get revenue from invoices
      const invoices = await ctx.db
        .query("invoices")
        .withIndex("by_subscription", (q) =>
          q.eq("subscriptionId", subscription._id)
        )
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();

      const subscriptionRevenue = invoices.reduce(
        (sum, inv) => sum + (inv.amountPaid || 0),
        0
      );

      totalRevenue += subscriptionRevenue;

      // Calculate MRR based on plan interval
      if (plan.baseAmount && subscription.status === "active") {
        let monthlyAmount = 0;
        switch (plan.interval) {
          case "monthly":
            monthlyAmount = plan.baseAmount;
            break;
          case "quarterly":
            monthlyAmount = plan.baseAmount / 3;
            break;
          case "yearly":
            monthlyAmount = plan.baseAmount / 12;
            break;
        }

        mrr += monthlyAmount;

        // Track by currency
        const currency = plan.currency;
        currencyBreakdown[currency] =
          (currencyBreakdown[currency] || 0) + monthlyAmount;
      }
    }

    // Get trials expiring soon (next 7 days)
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const trialsExpiringSoon = allSubscriptions.filter(
      (sub) =>
        sub.status === "trialing" &&
        sub.trialEndsAt &&
        sub.trialEndsAt > now &&
        sub.trialEndsAt <= sevenDaysFromNow
    ).length;

    // Get plan performance metrics
    const planPerformance: Array<{
      planId: string;
      planName: string;
      subscribers: number;
      mrr: number;
      currency: string;
    }> = [];

    const plans = await ctx.db
      .query("plans")
      .collect()
      .then((plans) =>
        plans.filter(
          (plan) =>
            appIds.includes(plan.appId) && plan.status === "active"
        )
      );

    for (const plan of plans) {
      const planSubs = allSubscriptions.filter(
        (sub) =>
          sub.planId === plan._id &&
          (sub.status === "active" || sub.status === "trialing")
      );

      let planMrr = 0;
      if (plan.baseAmount) {
        for (const sub of planSubs) {
          if (sub.status === "active") {
            let monthlyAmount = 0;
            switch (plan.interval) {
              case "monthly":
                monthlyAmount = plan.baseAmount;
                break;
              case "quarterly":
                monthlyAmount = plan.baseAmount / 3;
                break;
              case "yearly":
                monthlyAmount = plan.baseAmount / 12;
                break;
            }
            planMrr += monthlyAmount;
          }
        }
      }

      planPerformance.push({
        planId: plan._id,
        planName: plan.name,
        subscribers: planSubs.length,
        mrr: Math.round(planMrr),
        currency: plan.currency,
      });
    }

    // Sort by MRR descending
    planPerformance.sort((a, b) => b.mrr - a.mrr);

    // Get churn rate (simplified - canceled in last 30 days vs active)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentCancellations = allSubscriptions.filter(
      (sub) =>
        sub.status === "cancelled" &&
        sub.currentPeriodEnd &&
        sub.currentPeriodEnd >= thirtyDaysAgo
    ).length;

    const totalActive = activeSubscriptions + trialingSubscriptions;
    const churnRate =
      totalActive > 0
        ? ((recentCancellations / totalActive) * 100).toFixed(1)
        : "0";

    return {
      // Core metrics
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,
      trialsExpiringSoon,
      
      // Revenue metrics
      mrr: Math.round(mrr),
      totalRevenue: Math.round(totalRevenue),
      currencyBreakdown,
      
      // Performance
      planPerformance: planPerformance.slice(0, 5), // Top 5 plans
      churnRate,
      
      // Totals
      totalSubscriptions: allSubscriptions.length,
      totalCustomers: new Set(allSubscriptions.map((sub) => sub.customerId))
        .size,
    };
  },
});
