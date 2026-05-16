import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress specific TensorFlow Lite and MediaPipe logs
const originalInfo = console.info;
console.info = function (...args) {
  if (typeof args[0] === 'string' && (
      args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
      args[0].includes('GL version:') ||
      args[0].includes('Graph successfully started running.')
  )) {
    return;
  }
  originalInfo.apply(console, args);
};

const originalLog = console.log;
console.log = function (...args) {
  if (typeof args[0] === 'string' && (
      args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
      args[0].includes('GL version:') ||
      args[0].includes('Graph successfully started running.')
  )) {
    return;
  }
  originalLog.apply(console, args);
};

const originalWarn = console.warn;
console.warn = function (...args) {
  if (typeof args[0] === 'string' && (
      args[0].includes('Sets FaceBlendshapesGraph acceleration to xnnpack by default') ||
      args[0].includes('OpenGL error checking is disabled') ||
      args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
      args[0].includes('THREE.Clock') ||
      args[0].includes('INFO:') ||
      args[0].includes('W0501')
  )) {
    return;
  }
  originalWarn.apply(console, args);
};

const originalError = console.error;
console.error = function (...args) {
  if (typeof args[0] === 'string' && (
      args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU')
  )) {
    return;
  }
  originalError.apply(console, args);
};

const originalDebug = console.debug;
console.debug = function (...args) {
  if (typeof args[0] === 'string' && (
      args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU')
  )) {
    return;
  }
  originalDebug.apply(console, args);
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
