import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// RTSP Frame Upload Endpoint
http.route({
  path: "/api/camera/frame",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const formData = await request.formData();
      const cameraId = formData.get("cameraId") as string;
      const frameFile = formData.get("frame") as File;
      const timestamp = formData.get("timestamp") as string;
      const aiResults = formData.get("aiResults") as string;
      
      if (!cameraId || !frameFile) {
        return new Response("Missing required fields", { status: 400 });
      }
      
      // Store the frame image
      const storageId = await ctx.storage.store(frameFile);
      
      // Parse AI results if provided
      let parsedResults = null;
      if (aiResults) {
        try {
          parsedResults = JSON.parse(aiResults);
        } catch (e) {
          console.error("Failed to parse AI results:", e);
        }
      }
      
      // Process AI results and create events
      if (parsedResults && parsedResults.detections) {
        for (const detection of parsedResults.detections) {
          await ctx.runMutation(api.aiEvents.createAiEvent, {
            cameraId: cameraId as any,
            eventType: detection.type,
            confidence: detection.confidence,
            boundingBox: detection.boundingBox,
            metadata: detection.metadata || {},
            frameImageId: storageId,
          });
        }
      }
      
      // Update camera heartbeat
      await ctx.runMutation(api.cameras.updateCameraHeartbeat, {
        cameraId: cameraId as any,
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        storageId,
        eventsCreated: parsedResults?.detections?.length || 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      console.error("Frame upload error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Health Check Endpoint
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({
      status: "healthy",
      timestamp: Date.now(),
      version: "1.0.0"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Camera Status Webhook
http.route({
  path: "/api/camera/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { cameraId, status, metrics } = body;
      
      if (!cameraId || !status) {
        return new Response("Missing required fields", { status: 400 });
      }
      
      // Update camera heartbeat
      await ctx.runMutation(api.cameras.updateCameraHeartbeat, {
        cameraId,
      });
      
      // Store performance metrics if provided
      if (metrics) {
        // You could store these in systemMetrics table
        console.log(`Camera ${cameraId} metrics:`, metrics);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      console.error("Status update error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
