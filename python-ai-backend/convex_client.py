"""
Convex Client - Handles communication with Convex backend
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

class ConvexClient:
    """Client for communicating with Convex backend"""
    
    def __init__(self, convex_url: str, auth_token: str = ""):
        self.convex_url = convex_url.rstrip('/')
        self.auth_token = auth_token
        self.client = httpx.AsyncClient(timeout=30.0)
        
        # Add auth header if token provided
        if auth_token:
            self.client.headers.update({"Authorization": f"Bearer {auth_token}"})
    
    async def upload_frame(self, camera_id: str, frame_data: bytes, ai_results: Dict[str, Any]) -> bool:
        """Upload frame and AI results to Convex"""
        try:
            # Prepare multipart form data
            files = {
                "frame": ("frame.jpg", frame_data, "image/jpeg")
            }
            
            data = {
                "cameraId": camera_id,
                "timestamp": str(ai_results.get("timestamp", 0)),
                "aiResults": json.dumps(ai_results)
            }
            
            # Send to Convex HTTP endpoint
            response = await self.client.post(
                f"{self.convex_url}/api/camera/frame",
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.debug(f"Frame uploaded successfully for camera {camera_id}: {result}")
                return True
            else:
                logger.error(f"Failed to upload frame for camera {camera_id}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error uploading frame for camera {camera_id}: {str(e)}")
            return False
    
    async def update_camera_status(self, camera_id: str, status: str, metrics: Optional[Dict[str, Any]] = None) -> bool:
        """Update camera status in Convex"""
        try:
            payload = {
                "cameraId": camera_id,
                "status": status,
                "metrics": metrics or {}
            }
            
            response = await self.client.post(
                f"{self.convex_url}/api/camera/status",
                json=payload
            )
            
            if response.status_code == 200:
                return True
            else:
                logger.error(f"Failed to update camera status: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating camera status: {str(e)}")
            return False
    
    async def health_check(self) -> bool:
        """Check if Convex backend is healthy"""
        try:
            response = await self.client.get(f"{self.convex_url}/api/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
