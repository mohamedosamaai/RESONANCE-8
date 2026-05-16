import { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export interface FaceData {
  landmarks: { x: number, y: number, z: number }[];
  leftEyeEAR: number;
  rightEyeEAR: number;
  smile: number;
}

export const useFaceTracker = (enabled: boolean, onFaceUpdate: (data: FaceData) => void) => {
  const meshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const callbackRef = useRef(onFaceUpdate);
  const isActiveRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onFaceUpdate;
  }, [onFaceUpdate]);
  
  useEffect(() => {
    if (!enabled) {
      if (isActiveRef.current) {
        console.info("Stopping face tracking systems...");
        isActiveRef.current = false;
        
        if (cameraRef.current) {
          cameraRef.current.stop();
          cameraRef.current = null;
        }

        if (meshRef.current) {
          meshRef.current.close();
          meshRef.current = null;
        }

        if (videoRef.current) {
          const stream = videoRef.current.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          videoRef.current.srcObject = null;
          if (document.body.contains(videoRef.current)) {
            document.body.removeChild(videoRef.current);
          }
          videoRef.current = null;
        }
      }
      return;
    }

    if (isActiveRef.current || meshRef.current) return; // Prevent double init

    const video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.style.display = 'none';
    document.body.appendChild(video);
    videoRef.current = video;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults((results) => {
      if (!isActiveRef.current || !meshRef.current) return;
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Calculate EAR (Eye Aspect Ratio) for Left & Right
        // Left Eye: 159, 145 (Vertical) / 33, 133 (Horizontal)
        const lTop = landmarks[159], lBot = landmarks[145], lLeft = landmarks[33], lRight = landmarks[133];
        let leftEAR = 0.25;
        if (lTop && lBot && lLeft && lRight) {
            leftEAR = Math.sqrt(Math.pow((lTop?.x ?? 0) - (lBot?.x ?? 0), 2) + Math.pow((lTop?.y ?? 0) - (lBot?.y ?? 0), 2)) / 
                      Math.sqrt(Math.pow((lLeft?.x ?? 0) - (lRight?.x ?? 0), 2) + Math.pow((lLeft?.y ?? 0) - (lRight?.y ?? 0), 2));
        }

        // Right Eye: 386, 374 (Vertical) / 362, 263 (Horizontal)
        const rTop = landmarks[386], rBot = landmarks[374], rLeft = landmarks[362], rRight = landmarks[263];
        let rightEAR = 0.25;
        if (rTop && rBot && rLeft && rRight) {
            rightEAR = Math.sqrt(Math.pow((rTop?.x ?? 0) - (rBot?.x ?? 0), 2) + Math.pow((rTop?.y ?? 0) - (rBot?.y ?? 0), 2)) / 
                       Math.sqrt(Math.pow((rLeft?.x ?? 0) - (rRight?.x ?? 0), 2) + Math.pow((rLeft?.y ?? 0) - (rRight?.y ?? 0), 2));
        }

        const leftMouth = landmarks[61];
        const rightMouth = landmarks[291];
        let smile = 0;
        if (leftMouth && rightMouth) {
            const mouthDist = Math.sqrt(Math.pow((rightMouth?.x ?? 0) - (leftMouth?.x ?? 0), 2) + Math.pow((rightMouth?.y ?? 0) - (leftMouth?.y ?? 0), 2));
            smile = Math.max(0, (mouthDist - 0.13) * 10);
        }

        callbackRef.current({ landmarks, leftEyeEAR: leftEAR, rightEyeEAR: rightEAR, smile });
      } else {
        callbackRef.current(null as any);
      }
    });

    meshRef.current = faceMesh;
    isActiveRef.current = true;

    const camera = new Camera(video, {
      onFrame: async () => {
        if (isActiveRef.current && meshRef.current) {
          try {
            await meshRef.current.send({ image: video });
          } catch (e) {
            // Frame dropped or mesh closed
          }
        }
      },
      width: 640,
      height: 480,
    });
    
    cameraRef.current = camera;
    camera.start().then(() => {
      console.info("Face tracking system active.");
    }).catch(e => {
      console.warn("Camera access inhibited:", e.message);
      isActiveRef.current = false;
    });

    return () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        cameraRef.current?.stop();
        meshRef.current?.close();
        if (videoRef.current) {
          const stream = videoRef.current.srcObject as MediaStream;
          if (stream) stream.getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = null;
          if (document.body.contains(videoRef.current)) {
            document.body.removeChild(videoRef.current);
          }
        }
        meshRef.current = null;
        cameraRef.current = null;
        videoRef.current = null;
      }
    };
  }, [enabled]);
};
