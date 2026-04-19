# AI Surveillance System

A comprehensive AI-powered surveillance system with real-time video analytics, face detection, license plate recognition, and motion detection capabilities.

## Features

- **Multi-language Support**: Full Persian (Farsi) and English support with RTL text direction
- **Real-time AI Processing**: Face detection, license plate recognition, motion detection
- **Multi-camera Management**: Support for multiple RTSP camera streams
- **Live Dashboard**: Real-time monitoring with statistics and alerts
- **Event Management**: Comprehensive logging and analysis of AI-detected events
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

### Frontend (React + Convex)
- **React 18** with TypeScript
- **Convex** for real-time database and backend functions
- **TailwindCSS** for styling with RTL support
- **Multi-language** support with context-based translations

### Backend (Python AI Processing)
- **FastAPI** for HTTP API endpoints
- **OpenCV** for video processing
- **AI Models**: Face detection, license plate recognition, motion detection
- **RTSP Stream Management** for multiple camera feeds

### Database (Convex)
- Real-time synchronized data
- Multi-tenant architecture
- Optimized for time-series data (events, metrics)
- File storage for video frames and recordings

## Quick Start

### 1. Frontend Setup (React + Convex)

```bash
# Install dependencies
npm install

# Deploy Convex backend
npx convex dev

# Start development server
npm run dev
```

The web interface will be available at `http://localhost:5173`

### 2. AI Backend Setup (Python)

```bash
# Navigate to Python backend
cd python-ai-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env file with your Convex deployment URL
# CONVEX_URL=https://your-deployment.convex.cloud

# Start AI backend server
python main.py
```

The AI backend will be available at `http://localhost:8000`

## Usage Instructions

### For System Administrators

1. **Access the System**:
   - Open your web browser
   - Navigate to the deployed frontend URL
   - Sign in with your credentials

2. **Language Selection**:
   - Click the 🌐 language switcher in the top-right corner
   - Choose between English (EN) and Persian (فا)
   - The interface will instantly adapt with RTL support for Persian

3. **Add Cameras**:
   - Go to the "Cameras" tab
   - Click "Add Camera"
   - Fill in camera details:
     - Name: Descriptive name for the camera
     - Location: Physical location description
     - RTSP URL: Camera stream URL (format: `rtsp://username:password@ip:port/stream`)
     - Resolution: Video quality setting
     - FPS: Frames per second

4. **Configure AI Settings**:
   - In the camera list, click "Settings" for each camera
   - Enable/disable AI features:
     - Face Detection
     - License Plate Recognition
     - Motion Detection
     - Recording

5. **Monitor Events**:
   - View real-time events in the "Events" tab
   - Check dashboard statistics in "Overview"
   - Monitor camera status and health

### For End Users (Security Personnel)

1. **Dashboard Overview**:
   - View live camera feeds
   - Monitor recent AI-detected events
   - Check system statistics (active cameras, events today, alerts)

2. **Event Investigation**:
   - Click on events to see details
   - View captured frames from AI detections
   - Filter events by type, camera, or time

3. **Real-time Monitoring**:
   - All data updates automatically (no refresh needed)
   - Receive instant notifications for critical events
   - Monitor camera online/offline status

## API Integration

### Camera Stream Integration

To connect a camera stream to the AI backend:

```bash
# Start camera processing
curl -X POST "http://localhost:8000/cameras/start" \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "cam_001",
    "rtsp_url": "rtsp://admin:password@192.168.1.100:554/stream",
    "name": "Front Entrance",
    "location": "Building A - Main Door",
    "settings": {
      "face_detection": true,
      "plate_recognition": true,
      "motion_detection": true,
      "recording_enabled": true
    }
  }'
```

### Health Check

```bash
# Check system health
curl http://localhost:8000/health
```

## Deployment

### Production Deployment

1. **Frontend Deployment**:
   ```bash
   # Build for production
   npm run build
   
   # Deploy to your hosting service (Vercel, Netlify, etc.)
   # Make sure to set VITE_CONVEX_URL environment variable
   ```

2. **AI Backend Deployment**:
   ```bash
   # Using Docker
   cd python-ai-backend
   docker build -t ai-surveillance .
   docker run -p 8000:8000 ai-surveillance
   
   # Or deploy to cloud service (AWS, GCP, Azure)
   ```

3. **Environment Variables**:
   - `VITE_CONVEX_URL`: Your Convex deployment URL
   - `CONVEX_URL`: Same URL for Python backend
   - `CONVEX_AUTH_TOKEN`: Optional authentication token

## System Requirements

### Minimum Requirements
- **CPU**: 4 cores, 2.5GHz
- **RAM**: 8GB
- **GPU**: Optional (NVIDIA GPU recommended for better AI performance)
- **Storage**: 100GB SSD
- **Network**: 1Gbps for multiple camera streams

### Recommended Requirements
- **CPU**: 8+ cores, 3.0GHz+
- **RAM**: 16GB+
- **GPU**: NVIDIA RTX 3060 or better
- **Storage**: 500GB+ SSD
- **Network**: 10Gbps for high-resolution streams

## Troubleshooting

### Common Issues

1. **Camera Connection Failed**:
   - Verify RTSP URL format
   - Check network connectivity
   - Ensure camera credentials are correct

2. **AI Processing Slow**:
   - Enable GPU acceleration
   - Reduce camera resolution/FPS
   - Increase processing interval

3. **Events Not Appearing**:
   - Check camera settings (AI features enabled)
   - Verify AI backend is running
   - Check network connectivity between services

### Logs and Monitoring

- **Frontend**: Browser developer console
- **AI Backend**: Console output or log files
- **Convex**: Dashboard logs at https://dashboard.convex.dev

## Support

For technical support or questions:
- Check the troubleshooting section
- Review system logs
- Ensure all services are running and connected

## License

This project is proprietary software. All rights reserved.
