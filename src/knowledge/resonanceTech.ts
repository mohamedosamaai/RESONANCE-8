export const resonanceTech = `
RESONANCE 8 — TECHNICAL ARCHITECTURE:

THE VISUAL ENGINE:
The number 8 you see is not a solid shape. It is a constellation of 2000+ individual particles (points) rendered using WebGL through Three.js.
Each particle is a tiny glowing dot positioned along a mathematical curve called a "lemniscate of Bernoulli" — the figure-8/infinity curve.
The particles are colored in Google's brand colors: Blue (#4285F4), Red (#EA4335), Yellow (#FBBC04), Green (#34A853), creating four distinct sections that blend smoothly.

NEURAL CONNECTIONS:
Thin semi-transparent lines connect nearby particles, creating the appearance of a neural network or brain synapses firing.
These connections are dynamic — they pulse and brighten when the AI is processing or speaking.
The visual metaphor: each particle is a thought, each connection is a synapse, and the number 8 is the mind of RESONANCE.

PARTICLE BEHAVIOR:
Particles are never static. They float with gentle oscillation, creating an organic, living feel.
When the AI receives a question: particles contract inward (the system is "thinking").
When the AI speaks: particles flow along the 8-curve like energy through a circuit.
When audio volume spikes: particles scatter briefly then reform.
Particles ALWAYS return to the number 8 formation — this represents the stability of the system.

AUDIO ENGINE:
The ambient music is procedurally generated using the Web Audio API — no pre-recorded audio files.
The music uses a Lydian scale (warm, optimistic) and responds in real-time to AI state changes.
When the AI speaks, the music adapts its intensity.
Voice responses use Google Cloud TTS API for high-quality speech, with browser speechSynthesis as a fallback.

FACE TRACKING:
The camera can track the user face using MediaPipe Face Mesh.
Head position and facial expressions subtly influence the particle system — lean left and the particles shift, smile and they brighten.
This creates a sense of connection between the user and the AI presence.

KNOWLEDGE SYSTEM:
The AI does not receive all knowledge with every question. A routing system analyzes the user question and injects only the relevant knowledge context.
This makes responses faster, more focused, and more cost-efficient.
The knowledge is structured as separate modules: identity, project info, history, future, and safety protocols.
`;
