import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Camera Management
  cameras: defineTable({
    name: v.string(),
    rtspUrl: v.string(),
    location: v.string(),
    isActive: v.boolean(),
    resolution: v.string(), // "1920x1080"
    fps: v.number(),
    tenantId: v.id("tenants"),
    lastHeartbeat: v.optional(v.number()),
    settings: v.object({
      faceDetection: v.boolean(),
      plateRecognition: v.boolean(),
      motionDetection: v.boolean(),
      recordingEnabled: v.boolean(),
    }),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_active", ["isActive"])
    .index("by_tenant_and_active", ["tenantId", "isActive"]),

  // Tenant Management (Multi-tenancy)
  tenants: defineTable({
    name: v.string(),
    plan: v.union(v.literal("basic"), v.literal("pro"), v.literal("enterprise")),
    maxCameras: v.number(),
    isActive: v.boolean(),
    settings: v.object({
      retentionDays: v.number(),
      aiProcessingEnabled: v.boolean(),
      alertsEnabled: v.boolean(),
    }),
  }),

  // AI Events (Time-series optimized)
  aiEvents: defineTable({
    cameraId: v.id("cameras"),
    tenantId: v.id("tenants"),
    eventType: v.union(
      v.literal("face_detected"),
      v.literal("face_recognized"),
      v.literal("plate_detected"),
      v.literal("motion_detected"),
      v.literal("unknown_person"),
      v.literal("alert_triggered")
    ),
    confidence: v.number(), // 0.0 - 1.0
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
    frameImageId: v.optional(v.id("_storage")), // Cropped detection image
    fullFrameId: v.optional(v.id("_storage")), // Full frame for context
    processed: v.boolean(),
    alertSent: v.boolean(),
  })
    .index("by_camera_and_time", ["cameraId"])
    .index("by_tenant_and_time", ["tenantId"])
    .index("by_event_type", ["eventType"])
    .index("by_unprocessed", ["processed"])
    .searchIndex("search_events", {
      searchField: "metadata",
      filterFields: ["tenantId", "eventType", "cameraId"],
    }),

  // Known Persons Database
  knownPersons: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    employeeId: v.optional(v.string()),
    department: v.optional(v.string()),
    accessLevel: v.union(
      v.literal("visitor"),
      v.literal("employee"),
      v.literal("contractor"),
      v.literal("vip"),
      v.literal("restricted")
    ),
    isActive: v.boolean(),
    faceEmbedding: v.array(v.number()), // 512-dim face embedding
    profileImageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    lastSeen: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_active", ["tenantId", "isActive"])
    .index("by_employee_id", ["employeeId"])
    .searchIndex("search_persons", {
      searchField: "name",
      filterFields: ["tenantId", "accessLevel"],
    }),

  // Vehicle/License Plate Database
  knownVehicles: defineTable({
    tenantId: v.id("tenants"),
    plateNumber: v.string(),
    ownerName: v.optional(v.string()),
    vehicleType: v.string(), // "car", "truck", "motorcycle", etc.
    color: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    accessLevel: v.union(
      v.literal("authorized"),
      v.literal("visitor"),
      v.literal("restricted"),
      v.literal("blacklisted")
    ),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    lastSeen: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_plate", ["plateNumber"])
    .index("by_tenant_and_plate", ["tenantId", "plateNumber"]),

  // System Alerts
  alerts: defineTable({
    tenantId: v.id("tenants"),
    cameraId: v.id("cameras"),
    eventId: v.id("aiEvents"),
    alertType: v.union(
      v.literal("unauthorized_person"),
      v.literal("restricted_vehicle"),
      v.literal("motion_after_hours"),
      v.literal("camera_offline"),
      v.literal("system_error")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    title: v.string(),
    description: v.string(),
    isResolved: v.boolean(),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    notificationsSent: v.array(v.string()), // email addresses notified
  })
    .index("by_tenant", ["tenantId"])
    .index("by_unresolved", ["isResolved"])
    .index("by_severity", ["severity"])
    .index("by_tenant_and_unresolved", ["tenantId", "isResolved"]),

  // Video Recordings Metadata
  recordings: defineTable({
    cameraId: v.id("cameras"),
    tenantId: v.id("tenants"),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(), // seconds
    fileSize: v.number(), // bytes
    storageId: v.id("_storage"),
    recordingType: v.union(v.literal("continuous"), v.literal("event_triggered"), v.literal("manual")),
    hasAiEvents: v.boolean(),
    isArchived: v.boolean(),
  })
    .index("by_camera_and_time", ["cameraId", "startTime"])
    .index("by_tenant_and_time", ["tenantId", "startTime"])
    .index("by_recording_type", ["recordingType"]),

  // System Performance Metrics
  systemMetrics: defineTable({
    timestamp: v.number(),
    metricType: v.union(
      v.literal("cpu_usage"),
      v.literal("memory_usage"),
      v.literal("gpu_usage"),
      v.literal("disk_usage"),
      v.literal("network_io"),
      v.literal("ai_processing_time"),
      v.literal("camera_fps")
    ),
    value: v.number(),
    cameraId: v.optional(v.id("cameras")),
    tenantId: v.optional(v.id("tenants")),
    metadata: v.optional(v.object({
      unit: v.string(),
      threshold: v.optional(v.number()),
      status: v.optional(v.string()),
    })),
  })
    .index("by_type_and_time", ["metricType", "timestamp"])
    .index("by_camera_and_time", ["cameraId", "timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
