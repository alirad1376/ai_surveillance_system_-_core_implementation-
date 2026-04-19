import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function getUserTenant(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  
  let tenant = await ctx.db
    .query("tenants")
    .filter((q: any) => q.eq(q.field("name"), "Demo Tenant"))
    .first();
    
  // Tenant will be null if not found - queries cannot create data
  
  return tenant;
}

export const createAiEvent = mutation({
  args: {
    cameraId: v.id("cameras"),
    eventType: v.union(
      v.literal("face_detected"),
      v.literal("face_recognized"),
      v.literal("plate_detected"),
      v.literal("motion_detected"),
      v.literal("unknown_person"),
      v.literal("alert_triggered")
    ),
    confidence: v.number(),
    boundingBox: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    metadata: v.object({
      personId: v.optional(v.id("knownPersons")),
      plateNumber: v.optional(v.string()),
      vehicleType: v.optional(v.string()),
      direction: v.optional(v.string()),
      speed: v.optional(v.number()),
    }),
    frameImageId: v.optional(v.id("_storage")),
    fullFrameId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const camera = await ctx.db.get(args.cameraId);
    if (!camera) throw new Error("Camera not found");
    
    const eventId = await ctx.db.insert("aiEvents", {
      cameraId: args.cameraId,
      tenantId: camera.tenantId,
      eventType: args.eventType,
      confidence: args.confidence,
      boundingBox: args.boundingBox,
      metadata: args.metadata,
      frameImageId: args.frameImageId,
      fullFrameId: args.fullFrameId,
      processed: false,
      alertSent: false,
    });
    
    // Schedule AI processing
    await ctx.scheduler.runAfter(0, internal.aiEvents.processEvent, {
      eventId,
    });
    
    return eventId;
  },
});

export const processEvent = internalAction({
  args: {
    eventId: v.id("aiEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(internal.aiEvents.getEvent, {
      eventId: args.eventId,
    });
    
    if (!event) return;
    
    // Simulate AI processing logic
    let shouldAlert = false;
    let alertType = null;
    let severity = "low";
    
    if (event.eventType === "unknown_person" && event.confidence > 0.8) {
      shouldAlert = true;
      alertType = "unauthorized_person";
      severity = "high";
    }
    
    if (event.eventType === "plate_detected" && event.metadata.plateNumber) {
      // Check if vehicle is in blacklist
      const vehicle = await ctx.runQuery(internal.aiEvents.checkVehicle, {
        plateNumber: event.metadata.plateNumber,
        tenantId: event.tenantId,
      });
      
      if (vehicle && vehicle.accessLevel === "blacklisted") {
        shouldAlert = true;
        alertType = "restricted_vehicle";
        severity = "critical";
      }
    }
    
    // Mark as processed
    await ctx.runMutation(internal.aiEvents.markProcessed, {
      eventId: args.eventId,
    });
    
    // Create alert if needed
    if (shouldAlert && alertType) {
      await ctx.runMutation(internal.aiEvents.createAlert, {
        eventId: args.eventId,
        alertType,
        severity,
      });
    }
  },
});

export const getEvent = internalQuery({
  args: { eventId: v.id("aiEvents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

export const checkVehicle = internalQuery({
  args: {
    plateNumber: v.string(),
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knownVehicles")
      .withIndex("by_tenant_and_plate", (q) => 
        q.eq("tenantId", args.tenantId).eq("plateNumber", args.plateNumber)
      )
      .first();
  },
});

export const markProcessed = internalMutation({
  args: { eventId: v.id("aiEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { processed: true });
  },
});

export const createAlert = internalMutation({
  args: {
    eventId: v.id("aiEvents"),
    alertType: v.string(),
    severity: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;
    
    const camera = await ctx.db.get(event.cameraId);
    if (!camera) return;
    
    await ctx.db.insert("alerts", {
      tenantId: event.tenantId,
      cameraId: event.cameraId,
      eventId: args.eventId,
      alertType: args.alertType as any,
      severity: args.severity as any,
      title: `${args.alertType.replace('_', ' ').toUpperCase()} - ${camera.name}`,
      description: `AI detected ${args.alertType} at ${camera.location}`,
      isResolved: false,
      notificationsSent: [],
    });
  },
});

export const getRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tenant = await getUserTenant(ctx);
    if (!tenant) return [];
    
    const events = await ctx.db
      .query("aiEvents")
      .withIndex("by_tenant_and_time", (q) => q.eq("tenantId", tenant._id))
      .order("desc")
      .take(args.limit || 50);
    
    // Get camera names and image URLs
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const camera = await ctx.db.get(event.cameraId);
        const frameUrl = event.frameImageId 
          ? await ctx.storage.getUrl(event.frameImageId)
          : null;
        const fullFrameUrl = event.fullFrameId
          ? await ctx.storage.getUrl(event.fullFrameId)
          : null;
          
        return {
          ...event,
          cameraName: camera?.name || "Unknown",
          cameraLocation: camera?.location || "Unknown",
          frameUrl,
          fullFrameUrl,
        };
      })
    );
    
    return eventsWithDetails;
  },
});

export const getEventStats = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await getUserTenant(ctx);
    if (!tenant) return { total: 0, today: 0, alerts: 0 };
    
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    const allEvents = await ctx.db
      .query("aiEvents")
      .withIndex("by_tenant_and_time", (q) => q.eq("tenantId", tenant._id))
      .collect();
    
    const todayEvents = allEvents.filter(e => e._creationTime >= todayStart);
    
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_tenant_and_unresolved", (q) => 
        q.eq("tenantId", tenant._id).eq("isResolved", false)
      )
      .collect();
    
    return {
      total: allEvents.length,
      today: todayEvents.length,
      alerts: alerts.length,
    };
  },
});
