"""
AI Processing Modules - Face Recognition, License Plate Recognition, Motion Detection
"""

import logging
import time
from typing import List, Dict, Optional, Any
import cv2
import numpy as np

# Face Recognition
try:
    import insightface
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    logging.warning("InsightFace not available - face recognition disabled")

# License Plate Recognition
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logging.warning("EasyOCR not available - plate recognition disabled")

logger = logging.getLogger(__name__)

class FaceProcessor:
    """Face detection and recognition using InsightFace"""
    
    def __init__(self, gpu_enabled: bool = True):
        self.gpu_enabled = gpu_enabled
        self.model = None
        self.face_db = {}  # Simple in-memory face database
        
        if INSIGHTFACE_AVAILABLE:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the face recognition model"""
        try:
            ctx_id = 0 if self.gpu_enabled else -1  # 0 for GPU, -1 for CPU
            self.model = FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
            self.model.prepare(ctx_id=ctx_id, det_size=(640, 640))
            logger.info(f"Face recognition model initialized (GPU: {self.gpu_enabled})")
        except Exception as e:
            logger.error(f"Failed to initialize face recognition model: {str(e)}")
            self.model = None
    
    def process_frame(self, frame: np.ndarray) -> List[Dict]:
        """Process frame for face detection and recognition"""
        if not self.model or not INSIGHTFACE_AVAILABLE:
            return []
        
        try:
            detections = []
            faces = self.model.get(frame)
            
            for face in faces:
                # Extract face information
                bbox = face.bbox.astype(int)
                confidence = float(face.det_score)
                
                # Skip low confidence detections
                if confidence < 0.5:
                    continue
                
                # Get face embedding for recognition
                embedding = face.embedding
                
                # Try to match against known faces
                person_id = self._match_face(embedding)
                
                detection = {
                    "type": "face_recognized" if person_id else "face_detected",
                    "confidence": confidence,
                    "boundingBox": {
                        "x": int(bbox[0]),
                        "y": int(bbox[1]),
                        "width": int(bbox[2] - bbox[0]),
                        "height": int(bbox[3] - bbox[1])
                    },
                    "metadata": {
                        "personId": person_id,
                        "age": int(face.age) if hasattr(face, 'age') else None,
                        "gender": face.sex if hasattr(face, 'sex') else None,
                    }
                }
                
                detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"Error processing frame for faces: {str(e)}")
            return []
    
    def _match_face(self, embedding: np.ndarray, threshold: float = 0.6) -> Optional[str]:
        """Match face embedding against known faces"""
        if not self.face_db:
            return None
        
        try:
            best_match = None
            best_similarity = 0
            
            for person_id, known_embedding in self.face_db.items():
                # Calculate cosine similarity
                similarity = np.dot(embedding, known_embedding) / (
                    np.linalg.norm(embedding) * np.linalg.norm(known_embedding)
                )
                
                if similarity > best_similarity and similarity > threshold:
                    best_similarity = similarity
                    best_match = person_id
            
            return best_match
            
        except Exception as e:
            logger.error(f"Error matching face: {str(e)}")
            return None
    
    def add_known_face(self, person_id: str, embedding: np.ndarray):
        """Add a known face to the database"""
        self.face_db[person_id] = embedding
        logger.info(f"Added known face for person: {person_id}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "available": INSIGHTFACE_AVAILABLE and self.model is not None,
            "gpu_enabled": self.gpu_enabled,
            "known_faces_count": len(self.face_db),
            "model_type": "InsightFace"
        }


class PlateProcessor:
    """License plate detection and recognition using EasyOCR"""
    
    def __init__(self, gpu_enabled: bool = True):
        self.gpu_enabled = gpu_enabled
        self.reader = None
        
        if EASYOCR_AVAILABLE:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the OCR model"""
        try:
            self.reader = easyocr.Reader(['en'], gpu=self.gpu_enabled)
            logger.info(f"License plate OCR model initialized (GPU: {self.gpu_enabled})")
        except Exception as e:
            logger.error(f"Failed to initialize OCR model: {str(e)}")
            self.reader = None
    
    def process_frame(self, frame: np.ndarray) -> List[Dict]:
        """Process frame for license plate detection"""
        if not self.reader or not EASYOCR_AVAILABLE:
            return []
        
        try:
            detections = []
            
            # Use EasyOCR to detect text
            results = self.reader.readtext(frame)
            
            for (bbox, text, confidence) in results:
                # Filter for potential license plates
                if self._is_likely_plate(text, confidence):
                    # Convert bbox to our format
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    
                    x_min, x_max = int(min(x_coords)), int(max(x_coords))
                    y_min, y_max = int(min(y_coords)), int(max(y_coords))
                    
                    detection = {
                        "type": "plate_detected",
                        "confidence": float(confidence),
                        "boundingBox": {
                            "x": x_min,
                            "y": y_min,
                            "width": x_max - x_min,
                            "height": y_max - y_min
                        },
                        "metadata": {
                            "plateNumber": text.upper().replace(" ", ""),
                            "rawText": text,
                        }
                    }
                    
                    detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"Error processing frame for plates: {str(e)}")
            return []
    
    def _is_likely_plate(self, text: str, confidence: float) -> bool:
        """Determine if detected text is likely a license plate"""
        if confidence < 0.7:
            return False
        
        # Clean text
        clean_text = text.upper().replace(" ", "").replace("-", "")
        
        # Basic license plate patterns (adjust for your region)
        if len(clean_text) < 4 or len(clean_text) > 8:
            return False
        
        # Should contain both letters and numbers
        has_letter = any(c.isalpha() for c in clean_text)
        has_number = any(c.isdigit() for c in clean_text)
        
        return has_letter and has_number
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "available": EASYOCR_AVAILABLE and self.reader is not None,
            "gpu_enabled": self.gpu_enabled,
            "model_type": "EasyOCR",
            "languages": ["en"]
        }


class MotionProcessor:
    """Motion detection using OpenCV background subtraction"""
    
    def __init__(self):
        self.background_subtractors = {}  # Per-camera background models
        self.motion_threshold = 1000  # Minimum contour area for motion
        
    def process_frame(self, frame: np.ndarray, camera_id: str = "default") -> List[Dict]:
        """Process frame for motion detection"""
        try:
            detections = []
            
            # Get or create background subtractor for this camera
            if camera_id not in self.background_subtractors:
                self.background_subtractors[camera_id] = cv2.createBackgroundSubtractorMOG2(
                    detectShadows=True
                )
            
            bg_subtractor = self.background_subtractors[camera_id]
            
            # Apply background subtraction
            fg_mask = bg_subtractor.apply(frame)
            
            # Find contours
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                
                if area > self.motion_threshold:
                    # Get bounding box
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    detection = {
                        "type": "motion_detected",
                        "confidence": min(1.0, area / 10000),  # Normalize confidence
                        "boundingBox": {
                            "x": int(x),
                            "y": int(y),
                            "width": int(w),
                            "height": int(h)
                        },
                        "metadata": {
                            "area": int(area),
                            "motion_intensity": "high" if area > 5000 else "medium"
                        }
                    }
                    
                    detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"Error processing frame for motion: {str(e)}")
            return []
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "available": True,
            "model_type": "OpenCV MOG2",
            "active_cameras": len(self.background_subtractors),
            "motion_threshold": self.motion_threshold
        }
