export enum VibeMode {
  Consensus = 'System Consensus',
  NeuralFlow = 'Neural Flow',
  QuantumDebate = 'Quantum Debate',
  LegacySource = 'Legacy Source',
  GeminiEvolution = 'Gemini Evolution',
  Vortex = 'Vortex Singularity',
  Ethereal = 'Ethereal Harmonic'
}

export enum AgentRole {
  Builder = 'BUILDER',
  Disruptor = 'DISRUPTOR',
  Signal = 'SIGNAL',
  Stabilizer = 'STABILIZER'
}

export enum FormationType {
  Classic = 'CLASSIC',
  Tectonic = 'TECTONIC',
  Fluid = 'FLUID',
  Orbital = 'ORBITAL',
  Infinity = 'INFINITY',
  Mohamed = 'MOHAMED',
  Text = 'TEXT',
  Brain = 'BRAIN',
  Face = 'FACE',
  Custom = 'CUSTOM'
}

export enum VisualDimension {
  Core8 = 'CORE_8',
  Sphere = 'SPHERE',
  Torus = 'TORUS',
  DNA = 'DNA',
  Cube = 'CUBE',
  Galaxy = 'GALAXY',
  Pyramid = 'PYRAMID',
  Heart = 'HEART',
  NeuralOrbit = 'NEURAL_ORBIT',
  Wave = 'WAVE',
  Grid = 'GRID',
  Vortex = 'VORTEX'
}

export enum VisualState {
  Idle8 = 'idle8',
  BreakingFrom8 = 'breakingFrom8',
  FormingCommandText = 'formingCommandText',
  ShowingCommandSignature = 'showingCommandSignature',
  ReturningTo8 = 'returningTo8'
}

export enum ParticleShape {
  Circle = 'CIRCLE',
  Square = 'SQUARE',
  Triangle = 'TRIANGLE',
  Diamond = 'DIAMOND',
  Hexagon = 'HEXAGON',
  Ring = 'RING',
  Line = 'LINE',
  MicroLine = 'MICROLINE',
  LensArc = 'LENSARC',
  Glyph = 'GLYPH',
  Orb = 'ORB',
  Shard = 'SHARD'
}

export interface CommandSpec {
  id: string;
  displayName: string;
  buttonLabel: string;
  voicePhrases: string[];
  particleShape: ParticleShape;
  colors: string[];
  formation: FormationType;
  signature?: 'pulse' | 'wave' | 'shock' | 'flow' | 'scan' | 'expand';
  durationMs: number;
}

export enum CommandState {
  Idle = 'IDLE',
  Breakout = 'BREAKOUT',
  FormingText = 'FORMING_TEXT',
  Signature = 'SIGNATURE',
  Returning = 'RETURNING'
}

export interface VibeSettings {
  particleColors: string[];
  glowStrength: number;
  connectionMaxDist: number;
  connectionOpacity: number;
  particleSize: number;
  friction: number;
  ease: number;
  repulsionRadius: number;
  repulsionStrength: number;
  bgAtmosphere: string;
  bloomColor: string;
  leaderProbability: number;
  pulseSpeed: number;
  showGrid: boolean;
  accentColor: string;
  formation: FormationType;
}

export interface Point {
  x: number;
  y: number;
  z?: number;
}
