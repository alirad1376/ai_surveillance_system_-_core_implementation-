#!/usr/bin/env python3
"""
AI Surveillance Backend - RTSP Processing & AI Analysis
Handles video stream ingestion, AI processing, and Convex integration
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import cv2
import httpx
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from ai_processors import FaceProcessor, PlateProcessor, MotionProcessor
from rtsp_manager import RTSPManager
from convex_client import ConvexClient

# Configuration
class Settings(BaseSettings):
    convex_url: str = "https://your-deployment.convex.cloud"
    convex_auth_token: str = ""
    redis_url: str = "redis://localhost:6379"
    gpu_enabled: bool = True
    log_level: str = "INFO"
    max_cameras: int = 10
    frame_processing_interval: float = 0.5  # Process every 0.5 seconds
    
    class Config:
        env_file = ".env"

settings = Settings()

# Logging setup
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global managers
rtsp_manager: Optional[RTSPManager] = None
convex_client: Optional[ConvexClient] = None
ai_processors: Dict[str, any] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global rtsp_manager, convex_client, ai_processors
    
    logger.info("Starting AI Surveillance Backend...")
    
    # Initialize Convex client
    convex_client = ConvexClient(settings.convex_url, settings.convex_auth_token)
    
    # Initialize AI processors
    logger.info("Loading AI models...")
    ai_processors = {
        'face': FaceProcessor(gpu_enabled=settings.gpu_enabled),
        'plate': PlateProcessor(gpu_enabled=settings.gpu_enabled),
        'motion': MotionProcessor(),
    }
    
    # Initialize RTSP manager
    rtsp_manager = RTSPManager(
        convex_client=convex_client,
        ai_processors=ai_processors,
        max_cameras=settings.max_cameras,
        processing_interval=settings.frame_processing_interval
    )
    
    logger.info("AI Surveillance Backend started successfully")
    yield
    
    # Cleanup
    logger.info("Shutting down AI Surveillance Backend...")
    if rtsp_manager:
        await rtsp_manager.stop_all_streams()
    logger.info("Shutdown complete")

# FastAPI app
app = FastAPI(
    title="AI Surveillance Backend",
    description="RTSP video processing with AI analysis",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CameraConfig(BaseModel):
    camera_id: str
    rtsp_url: str
    name: str
    location: str
    settings: Dict[str, bool] = Field(default_factory=lambda: {
        'face_detection': True,
        'plate_recognition': True,
        'motion_detection': True,
        'recording_enabled': True,
    })

class ProcessingStats(BaseModel):
    camera_id: str
    fps: float
    processing_time_ms: float
    detections_count: int
    last_processed: float

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0",
        "gpu_available": settings.gpu_enabled,
        "active_cameras": len(rtsp_manager.active_streams) if rtsp_manager else 0
    }

@app.post("/cameras/start")
async def start_camera_stream(config: CameraConfig, background_tasks: BackgroundTasks):
    """Start processing an RTSP camera stream"""
    if not rtsp_manager:
        raise HTTPException(status_code=500, detail="RTSP manager not initialized")
    
    try:
        success = await rtsp_manager.start_stream(
            camera_id=config.camera_id,
            rtsp_url=config.rtsp_url,
            camera_name=config.name,
            location=config.location,
            settings=config.settings
        )
        
        if success:
            logger.info(f"Started camera stream: {config.name} ({config.camera_id})")
            return {"status": "success", "message": f"Camera {config.name} started"}
        else:
            raise HTTPException(status_code=400, detail="Failed to start camera stream")
            
    except Exception as e:
        logger.error(f"Error starting camera {config.camera_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cameras/{camera_id}/stop")
async def stop_camera_stream(camera_id: str):
    """Stop processing a camera stream"""
    if not rtsp_manager:
        raise HTTPException(status_code=500, detail="RTSP manager not initialized")
    
    try:
        success = await rtsp_manager.stop_stream(camera_id)
        if success:
            return {"status": "success", "message": f"Camera {camera_id} stopped"}
        else:
            raise HTTPException(status_code=404, detail="Camera not found")
    except Exception as e:
        logger.error(f"Error stopping camera {camera_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cameras/status")
async def get_cameras_status():
    """Get status of all active camera streams"""
    if not rtsp_manager:
        return {"active_cameras": []}
    
    return {
        "active_cameras": list(rtsp_manager.active_streams.keys()),
        "total_count": len(rtsp_manager.active_streams),
        "processing_stats": rtsp_manager.get_processing_stats()
    }

@app.get("/cameras/{camera_id}/stats")
async def get_camera_stats(camera_id: str):
    """Get detailed stats for a specific camera"""
    if not rtsp_manager or camera_id not in rtsp_manager.active_streams:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    stats = rtsp_manager.get_camera_stats(camera_id)
    return stats

@app.post("/cameras/{camera_id}/settings")
async def update_camera_settings(camera_id: str, settings: Dict[str, bool]):
    """Update AI processing settings for a camera"""
    if not rtsp_manager or camera_id not in rtsp_manager.active_streams:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    try:
        success = await rtsp_manager.update_camera_settings(camera_id, settings)
        if success:
            return {"status": "success", "message": "Settings updated"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update settings")
    except Exception as e:
        logger.error(f"Error updating camera settings {camera_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/models/status")
async def get_ai_models_status():
    """Get status of AI processing models"""
    return {
        "face_processor": {
            "loaded": ai_processors.get('face') is not None,
            "gpu_enabled": settings.gpu_enabled,
            "model_info": ai_processors['face'].get_model_info() if ai_processors.get('face') else None
        },
        "plate_processor": {
            "loaded": ai_processors.get('plate') is not None,
            "gpu_enabled": settings.gpu_enabled,
            "model_info": ai_processors['plate'].get_model_info() if ai_processors.get('plate') else None
        },
        "motion_processor": {
            "loaded": ai_processors.get('motion') is not None,
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower()
    )
