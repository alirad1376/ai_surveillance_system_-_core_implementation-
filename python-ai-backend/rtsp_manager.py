"""
RTSP Stream Manager - Handles multiple camera streams and AI processing
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import threading

logger = logging.getLogger(__name__)

class CameraStream:
    """Individual camera stream handler"""
    
    def __init__(self, camera_id: str, rtsp_url: str, name: str, location: str, settings: Dict[str, bool]):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.name = name
        self.location = location
        self.settings = settings
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.last_frame: Optional[np.ndarray] = None
        self.last_processed_time = 0
        self.fps_counter = 0
        self.fps_start_time = time.time()
        self.current_fps = 0
        
        # Processing stats
        self.total_frames = 0
        self.processed_frames = 0
        self.detection_count = 0
        self.avg_processing_time = 0
        
    async def start(self) -> bool:
        """Start the camera stream"""
        try:
            # Use threading for OpenCV operations
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                success = await loop.run_in_executor(executor, self._init_capture)
            
            if success:
                self.is_running = True
                logger.info(f"Camera {self.name} ({self.camera_id}) started successfully")
                return True
            else:
                logger.error(f"Failed to initialize camera {self.name} ({self.camera_id})")
                return False
                
        except Exception as e:
            logger.error(f"Error starting camera {self.camera_id}: {str(e)}")
            return False
    
    def _init_capture(self) -> bool:
        """Initialize OpenCV VideoCapture (runs in thread)"""
        try:
            self.cap = cv2.VideoCapture(self.rtsp_url)
            
            # Set buffer size to reduce latency
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Test if we can read a frame
            ret, frame = self.cap.read()
            if ret and frame is not None:
                self.last_frame = frame
                return True
            else:
                if self.cap:
                    self.cap.release()
                return False
                
        except Exception as e:
            logger.error(f"Error initializing capture for {self.camera_id}: {str(e)}")
            return False
    
    async def get_frame(self) -> Optional[np.ndarray]:
        """Get the latest frame from the camera"""
        if not self.is_running or not self.cap:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                frame = await loop.run_in_executor(executor, self._read_frame)
            
            if frame is not None:
                self.last_frame = frame
                self.total_frames += 1
                self._update_fps()
                
            return frame
            
        except Exception as e:
            logger.error(f"Error reading frame from {self.camera_id}: {str(e)}")
            return None
    
    def _read_frame(self) -> Optional[np.ndarray]:
        """Read frame from OpenCV capture (runs in thread)"""
        try:
            ret, frame = self.cap.read()
            return frame if ret else None
        except Exception:
            return None
    
    def _update_fps(self):
        """Update FPS calculation"""
        self.fps_counter += 1
        current_time = time.time()
        
        if current_time - self.fps_start_time >= 1.0:  # Update every second
            self.current_fps = self.fps_counter / (current_time - self.fps_start_time)
            self.fps_counter = 0
            self.fps_start_time = current_time
    
    def update_settings(self, settings: Dict[str, bool]):
        """Update camera processing settings"""
        self.settings.update(settings)
        logger.info(f"Updated settings for camera {self.camera_id}: {settings}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get camera processing statistics"""
        return {
            "camera_id": self.camera_id,
            "name": self.name,
            "location": self.location,
            "is_running": self.is_running,
            "current_fps": round(self.current_fps, 2),
            "total_frames": self.total_frames,
            "processed_frames": self.processed_frames,
            "detection_count": self.detection_count,
            "avg_processing_time_ms": round(self.avg_processing_time * 1000, 2),
            "settings": self.settings,
        }
    
    async def stop(self):
        """Stop the camera stream"""
        self.is_running = False
        
        if self.cap:
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                await loop.run_in_executor(executor, self._release_capture)
        
        logger.info(f"Camera {self.name} ({self.camera_id}) stopped")
    
    def _release_capture(self):
        """Release OpenCV capture (runs in thread)"""
        try:
            if self.cap:
                self.cap.release()
                self.cap = None
        except Exception as e:
            logger.error(f"Error releasing capture for {self.camera_id}: {str(e)}")


class RTSPManager:
    """Manages multiple RTSP camera streams and AI processing"""
    
    def __init__(self, convex_client, ai_processors: Dict[str, Any], max_cameras: int = 10, processing_interval: float = 0.5):
        self.convex_client = convex_client
        self.ai_processors = ai_processors
        self.max_cameras = max_cameras
        self.processing_interval = processing_interval
        
        self.active_streams: Dict[str, CameraStream] = {}
        self.processing_tasks: Dict[str, asyncio.Task] = {}
        self.is_running = True
        
        logger.info(f"RTSPManager initialized - Max cameras: {max_cameras}")
    
    async def start_stream(self, camera_id: str, rtsp_url: str, camera_name: str, location: str, settings: Dict[str, bool]) -> bool:
        """Start processing a new camera stream"""
        if len(self.active_streams) >= self.max_cameras:
            logger.warning(f"Maximum camera limit reached ({self.max_cameras})")
            return False
        
        if camera_id in self.active_streams:
            logger.warning(f"Camera {camera_id} is already active")
            return False
        
        try:
            # Create camera stream
            stream = CameraStream(camera_id, rtsp_url, camera_name, location, settings)
            
            # Start the stream
            success = await stream.start()
            if not success:
                return False
            
            # Add to active streams
            self.active_streams[camera_id] = stream
            
            # Start processing task
            task = asyncio.create_task(self._process_camera_stream(camera_id))
            self.processing_tasks[camera_id] = task
            
            logger.info(f"Started processing for camera {camera_name} ({camera_id})")
            return True
            
        except Exception as e:
            logger.error(f"Error starting stream for {camera_id}: {str(e)}")
            return False
    
    async def stop_stream(self, camera_id: str) -> bool:
        """Stop processing a camera stream"""
        if camera_id not in self.active_streams:
            return False
        
        try:
            # Cancel processing task
            if camera_id in self.processing_tasks:
                self.processing_tasks[camera_id].cancel()
                try:
                    await self.processing_tasks[camera_id]
                except asyncio.CancelledError:
                    pass
                del self.processing_tasks[camera_id]
            
            # Stop camera stream
            await self.active_streams[camera_id].stop()
            del self.active_streams[camera_id]
            
            logger.info(f"Stopped processing for camera {camera_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping stream for {camera_id}: {str(e)}")
            return False
    
    async def stop_all_streams(self):
        """Stop all active camera streams"""
        camera_ids = list(self.active_streams.keys())
        for camera_id in camera_ids:
            await self.stop_stream(camera_id)
        
        self.is_running = False
        logger.info("All camera streams stopped")
    
    async def update_camera_settings(self, camera_id: str, settings: Dict[str, bool]) -> bool:
        """Update settings for a specific camera"""
        if camera_id not in self.active_streams:
            return False
        
        self.active_streams[camera_id].update_settings(settings)
        return True
    
    def get_processing_stats(self) -> List[Dict[str, Any]]:
        """Get processing statistics for all cameras"""
        return [stream.get_stats() for stream in self.active_streams.values()]
    
    def get_camera_stats(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Get statistics for a specific camera"""
        if camera_id not in self.active_streams:
            return None
        return self.active_streams[camera_id].get_stats()
    
    async def _process_camera_stream(self, camera_id: str):
        """Main processing loop for a camera stream"""
        stream = self.active_streams[camera_id]
        logger.info(f"Started processing loop for camera {camera_id}")
        
        try:
            while self.is_running and stream.is_running:
                start_time = time.time()
                
                # Get latest frame
                frame = await stream.get_frame()
                if frame is None:
                    await asyncio.sleep(0.1)  # Brief pause if no frame
                    continue
                
                # Process frame with AI if enabled
                detections = []
                
                if stream.settings.get('face_detection', False) and 'face' in self.ai_processors:
                    face_detections = await self._process_with_ai('face', frame, camera_id)
                    detections.extend(face_detections)
                
                if stream.settings.get('plate_recognition', False) and 'plate' in self.ai_processors:
                    plate_detections = await self._process_with_ai('plate', frame, camera_id)
                    detections.extend(plate_detections)
                
                if stream.settings.get('motion_detection', False) and 'motion' in self.ai_processors:
                    motion_detections = await self._process_with_ai('motion', frame, camera_id)
                    detections.extend(motion_detections)
                
                # Send results to Convex if we have detections
                if detections:
                    await self._send_detections_to_convex(camera_id, frame, detections)
                    stream.detection_count += len(detections)
                
                # Update processing stats
                processing_time = time.time() - start_time
                stream.avg_processing_time = (stream.avg_processing_time + processing_time) / 2
                stream.processed_frames += 1
                
                # Wait for next processing interval
                sleep_time = max(0, self.processing_interval - processing_time)
                await asyncio.sleep(sleep_time)
                
        except asyncio.CancelledError:
            logger.info(f"Processing cancelled for camera {camera_id}")
        except Exception as e:
            logger.error(f"Error in processing loop for camera {camera_id}: {str(e)}")
        finally:
            logger.info(f"Processing loop ended for camera {camera_id}")
    
    async def _process_with_ai(self, processor_type: str, frame: np.ndarray, camera_id: str) -> List[Dict]:
        """Process frame with specific AI processor"""
        try:
            processor = self.ai_processors[processor_type]
            
            # Run AI processing in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                detections = await loop.run_in_executor(executor, processor.process_frame, frame)
            
            return detections or []
            
        except Exception as e:
            logger.error(f"Error processing frame with {processor_type} for camera {camera_id}: {str(e)}")
            return []
    
    async def _send_detections_to_convex(self, camera_id: str, frame: np.ndarray, detections: List[Dict]):
        """Send AI detections to Convex backend"""
        try:
            # Convert frame to JPEG for upload
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frame_bytes = buffer.tobytes()
            
            # Prepare AI results
            ai_results = {
                "detections": detections,
                "timestamp": time.time(),
                "camera_id": camera_id
            }
            
            # Send to Convex via HTTP endpoint
            await self.convex_client.upload_frame(
                camera_id=camera_id,
                frame_data=frame_bytes,
                ai_results=ai_results
            )
            
        except Exception as e:
            logger.error(f"Error sending detections to Convex for camera {camera_id}: {str(e)}")
