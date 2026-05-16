# Mohamed Resonance

A cinematic, interactive 3D visualizer blending generative AI, real-time audio reactivity, and face tracking. The experience revolves around a dynamic "Hero Number 8" composed of thousands of particles that respond organically to voice input, environmental sounds, and user interactions.

## Live Concept
This project showcases a "resonance" particle engine built using React Three Fiber and custom WebGL shaders. The application listens and reacts to voice, audio, and visual cues—morphing into various shapes and formations while keeping the iconic "8" visible. An integrated AI assistant uses real-time local knowledge and Text-To-Speech to guide the user, shaping the environment organically.

## Key Features
- **3D Particle Formations:** Custom WebGL GPGPU physics engine simulating thousands of magnetic particles.
- **Shape Switching:** Interactive morphing between complex geometries (Core 8, Sphere, Torus, DNA, Vortex, Grid, etc.).
- **Hero Number 8:** A persistent, cinematic focal point embedded within particle shapes.
- **Audio Reaction:** Real-time audio analysis making particles pulse, glow, and scatter based on sound frequency and voice amplitude.
- **Microphone & Voice Input:** Voice commands interpreted directly by the built-in AI assistant.
- **Local Knowledge Base:** Connects user prompts to a rich localized knowledge dictionary context.
- **Camera & Face Tracking:** Integration with MediaPipe for head-tracking interactions and blink detection.
- **Interactive Controls:** Fluid mouse dragging, scroll zooming, right-click scatter effects, and live setting sliders.

## Tech Stack
- React
- TypeScript
- Vite
- Three.js & React Three Fiber (Web3D)
- Motion (UI animations)
- @google/genai (Gemini SDK)
- MediaPipe (Face Mesh and Vision tasks)
- Express (Backend for serving app and API)
- Tailwind CSS

## Project Structure
- `src/App.tsx`: Main UI overlay, state management, and interaction handling.
- `src/Resonance3D.tsx`: Core React Three Fiber setup and WebGL shader logic for particles.
- `src/AudioEngine.ts`: Audio decoding, real-time analyzer, TTS playing, and microphone integration.
- `src/useFaceTracker.ts`: MediaPipe Face Mesh integration logic.
- `src/knowledge/`: Contains local AI contextual knowledge modules.
- `server.ts`: Express backend serving the UI and handling fallback endpoints.
- `vite.config.ts`: Vite bundling and Tailwind plugins configuration.
- `package.json`: Project dependencies and running scripts.

## Getting Started
Ensure you have Node.js installed.

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

4. **Preview Production Build:**
   ```bash
   npm run preview
   ```

## Environment Variables
Create a `.env` file in the root using the `.env.example` file:
- `GEMINI_API_KEY`: API key for generative text interactions.
- `VITE_GOOGLE_CLOUD_API_KEY`: Needed for Text-to-Speech functionalities.

## Build and Deployment
The project is bundled via Vite into a `dist` directory. The production setup utilizes an Express server (`server.ts`) that serves the `dist` folder payload and handles frontend routes dynamically.

## Controls
- **Mouse Drag:** Orbits the 3D visual.
- **Mouse Wheel / Trackpad Scroll:** Zooms in and out of the particle field.
- **Right Click:** Visual/system scatter and reload state.
- **Microphone Icon:** Toggles active voice input/listening.
- **Camera Icon:** Toggles MediaPipe face tracking.
- **Speaker Icon:** Toggles the integrated audio engine and Voice TTS.
- **Shape Button / Configuration:** Access different multidimensional particle shapes via the settings HUD.

## Known Limitations
- Browser permissions for Camera and Microphone must be explicitly granted; denying them will disable tracking and voice chat respectively.
- Relies heavily on WebGL and GPGPU shaders, which may be performance-intensive on older mobile devices or low-end GPUs.
- Voice speech recognition depends on standard browser Web Speech API availability.

## License

Proprietary — All Rights Reserved.

Copyright © 2026 Mohamed Osama.

This project is shared for demonstration, evaluation, and conference submission purposes only. No permission is granted to copy, modify, redistribute, sublicense, sell, or use the source code, visual system, assets, or interaction design commercially without explicit written permission from the author.
