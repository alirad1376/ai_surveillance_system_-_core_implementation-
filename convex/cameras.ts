import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user's tenant (simplified for demo)
async function getUserTenant(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  
  // In production, you'd have a user-tenant relationship
  // For demo, we'll create a default tenant
  let tenant = await ctx.db
    .query("tenants")
    .filter((q: any) => q.eq(q.field("name"), "Demo Tenant"))
    .first();
    
  // Tenant will be null if not found - queries cannot create data
  
  return tenant;
}

// Create default tenant (mutation)
export const createDefaultTenant = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Check if tenant already exists
    const existingTenant = await ctx.db
      .query("tenants")
      .filter((q: any) => q.eq(q.field("name"), "Demo Tenant"))
      .first();
      
    if (existingTenant) {
      return existingTenant._id;
    }
    
    // Create new tenant
    const tenantId = await ctx.db.insert("tenants", {
      name: "Demo Tenant",
      plan: "pro",
      maxCameras: 10,
      isActive: true,
      settings: {
        retentionDays: 30,
        aiProcessingEnabled: true,
        alertsEnabled: true,
      },
    });
    
    return tenantId;
  },
});

export const listCameras = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await getUserTenant(ctx);
    if (!tenant) return [];
    
    return await ctx.db
      .query("cameras")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
  },
});

export const addCamera = mutation({
  args: {
    name: v.string(),
    rtspUrl: v.string(),
    location: v.string(),
    resolution: v.string(),
    fps: v.number(),
  },
  handler: async (ctx, args) => {
    const tenant = await getUserTenant(ctx);
    if (!tenant) throw new Error("No tenant found");
    
    const existingCameras = await ctx.db
      .query("cameras")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
      
    if (existingCameras.length >= tenant.maxCameras) {
      throw new Error(`Camera limit reached (${tenant.maxCameras})`);
    }
    
    return await ctx.db.insert("cameras", {
      name: args.name,
      rtspUrl: args.rtspUrl,
      location: args.location,
      resolution: args.resolution,
      fps: args.fps,
      isActive: true,
      tenantId: tenant._id,
      lastHeartbeat: Date.now(),
      settings: {
        faceDetection: true,
        plateRecognition: true,
        motionDetection: true,
        recordingEnabled: true,
      },
    });
  },
});

export const updateCameraSettings = mutation({
  args: {
    cameraId: v.id("cameras"),
    settings: v.object({
      faceDetection: v.boolean(),
      plateRecognition: v.boolean(),
      motionDetection: v.boolean(),
      recordingEnabled: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const tenant = await getUserTenant(ctx);
    if (!tenant) throw new Error("No tenant found");
    
    const camera = await ctx.db.get(args.cameraId);
    if (!camera || camera.tenantId !== tenant._id) {
      throw new Error("Camera not found or access denied");
    }
    
    await ctx.db.patch(args.cameraId, {
      settings: args.settings,
    });
  },
});

export const updateCameraHeartbeat = mutation({
  args: {
    cameraId: v.id("cameras"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cameraId, {
      lastHeartbeat: Date.now(),
    });
  },
});

export const getCameraStats = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await getUserTenant(ctx);
    if (!tenant) return { total: 0, active: 0, offline: 0 };
    
    const cameras = await ctx.db
      .query("cameras")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
      .collect();
    
    const now = Date.now();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes
    
    const active = cameras.filter(c => 
      c.isActive && 
      c.lastHeartbeat && 
      (now - c.lastHeartbeat) < offlineThreshold
    ).length;
    
    return {
      total: cameras.length,
      active,
      offline: cameras.length - active,
    };
  },
});
