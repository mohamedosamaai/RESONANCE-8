import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { VisualState, VisualDimension, CommandSpec, Point } from './types';

const simVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const simFragmentShader = `
  uniform sampler2D uPositions;
  uniform float uTime;
  uniform float uAudio;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uShockwave;
  uniform vec2 uMouse;
  uniform float uMorphProgress;
  uniform float uSeed1;
  uniform float uSeed2;
  uniform float uSeed3;
  uniform float uSeed4;
  uniform float uTargetShapeIndex;
  uniform float uTextureSize;
  varying vec2 vUv;

  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  // Simplex Noise 3D
  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  vec3 snoiseVec3(vec3 x) {
    float s  = snoise(x);
    float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
    float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
    return vec3(s, s1, s2);
  }

  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_x0 = snoiseVec3(p - dx);
    vec3 p_x1 = snoiseVec3(p + dx);
    vec3 p_y0 = snoiseVec3(p - dy);
    vec3 p_y1 = snoiseVec3(p + dy);
    vec3 p_z0 = snoiseVec3(p - dz);
    vec3 p_z1 = snoiseVec3(p + dz);

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / (2.0 * e);
    return normalize(vec3(x, y, z) * divisor);
  }

  void main() {
    vec4 data = texture2D(uPositions, vUv);
    vec3 pos = data.xyz;
    float clusterId = data.w; // 0: Blue, 1: Red, 2: Yellow, 3: Green

    float uSizeParam = vUv.x;
    float vSizeParam = vUv.y;

    float randomSeed = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);

    // 1. Figure 8 (Lemniscate)
    // Make the hero EIGHT slightly smaller and cleaner.
    float t0 = randomSeed * 6.28318 + uTime * 0.2;
    float scale = 8.0; 
    vec3 shape0;
    shape0.x = scale * cos(t0) * sin(t0) / (1.0 + sin(t0)*sin(t0));
    shape0.y = scale * cos(t0) / (1.0 + sin(t0)*sin(t0));
    shape0.z = sin(t0 * 2.0) * 4.0;

    // 2. Sphere - wireframe/particle shell
    float rings = 16.0;
    float segments = 32.0;
    float isLatLine = step(0.5, fract(randomSeed * 13.0));
    float finalThetaSph = isLatLine > 0.5 ? (floor(vSizeParam * rings) / rings * 3.14159) : acos(2.0 * vSizeParam - 1.0);
    float finalPhiSph = isLatLine < 0.5 ? (floor(uSizeParam * segments) / segments * 6.28318) : (randomSeed * 6.28318 + uTime * 0.1);
    float rSph = 11.0;
    vec3 shape1 = vec3(rSph * sin(finalThetaSph) * cos(finalPhiSph), rSph * cos(finalThetaSph), rSph * sin(finalThetaSph) * sin(finalPhiSph));

    // 3. Torus - professional donut ring with curve trails
    float TRings = 12.0;
    float TSegs = 36.0;
    float isTRing = step(0.5, fract(randomSeed * 17.0));
    float Tphi = isTRing > 0.5 ? (floor(uSizeParam * TSegs) / TSegs * 6.28318) : (randomSeed * 6.28318 + uTime * 0.2);
    float Ttheta = isTRing < 0.5 ? (floor(vSizeParam * TRings) / TRings * 6.28318) : (vSizeParam * 6.28318 + uTime * 0.1);
    float R = 9.0;
    float minorR = 3.5;
    vec3 shape2 = vec3(
        (R + minorR * cos(Ttheta)) * cos(Tphi),
        (R + minorR * cos(Ttheta)) * sin(Tphi),
        minorR * sin(Ttheta)
    );

    // 4. DNA Helix - true double helix structure
    float Ht = (uSizeParam * 6.28318 * 6.0) - uTime * 0.5; 
    float Hr = 5.0;
    float Hz = (uSizeParam - 0.5) * 30.0;
    float f13 = fract(randomSeed * 13.0);
    vec3 shape3;
    if (f13 < 0.4) {
        shape3 = vec3(Hr * cos(Ht), Hr * sin(Ht), Hz);
    } else if (f13 < 0.8) {
        shape3 = vec3(Hr * cos(Ht + 3.14159), Hr * sin(Ht + 3.14159), Hz);
    } else {
        float rungStep = floor((uSizeParam - 0.5) * 30.0 / 2.0) * 2.0; 
        float HtStep = (rungStep / 30.0 + 0.5) * 6.28318 * 6.0 - uTime * 0.5;
        vec3 p1 = vec3(Hr * cos(HtStep), Hr * sin(HtStep), rungStep);
        vec3 p2 = vec3(Hr * cos(HtStep + 3.14159), Hr * sin(HtStep + 3.14159), rungStep);
        shape3 = mix(p1, p2, fract(randomSeed * 37.0));
    }

    // 5. Cube - solid transparent 3D edges/faces
    float edgeRand = fract(randomSeed * 71.0);
    float edgeType = floor(fract(randomSeed * 13.7) * 3.0);
    float faceId = floor(randomSeed * 6.0);
    float cubeSize = 8.0;
    vec3 shape4;
    if (edgeRand < 0.75) {
        float edgeT = (fract(uSizeParam * 11.0) * 2.0 - 1.0) * cubeSize;
        float axA = cubeSize * sign(fract(randomSeed * 43.0) - 0.5);
        float axB = cubeSize * sign(fract(randomSeed * 53.0) - 0.5);
        if (edgeType == 0.0) shape4 = vec3(edgeT, axA, axB);
        else if (edgeType == 1.0) shape4 = vec3(axA, edgeT, axB);
        else shape4 = vec3(axA, axB, edgeT);
    } else {
        vec2 cuv = vec2(fract(randomSeed * 13.7), fract(vSizeParam * 21.3)) * 2.0 - 1.0;
        if (faceId == 0.0) shape4 = vec3(cubeSize, cuv.x * cubeSize, cuv.y * cubeSize);
        else if (faceId == 1.0) shape4 = vec3(-cubeSize, cuv.x * cubeSize, cuv.y * cubeSize);
        else if (faceId == 2.0) shape4 = vec3(cuv.x * cubeSize, cubeSize, cuv.y * cubeSize);
        else if (faceId == 3.0) shape4 = vec3(cuv.x * cubeSize, -cubeSize, cuv.y * cubeSize);
        else if (faceId == 4.0) shape4 = vec3(cuv.x * cubeSize, cuv.y * cubeSize, cubeSize);
        else shape4 = vec3(cuv.x * cubeSize, cuv.y * cubeSize, -cubeSize);
    }

    // 6. Galaxy - defined spiral lines
    float arms = 4.0;
    float spirRadius = uSizeParam * 25.0;
    float armId = floor(fract(vSizeParam * 11.0) * arms);
    float finalAngle = spirRadius * 0.8 - uTime * 0.2 + armId * (6.28318 / arms);
    float depthGalaxy = sin(spirRadius * 2.0 + armId) * 1.5 * exp(-spirRadius * 0.1);
    float trail = (fract(randomSeed * 19.3) - 0.5) * 2.0;
    vec3 shape5 = vec3(
        (spirRadius + trail) * cos(finalAngle + trail*0.1), 
        depthGalaxy + trail, 
        (spirRadius + trail) * sin(finalAngle + trail*0.1)
    );

    // 7. Pyramid - defined wireframe and faces
    vec3 shape6;
    float pyrFace = floor(randomSeed * 5.0);
    float baseSize = 10.0;
    float heightPyr = 12.0;
    float isPyrEdge = step(0.6, fract(randomSeed * 89.0));
    float eT = fract(uSizeParam * 27.0);
    vec3 apex = vec3(0.0, heightPyr * 0.5, 0.0);
    vec3 cp0 = vec3(-baseSize, -heightPyr * 0.5, -baseSize);
    vec3 cp1 = vec3(baseSize, -heightPyr * 0.5, -baseSize);
    vec3 cp2 = vec3(baseSize, -heightPyr * 0.5, baseSize);
    vec3 cp3 = vec3(-baseSize, -heightPyr * 0.5, baseSize);
    
    if (isPyrEdge > 0.5) {
        float edgeIdx = floor(fract(randomSeed * 101.0) * 8.0);
        if (edgeIdx == 0.0) shape6 = mix(cp0, cp1, eT);
        else if (edgeIdx == 1.0) shape6 = mix(cp1, cp2, eT);
        else if (edgeIdx == 2.0) shape6 = mix(cp2, cp3, eT);
        else if (edgeIdx == 3.0) shape6 = mix(cp3, cp0, eT);
        else if (edgeIdx == 4.0) shape6 = mix(apex, cp0, eT);
        else if (edgeIdx == 5.0) shape6 = mix(apex, cp1, eT);
        else if (edgeIdx == 6.0) shape6 = mix(apex, cp2, eT);
        else shape6 = mix(apex, cp3, eT);
    } else {
        float uP = fract(randomSeed * 123.0);
        float vP = fract(vSizeParam * 456.0);
        if (pyrFace == 0.0) { shape6 = vec3((uP * 2.0 - 1.0) * baseSize, -heightPyr * 0.5, (vP * 2.0 - 1.0) * baseSize); } 
        else {
            if (uP + vP > 1.0) { uP = 1.0 - uP; vP = 1.0 - vP; }
            vec3 pB, pC;
            if (pyrFace == 1.0) { pB = cp0; pC = cp1; }
            else if (pyrFace == 2.0) { pB = cp1; pC = cp2; }
            else if (pyrFace == 3.0) { pB = cp2; pC = cp3; }
            else { pB = cp3; pC = cp0; }
            shape6 = apex + uP * (pB - apex) + vP * (pC - apex);
        }
    }

    // 8. Heart - smooth 3D heart outline and volume
    float hT = uSizeParam * 6.28318;
    float hSize = 8.0;
    float hX = 16.0 * pow(sin(hT), 3.0);
    float hY = 13.0 * cos(hT) - 5.0 * cos(2.0*hT) - 2.0 * cos(3.0*hT) - cos(4.0*hT);
    float hLayer = floor(fract(vSizeParam * 17.0) * 8.0) - 4.0;
    float hZ = hLayer * 1.0 + (fract(randomSeed * 29.0) - 0.5);
    vec3 shape7 = vec3(hX * hSize * 0.04, hY * hSize * 0.04, hZ);

    // 9. Orbital - distinct 3D orbital rings
    float orbitRing = floor(fract(vSizeParam * 19.3) * 5.0);
    float orbitRadius = 6.0 + orbitRing * 3.5;
    float orbitSpeed = 0.5 + orbitRing * 0.2;
    float orbitPhase = uSizeParam * 6.28318;
    float oX = orbitRadius * cos(orbitPhase + uTime * orbitSpeed);
    float oZ = orbitRadius * sin(orbitPhase + uTime * orbitSpeed);
    float oY = sin(orbitPhase * (2.0 + orbitRing*0.5) + uTime) * orbitRadius * 0.4;
    vec3 shape8 = vec3(oX, oY, oZ);

    // 10. Wave - layered curved wave surface
    float wGridX = floor(uSizeParam * 40.0) / 40.0;
    float wGridZ = floor(vSizeParam * 40.0) / 40.0;
    float isWaveX = step(0.5, fract(randomSeed * 31.0));
    float wX = (isWaveX > 0.5 ? uSizeParam : wGridX - 0.5) * 40.0;
    float wZ = (isWaveX < 0.5 ? vSizeParam : wGridZ - 0.5) * 40.0;
    float wY = sin(wX * 0.15 + uTime) * cos(wZ * 0.15 + uTime) * 5.0;
    float wLayer = floor(fract(randomSeed * 17.0) * 3.0) - 1.0;
    wY += wLayer * 6.0;
    vec3 shape9 = vec3(wX, wY, wZ);

    // 11. Grid - precise 3D lattice
    float gridCells = 8.0;
    float gStep = 24.0 / gridCells;
    float rx = floor(fract(randomSeed * 11.3) * gridCells);
    float ry = floor(fract(vSizeParam * 23.7) * gridCells);
    float rz = floor(fract(uSizeParam * 31.9) * gridCells);
    
    float axis = floor(fract(randomSeed * 47.0) * 3.0);
    float gLine = (uSizeParam * gridCells);
    if (axis == 0.0) rx = gLine;
    else if (axis == 1.0) ry = gLine;
    else rz = gLine;

    vec3 shape10 = vec3((rx - gridCells*0.5) * gStep, (ry - gridCells*0.5) * gStep, (rz - gridCells*0.5) * gStep);

    // 12. Vortex - controlled spiral tunnel
    float vLines = 36.0;
    float vRings = 40.0;
    float isVRing = step(0.5, fract(randomSeed * 59.0));
    float vPhase = isVRing > 0.5 ? (floor(uSizeParam * vLines) / vLines * 6.28318) : (randomSeed * 6.28318 + uTime * 0.5);
    float vZ = isVRing < 0.5 ? (floor(vSizeParam * vRings) / vRings * 40.0) - 20.0 : (vSizeParam - 0.5) * 40.0; 
    float vRadius = 4.0 + (vZ + 20.0) * 0.35; 
    float vAngle = vPhase + vZ * 0.4 - uTime * 1.5;
    vec3 shape11 = vec3(vRadius * cos(vAngle), vRadius * sin(vAngle), vZ);

    // Volumetric Swarm Offset (Stable thickness per shape)
    vec3 tube = vec3(
        (fract(randomSeed * 943.0) - 0.5) * 2.0,
        (fract(randomSeed * 324.0) - 0.5) * 2.0,
        (fract(randomSeed * 852.0) - 0.5) * 2.0
    );

    // Apply specific thickness per shape
    shape0 += tube * 0.35; // Clean hero 8
    shape1 += tube * 0.15; // Thin wire sphere
    shape2 += tube * 0.2;  // Thin torus rings
    shape3 += tube * 0.25; // Clean DNA
    shape4 += tube * 0.1;  // Sharp Cube
    shape5 += tube * 0.5;  // Galaxy is slightly hazy
    shape6 += tube * 0.1;  // Pyramid sharp
    shape7 += tube * 0.2;  // Heart smooth
    shape8 += tube * 0.15; // Orbital thin rings
    shape9 += tube * 0.2;  // Wave surface
    shape10 += tube * 0.1; // Grid sharp
    shape11 += tube * 0.3; // Vortex structure

    // Select target
    vec3 morphTargetPosition = shape0;
    if (uTargetShapeIndex > 10.5) { morphTargetPosition = shape11; }
    else if (uTargetShapeIndex > 9.5) { morphTargetPosition = shape10; }
    else if (uTargetShapeIndex > 8.5) { morphTargetPosition = shape9; }
    else if (uTargetShapeIndex > 7.5) { morphTargetPosition = shape8; }
    else if (uTargetShapeIndex > 6.5) { morphTargetPosition = shape7; }
    else if (uTargetShapeIndex > 5.5) { morphTargetPosition = shape6; }
    else if (uTargetShapeIndex > 4.5) { morphTargetPosition = shape5; }
    else if (uTargetShapeIndex > 3.5) { morphTargetPosition = shape4; }
    else if (uTargetShapeIndex > 2.5) { morphTargetPosition = shape3; }
    else if (uTargetShapeIndex > 1.5) { morphTargetPosition = shape2; }
    else if (uTargetShapeIndex > 0.5) { morphTargetPosition = shape1; }

    // 4. The Hero 8 Lock (Crucial)
    float totalParticles = uTextureSize * uTextureSize;
    float particleIndex = floor(vUv.y * uTextureSize) * uTextureSize + floor(vUv.x * uTextureSize);
    bool isHeroParticle = (particleIndex < totalParticles * 0.20);
    
    vec3 targetPos;
    if (isHeroParticle) {
        // ALWAYS use figure-8 lemniscate position
        bool nonEight = (uTargetShapeIndex > 0.5);
        // Smoothly shrink hero element
        targetPos = mix(shape0, shape0 * 0.5, nonEight ? uMorphProgress : 0.0);
    } else {
        // Use uMorphProgress to smoothly transition between Core 8 and new shape
        targetPos = mix(shape0, morphTargetPosition, uMorphProgress);
    }

    // 3. Strong Magnetic Physics (Clean interpolation)
    vec3 dir = targetPos - pos;
    vec3 springForce = dir * 0.12;  // Strong magnetic pull
    pos += springForce;

    // Add subtle flow motion so particles feel alive, without breaking the shape
    float n = sin(pos.x * 2.0 + uTime) * cos(pos.y * 2.0 + uTime * 0.8) * sin(pos.z * 2.0 + uTime * 0.6);
    pos += normalize(pos + vec3(0.001)) * n * 0.03;

    // 1. Low frequencies / bass: subtle outward pulse
    float pulse = uBass * 0.4 + uAudio * 0.2;
    if (pulse > 0.01) {
        pos += normalize(pos + vec3(0.001)) * pulse * clamp(length(pos)/10.0, 0.0, 1.0) * 0.2;
    }

    // 2. Mid frequencies / voice: ripple along the current shape
    if (uMid > 0.01) {
        float ripple = sin(particleIndex * 0.05 + uTime * 5.0) * uMid * 0.5;
        pos += curlNoise(pos * 0.5) * ripple;
    }

    // 3. Loud voice or strong beat: controlled burst and reassemble
    float loudBurst = clamp((uAudio - 0.5) * 2.0, 0.0, 1.0); // Only triggers when very loud
    if (loudBurst > 0.01) {
        pos += normalize(pos + vec3(0.001)) * loudBurst * 0.2;
    }

    if (uShockwave > 0.0) {
        vec3 dispersion = curlNoise(pos * 0.4 + uTime) * 8.0;
        pos += (normalize(pos + vec3(0.001)) * 3.0 + dispersion) * uShockwave * 0.1;
    }

    // Soft containment
    if (length(pos) > 80.0) { pos *= 0.95; }

    gl_FragColor = vec4(pos, clusterId);
  }
`;

const displayVertexShader = `
  uniform sampler2D uPositions;
  uniform float uAudio;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uTime;
  uniform float uDevicePixelRatio;
  uniform float uTotalParticles;
  uniform float uZoom;
  uniform float uTargetShapeIndex;
  
  attribute vec2 targetUv;
  attribute vec3 aColor;
  attribute float aIndex;

  varying vec3 vColor;
  varying float vDist;
  varying float vHighlight;
  varying float vIsHeroParticle;

  void main() {
    vec4 data = texture2D(uPositions, targetUv);
    vec3 pos = data.xyz;
    
    // Evaluate hero status
    bool isHeroParticle = (aIndex < uTotalParticles * 0.25);
    vIsHeroParticle = isHeroParticle ? 1.0 : 0.0;
    
    // Identify leaders
    bool isLeader = (aIndex == 0.0 || aIndex == floor(uTotalParticles * 0.25) || aIndex == floor(uTotalParticles * 0.5) || aIndex == floor(uTotalParticles * 0.75));
    
    vec3 shapeColor = vec3(1.0);
    if (uTargetShapeIndex < 0.5) {
       shapeColor = aColor; 
    } else if (uTargetShapeIndex < 1.5) {
       shapeColor = vec3(0.0, 0.8, 1.0); // Sphere: electric cyan
    } else if (uTargetShapeIndex < 2.5) {
       shapeColor = vec3(1.0, 0.75, 0.1); // Torus: amber gold
    } else if (uTargetShapeIndex < 3.5) {
       shapeColor = vec3(0.5, 0.9, 1.0); // DNA: icy blue
    } else if (uTargetShapeIndex < 4.5) {
       shapeColor = vec3(0.45, 0.2, 1.0); // Cube: violet blue
    } else if (uTargetShapeIndex < 5.5) {
       shapeColor = vec3(0.2, 0.1, 0.9); // Galaxy: deep blue + purple
    } else if (uTargetShapeIndex < 6.5) {
       shapeColor = vec3(1.0, 0.85, 0.2); // Pyramid: gold
    } else if (uTargetShapeIndex < 7.5) {
       shapeColor = vec3(0.85, 0.05, 0.15); // Heart: elegant crimson
    } else if (uTargetShapeIndex < 8.5) {
       shapeColor = vec3(0.0, 1.0, 1.0); // Orbital: cyan
    } else if (uTargetShapeIndex < 9.5) {
       shapeColor = vec3(0.1, 0.5, 0.8); // Wave: deep sea
    } else if (uTargetShapeIndex < 10.5) {
       shapeColor = vec3(0.3, 0.7, 0.9); // Grid: tech blue
    } else {
       shapeColor = vec3(0.5, 0.1, 0.9); // Vortex: dark violet
    }

    if (uTargetShapeIndex > 0.5) {
        float var1 = fract(aIndex * 0.013);
        shapeColor = mix(shapeColor, shapeColor * 0.4, var1);
    }

    if (isLeader) {
        if (isHeroParticle) {
            vColor = aColor * 2.5 + vec3(0.8);
        } else if (uTargetShapeIndex < 0.5) {
            vColor = aColor * 2.5 + vec3(0.8);
        } else {
            vColor = shapeColor * 2.0;
        }
    } else if (isHeroParticle) {
        vColor = aColor * 1.5 + vec3(0.2);
    } else {
        vColor = shapeColor;
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    vDist = -mvPosition.z;
    float uSize = 12.0;
    if (isLeader) {
        uSize = 25.0;
    } else if (isHeroParticle) {
        uSize = 16.0;
    }
    
    // Zoom-dependent size reduction
    float zoomFactor = clamp(uZoom, 0.8, 2.5);
    float sizeReduction = 1.0 - (zoomFactor - 0.8) * 0.15; 
    
    // Controlled audio effect on point size
    float audioBoost = isHeroParticle ? (uAudio * 0.2 + uBass * 0.1) : (uAudio * 0.1 + uBass * 0.05);
    
    // High frequencies: fine sparkle / micro shimmer
    float shimmer = 0.0;
    if (uTreble > 0.1) {
       shimmer = step(0.9, fract(sin(aIndex * 12.9898 + uTime) * 43758.5453)) * uTreble * 1.5;
    }
    
    vHighlight = (smoothstep(-10.0, 10.0, pos.y) * uAudio * 0.4 + shimmer) * (isHeroParticle ? 0.8 : 0.4);
    // Scale by size attenuation based on 10 / -mvPosition.z
    gl_PointSize = uSize * (10.0 / max(1.0, vDist)) * uDevicePixelRatio * (1.0 + audioBoost) * sizeReduction;
    gl_PointSize = clamp(gl_PointSize, 1.0, 12.0); // Toned down to prevent blobs
    if (isLeader) {
        gl_PointSize = clamp(gl_PointSize, 2.0, 30.0);
    }
  }
`;

const displayFragmentShader = `
  varying vec3 vColor;
  varying float vDist;
  varying float vHighlight;
  varying float vIsHeroParticle;
  uniform float uOpacity;
  uniform float uHueShift;
  uniform float uBass;

  // Helper to convert rgb to hsv
  vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }
  
  // hsv to rgb
  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float distToCenter = length(gl_PointCoord - 0.5) * 2.0;
    if (distToCenter > 1.0) discard;
    
    float intensity = pow(1.0 - distToCenter, 1.5);
    
    // Core color calculations
    vec3 finalColor = vColor * intensity;
    
    // Audio reaction: subtle halo and color shift, NOT raw brightness explosion
    if (vIsHeroParticle > 0.5) {
        vec3 audioGlow = vec3(0.05, 0.3, 0.8) * vHighlight * 0.3; // Elegant deep blue energy
        
        // Bass glow
        audioGlow += vec3(0.0, 0.4, 0.9) * uBass * 0.3;

        // Subtle ripple ring for texture
        float ripple = sin(distToCenter * 8.0 - uBass * 2.0) * 0.5 + 0.5;
        audioGlow *= (0.6 + 0.4 * ripple);

        finalColor += audioGlow * intensity;
        finalColor *= (1.0 + vHighlight * 0.2 + uBass * 0.15); // Much gentler brightness lift
    } else {
        finalColor *= (1.0 + vHighlight * 0.1 + uBass * 0.05);
    }
    
    finalColor = clamp(finalColor, 0.0, 1.0); // Fully clamp to prevent washing out to white
    
    // Apply Hue Shift
    if (abs(uHueShift) > 0.001) {
        vec3 hsv = rgb2hsv(finalColor);
        hsv.x = fract(hsv.x + uHueShift);
        finalColor = hsv2rgb(hsv);
    }
    
    float alpha = intensity * clamp(1.2 - (vDist - 10.0) / 100.0, 0.0, 1.0);
    // Hero particles ignore the global opacity fading, staying visible
    if (vIsHeroParticle > 0.5) {
        alpha = clamp(intensity, 0.0, 0.8);
    } else {
        alpha = clamp(alpha * uOpacity, 0.0, 0.6);
    }
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const NeuralWeb: React.FC<{ audioIntensityRef: React.MutableRefObject<number> }> = ({ audioIntensityRef }) => {
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const pointsRef = useRef<{pos: THREE.Vector3, vel: THREE.Vector3}[]>([]);
  const frameCountRef = useRef<number>(0);
  
  const maxPoints = 70; // Reduced from 150
  const maxLines = 1500;
  const positionsRef = useRef<Float32Array>(new Float32Array(maxLines * 6));

  useEffect(() => {
    const pts = [];
    for(let j=0; j<maxPoints; j++) {
       pts.push({
          pos: new THREE.Vector3((Math.random()-0.5)*40, (Math.random()-0.5)*40, (Math.random()-0.5)*40),
          vel: new THREE.Vector3((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5),
       });
    }
    pointsRef.current = pts;
    
    // Initialize geometry attributes once, not in useFrame
    if (geoRef.current) {
      const attr = new THREE.BufferAttribute(positionsRef.current, 3);
      attr.setUsage(THREE.DynamicDrawUsage);
      geoRef.current.setAttribute('position', attr);
      geoRef.current.setDrawRange(0, 0);
    }
    
    return () => {
      if (geoRef.current) geoRef.current.dispose();
      if (lineMatRef.current) lineMatRef.current.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (!geoRef.current || !lineMatRef.current || !pointsRef.current || !positionsRef.current) return;
    const pts = pointsRef.current;
    if (!pts || pts.length === 0) return;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p || !p.pos || !p.vel || typeof p.pos.addScaledVector !== 'function' || typeof p.vel?.x !== 'number') continue;
      p.pos.addScaledVector(p.vel, delta * 10.0);
      if (p.pos.length() > 30) p.vel.negate();
    }

    frameCountRef.current++;
    if (frameCountRef.current % 3 === 0) {
      const positions = positionsRef.current;
      let lineIndex = 0;
      const maxDistSq = 64.0;

      outer: for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        if (!a || !a.pos) continue;

        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          if (!b || !b.pos) continue;

          // Double validation for THREE.Vector3 and distanceToSquared method
          if (!(a.pos instanceof THREE.Vector3) || !(b.pos instanceof THREE.Vector3)) continue;
          if (typeof a.pos.distanceToSquared !== 'function' || typeof b.pos?.x !== 'number') continue;

          const distSq = a.pos.distanceToSquared(b.pos);

          if (distSq < maxDistSq) {
            if (lineIndex < maxLines) {
              const idx = lineIndex * 6;
              if (a && a.pos && typeof a.pos?.x === 'number' && typeof a.pos?.y === 'number' && typeof a.pos?.z === 'number') {
                positions[idx] = a.pos?.x;
                positions[idx + 1] = a.pos?.y;
                positions[idx + 2] = a.pos?.z;
              }
              if (b && b.pos && typeof b.pos?.x === 'number' && typeof b.pos?.y === 'number' && typeof b.pos?.z === 'number') {
                positions[idx + 3] = b.pos?.x;
                positions[idx + 4] = b.pos?.y;
                positions[idx + 5] = b.pos?.z;
              }
              lineIndex++;
            } else {
              break outer;
            }
          }
        }
      }

      if (geoRef.current) {
        const attr = geoRef.current.getAttribute('position') as THREE.BufferAttribute;
        if (attr) {
          attr.needsUpdate = true;
        }
        // Update drawRange with actual lines * 2 vertices
        geoRef.current.setDrawRange(0, lineIndex * 2);
      }
    }
    
    if (lineMatRef.current) {
        lineMatRef.current.opacity = 0.05 + audioIntensityRef.current * 0.2;
    }
  });

  return null; // Disabled visually to prevent wire mess as requested
};

const MagneticCell: React.FC<{ audioIntensityRef: React.MutableRefObject<number>, zoomLevelRef: React.MutableRefObject<number> }> = ({ audioIntensityRef, zoomLevelRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particleGeoRef = useRef<THREE.BufferGeometry>(null);
  const particleMatRef = useRef<THREE.PointsMaterial>(null);
  const tubesRef = useRef<THREE.Mesh[]>([]);
  const [tubeGeos, setTubeGeos] = useState<THREE.TubeGeometry[]>([]);

  const curves = useRef<THREE.CatmullRomCurve3[]>([]);
  const flowParticles = useRef<{ curveIdx: number, t: number, speed: number }[]>([]);

  useEffect(() => {
    // Generate 8 swooping neural curves from center outwards
    const numCurves = 8;
    const newCurves = [];
    const geos: THREE.TubeGeometry[] = [];
    for (let i = 0; i < numCurves; i++) {
        const points = [];
        const baseAngle = (i / numCurves) * Math.PI * 2;
        const length = 18;
        
        for (let j = 0; j <= 16; j++) {
            const t = j / 16;
            const radius = t * length;
            // Swooping spiral
            const currentAngle = baseAngle + t * Math.PI * 1.5;
            // Elevate slightly across the curve
            const yOffset = Math.sin(t * Math.PI) * 5.0 * (i % 2 === 0 ? 1 : -1);
            
            const x = Math.cos(currentAngle) * radius;
            const y = yOffset + (Math.random() - 0.5) * 1.5 * t; // subtle organic jitter
            const z = Math.sin(currentAngle) * radius;
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const curve = new THREE.CatmullRomCurve3(points, false, 'chordal', 0.5);
        newCurves.push(curve);
        geos.push(new THREE.TubeGeometry(curve, 64, 0.02, 5, false));
    }
    curves.current = newCurves;
    setTubeGeos(geos);

    // Generate 150 flow particles
    const numParticles = 150;
    const newFlow = [];
    const positions = new Float32Array(numParticles * 3);
    for(let i=0; i<numParticles; i++) {
        newFlow.push({
            curveIdx: Math.floor(Math.random() * numCurves),
            t: Math.random(),
            speed: 0.05 + Math.random() * 0.1
        });
        positions[i*3] = 0;
        positions[i*3+1] = 0;
        positions[i*3+2] = 0;
    }
    flowParticles.current = newFlow;

    if (particleGeoRef.current) {
        particleGeoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }

    return () => {
        geos.forEach(g => g.dispose());
        if (particleGeoRef.current) particleGeoRef.current.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current || !particleGeoRef.current || !particleMatRef.current || !tubesRef.current || !curves.current || !flowParticles.current) return;
    if (curves.current.length === 0) return;
    
    const audio = audioIntensityRef.current;
    const zoom = zoomLevelRef.current;
    
    if (groupRef.current) {
        groupRef.current.rotation.y += delta * 0.05;
        groupRef.current.rotation.z += delta * 0.02;
    }

    const positions = particleGeoRef.current.getAttribute('position') as THREE.BufferAttribute;
    const flow = flowParticles.current;
    
    for(let i=0; i<flow.length; i++) {
        const p = flow[i];
        p.t += delta * p.speed * (1.0 + audio * 1.5); 
        if (p.t > 1) p.t -= 1;
        
        const curve = curves.current ? curves.current[p.curveIdx] : null;
        if (!curve) continue;
        
        const point = curve.getPointAt(p.t);
        if (!point || typeof point?.x !== 'number' || typeof point?.y !== 'number' || typeof point?.z !== 'number') continue;
        
        if (positions) positions.setXYZ(i, point?.x, point?.y, point?.z);
    }
    if (positions) positions.needsUpdate = true;

    if (particleMatRef.current) {
        particleMatRef.current.opacity = (0.5 + audio * 0.3) * Math.min(zoom / 1.5, 1.0); 
    }
    
    tubesRef.current.forEach((tube) => {
        if (!tube) return;
        const mat = tube.material as THREE.MeshBasicMaterial;
        if (mat) {
             mat.opacity = (0.03 + audio * 0.05) * Math.min(zoom / 1.5, 1.0);
        }
    });
  });

  return (
    <group ref={groupRef}>
        {tubeGeos.map((geo, idx) => (
           <mesh key={`tube-${idx}`} geometry={geo} ref={(el) => { if (el) tubesRef.current[idx] = el; }}>
              <meshBasicMaterial color="#a0c0ff" transparent opacity={0.03} blending={THREE.AdditiveBlending} depthWrite={false} />
           </mesh>
        ))}
        <points>
            <bufferGeometry ref={particleGeoRef} />
            <pointsMaterial ref={particleMatRef} color="#ffffff" size={0.4} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    </group>
  );
};

interface Resonance3DProps {
  visualState: VisualState;
  visualDimension: VisualDimension;
  activeCommand: CommandSpec | null;
  shockwaveRef: React.MutableRefObject<number>;
  textTargetsRef: React.MutableRefObject<Point[]>;
  zoomLevelRef: React.MutableRefObject<number>;
  opacityRef: React.MutableRefObject<number>;
  rotationRef: React.MutableRefObject<{x: number, y: number, z: number}>;
  manualRotRef: React.MutableRefObject<{x: number, y: number}>;
  hueShiftRef: React.MutableRefObject<number>;
  audioIntensityRef: React.MutableRefObject<number>;
  bandsRef: React.MutableRefObject<{ bass: number, mid: number, treble: number }>;
  distortionRef: React.MutableRefObject<number>;
  vibe: any;
  entropyRef: React.MutableRefObject<number>;
  faceDataRef: React.MutableRefObject<{ landmarks: {x:number, y:number, z:number}[], leftEyeEAR: number, rightEyeEAR: number, smile: number } | null>;
  mousePosRef: React.MutableRefObject<{ x: number, y: number }>;
  phase: string;
  showNeural?: boolean;
  showLeaders?: boolean;
}

export const Resonance3D: React.FC<Resonance3DProps> = ({ 
  audioIntensityRef, bandsRef, zoomLevelRef, opacityRef, manualRotRef, rotationRef, hueShiftRef, mousePosRef, shockwaveRef, faceDataRef, visualDimension, showNeural = true, showLeaders = true
}) => {
  const { gl } = useThree();
  const [fboSettings, setFboSettings] = useState<{ size: number, bloom: boolean } | null>(null);

  // Dynamic Capability Check
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    let isLowEnd = false;
    
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera/i.test(navigator.userAgent)) {
      isLowEnd = true;
    }
    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 4 && dpr > 2.0) {
      isLowEnd = true;
    }
    
    // Scale size: 224x224 = ~50,000, 158x158 = ~25,000
    const desiredParticles = isLowEnd ? 25000 : 50000;
    const fboSize = Math.ceil(Math.sqrt(desiredParticles));
    
    setFboSettings({ size: fboSize, bloom: !isLowEnd });
  }, []);

  const [fboReady, setFboReady] = useState(false);
  const fboRef = useRef<any>(null);
  const displayMatRef = useRef<THREE.ShaderMaterial>(null);
  const mainGroupRef = useRef<THREE.Group>(null);
  
  const morphTargetRef = useRef(0.0);
  const morphProgressRef = useRef(0.0);
  const morphTimerRef = useRef(0.0);

  useEffect(() => {
    if (!fboRef.current) return;
    
    let shapeIndex = 0;
    if (visualDimension === VisualDimension.Core8) {
       morphTargetRef.current = 0.0;
       shapeIndex = 0;
       fboRef.current.simMat.uniforms.uTargetShapeIndex.value = shapeIndex;
       return;
    }

    if (visualDimension === VisualDimension.Sphere) shapeIndex = 1;
    else if (visualDimension === VisualDimension.Torus) shapeIndex = 2;
    else if (visualDimension === VisualDimension.DNA) shapeIndex = 3;
    else if (visualDimension === VisualDimension.Cube) shapeIndex = 4;
    else if (visualDimension === VisualDimension.Galaxy) shapeIndex = 5;
    else if (visualDimension === VisualDimension.Pyramid) shapeIndex = 6;
    else if (visualDimension === VisualDimension.Heart) shapeIndex = 7;
    else if (visualDimension === VisualDimension.NeuralOrbit) shapeIndex = 8;
    else if (visualDimension === VisualDimension.Wave) shapeIndex = 9;
    else if (visualDimension === VisualDimension.Grid) shapeIndex = 10;
    else if (visualDimension === VisualDimension.Vortex) shapeIndex = 11;
    else shapeIndex = Math.floor(Math.random() * 3) + 1; // fallback if random 
    
    fboRef.current.simMat.uniforms.uTargetShapeIndex.value = shapeIndex;
    
    // We want the morph to interpolate to 1.0
    morphTargetRef.current = 1.0;
    // Removed auto-revert timer completely
  }, [visualDimension]);

  useEffect(() => {
    if (!fboSettings) return;
    const size = fboSettings.size;

    const renderTargetParams: THREE.RenderTargetOptions = {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType, 
        depthBuffer: false,
        stencilBuffer: false,
    };
    
    const rtA = new THREE.WebGLRenderTarget(size, size, renderTargetParams);
    const rtB = new THREE.WebGLRenderTarget(size, size, renderTargetParams);

    const posData = new Float32Array(size * size * 4);
    const uvData = new Float32Array(size * size * 2);
    const colorData = new Float32Array(size * size * 3);
    
    const colors = [
        new THREE.Color('#4285F4'), // Blue
        new THREE.Color('#DB4437'), // Red
        new THREE.Color('#F4B400'), // Yellow
        new THREE.Color('#0F9D58')  // Green
    ];
    
    const totalParticles = size * size;
    for(let i = 0; i < totalParticles; i++) {
       const cluster = Math.min(3, Math.floor((i / totalParticles) * 4)); // 0, 1, 2, 3 chunks
       const r = 15.0 + Math.random() * 10.0;
       const u = Math.random();
       const v = Math.random();
       const theta = u * 2.0 * Math.PI;
       const phi = Math.acos(2.0 * v - 1.0);
       
       posData[i*4] = r * Math.sin(phi) * Math.cos(theta);     // X
       posData[i*4+1] = r * Math.sin(phi) * Math.sin(theta);   // Y
       posData[i*4+2] = r * Math.cos(phi);                     // Z
       posData[i*4+3] = cluster;                               // W (cluster id)

       uvData[i*2] = (i % size) / size;
       uvData[i*2+1] = Math.floor(i / size) / size;
       
       const c = colors[cluster];
       colorData[i*3] = c.r;
       colorData[i*3+1] = c.g;
       colorData[i*3+2] = c.b;
    }

    const dataTexture = new THREE.DataTexture(posData, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;

    const simGeo = new THREE.PlaneGeometry(2, 2);
    const simMat = new THREE.ShaderMaterial({
        uniforms: {
            uPositions: { value: dataTexture },
            uTime: { value: 0 },
            uAudio: { value: 0 },
            uBass: { value: 0 },
            uMid: { value: 0 },
            uTreble: { value: 0 },
            uShockwave: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uMorphProgress: { value: 0.0 },
            uTargetShapeIndex: { value: 0.0 },
            uTextureSize: { value: size },
            uSeed1: { value: 3.0 },
            uSeed2: { value: 4.0 },
            uSeed3: { value: 5.0 },
            uSeed4: { value: 2.0 }
        },
        vertexShader: simVertexShader,
        fragmentShader: simFragmentShader
    });
    
    const simScene = new THREE.Scene();
    const simMesh = new THREE.Mesh(simGeo, simMat);
    simScene.add(simMesh);
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const particleGeo = new THREE.BufferGeometry();
    const blankPos = new Float32Array(size * size * 3); 
    const indexData = new Float32Array(size * size);
    // Fill with random safe coordinates just in case
    for(let i=0; i<totalParticles; i++) {
        blankPos[i*3] = (Math.random() - 0.5) * 5.0;
        blankPos[i*3+1] = (Math.random() - 0.5) * 5.0;
        blankPos[i*3+2] = (Math.random() - 0.5) * 5.0;
        indexData[i] = i;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(blankPos, 3));
    particleGeo.setAttribute('targetUv', new THREE.BufferAttribute(uvData, 2));
    particleGeo.setAttribute('aColor', new THREE.BufferAttribute(colorData, 3));
    particleGeo.setAttribute('aIndex', new THREE.BufferAttribute(indexData, 1));

    fboRef.current = {
        geo: particleGeo,
        rtA, rtB, simMat, simGeo, simScene, simCamera, currentRt: rtA, dataTexture,
        isFirstFrame: true
    };
    
    setFboReady(true);

    // Rigorous Memory Cleanup
    return () => {
        rtA.dispose();
        rtB.dispose();
        dataTexture.dispose();
        simGeo.dispose();
        simMat.dispose();
        particleGeo.dispose();
        fboRef.current = null;
        setFboReady(false);
    };
  }, [fboSettings]);

  // Group Leaders State
  const leaderGroupRefs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null)
  ];
  const leaderDivRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null)
  ];
  const leaderNames = ["ALPHA", "NEXUS", "FLUX", "PULSE"];
  const leaderColors = ["#4285F4", "#DB4437", "#F4B400", "#0F9D58"];
  const readBuffer = new Float32Array(4);

  useFrame((state, delta) => {
    if (!fboRef.current || !displayMatRef.current || !mainGroupRef.current) return;
    
    // ... fbo computation ...
    const time = state.clock.getElapsedTime();
    const fbo = fboRef.current;
    
    // Update Simulation Uniforms
    fbo.simMat.uniforms.uTime.value = time;
    fbo.simMat.uniforms.uAudio.value = audioIntensityRef.current;
    if (bandsRef && bandsRef.current) {
        fbo.simMat.uniforms.uBass.value = bandsRef.current.bass;
        fbo.simMat.uniforms.uMid.value = bandsRef.current.mid;
        fbo.simMat.uniforms.uTreble.value = bandsRef.current.treble;
    }
    
    const prevShock = fbo.simMat.uniforms.uShockwave.value;
    if (shockwaveRef.current > 0.01 && prevShock <= 0.01) {
       fbo.simMat.uniforms.uShockwave.value = 1.0;
    } else {
       fbo.simMat.uniforms.uShockwave.value = Math.max(0, prevShock - delta * 2.0);
    }
    
    if (fbo && fbo.simMat && fbo.simMat.uniforms && fbo.simMat.uniforms.uMouse && fbo.simMat.uniforms.uMouse.value) {
       fbo.simMat.uniforms.uMouse.value.set(
          (mousePosRef?.current?.x ?? 0) / (window.innerWidth || 1) - 0.5, 
          -((mousePosRef?.current?.y ?? 0) / (window.innerHeight || 1) - 0.5)
       );
    }
    
    if (fbo.isFirstFrame) {
        fbo.simMat.uniforms.uPositions.value = fbo.dataTexture;
        fbo.isFirstFrame = false;
    } else {
        fbo.simMat.uniforms.uPositions.value = fbo.currentRt === fbo.rtA ? fbo.rtB.texture : fbo.rtA.texture;
    }
    
    // GPGPU Compute Pass
    // Ensure smooth morph progress transitions
    morphProgressRef.current = THREE.MathUtils.lerp(morphProgressRef.current, morphTargetRef.current, delta * 2.5);
    fbo.simMat.uniforms.uMorphProgress.value = morphProgressRef.current;

    gl.setRenderTarget(fbo.currentRt);
    gl.clear();
    gl.render(fbo.simScene, fbo.simCamera);
    gl.setRenderTarget(null);

    // Update Display Uniforms
    displayMatRef.current.uniforms.uPositions.value = fbo.currentRt.texture;
    displayMatRef.current.uniforms.uTime.value = time;
    displayMatRef.current.uniforms.uOpacity.value = opacityRef.current;
    displayMatRef.current.uniforms.uHueShift.value = hueShiftRef.current;
    displayMatRef.current.uniforms.uAudio.value = audioIntensityRef.current;
    if (bandsRef && bandsRef.current) {
        displayMatRef.current.uniforms.uBass.value = bandsRef.current.bass;
        displayMatRef.current.uniforms.uMid.value = bandsRef.current.mid;
        displayMatRef.current.uniforms.uTreble.value = bandsRef.current.treble;
    }
    displayMatRef.current.uniforms.uZoom.value = zoomLevelRef.current;
    displayMatRef.current.uniforms.uTargetShapeIndex.value = fbo.simMat.uniforms.uTargetShapeIndex.value;

    // Apply Camera Zoom strictly to camera position (range 5 to 30)
    const targetZ = THREE.MathUtils.clamp(30.0 / Math.max(0.1, zoomLevelRef.current), 5.0, 30.0);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, delta * 5.0);
    state.camera.position.x = 0;
    state.camera.position.y = 0;
    state.camera.lookAt(0, 0, 0);

    // Ping Pong textures
    fbo.currentRt = fbo.currentRt === fbo.rtA ? fbo.rtB : fbo.rtA;

    // Optional Group Sway
    if (mainGroupRef.current) {
        const swayX = Math.sin(time * 0.1) * 0.05;
        const swayY = Math.cos(time * 0.08) * 0.05;
        const dragX = (rotationRef?.current && typeof rotationRef.current?.x === 'number' ? rotationRef.current?.x : 0) * 0.02;
        const dragY = (rotationRef?.current && typeof rotationRef.current?.y === 'number' ? rotationRef.current?.y : 0) * 0.02;
        const targetRotX = THREE.MathUtils.degToRad(manualRotRef?.current && typeof manualRotRef.current?.x === 'number' ? manualRotRef.current?.x : 0) + dragX + swayX;
        const targetRotY = THREE.MathUtils.degToRad(manualRotRef?.current && typeof manualRotRef.current?.y === 'number' ? manualRotRef.current?.y : 0) + dragY + swayY;
        mainGroupRef.current.rotation.x = THREE.MathUtils.lerp(mainGroupRef.current.rotation.x, targetRotX, delta * 5.0);
        mainGroupRef.current.rotation.y = THREE.MathUtils.lerp(mainGroupRef.current.rotation.y, targetRotY, delta * 5.0);
        
        let targetPosX = 0;
        let targetPosY = 0;
        if (faceDataRef?.current?.landmarks && Array.isArray(faceDataRef.current.landmarks) && faceDataRef.current.landmarks.length > 1) {
            const nose = faceDataRef.current.landmarks[1];
            if (nose && typeof nose?.x === 'number' && typeof nose?.y === 'number') {
                targetPosX = -((nose?.x) - 0.5) * 15.0; 
                targetPosY = -((nose?.y) - 0.5) * 15.0;
            }
        }
        mainGroupRef.current.position.x = THREE.MathUtils.lerp(mainGroupRef.current.position.x, targetPosX, delta * 4.0);
        mainGroupRef.current.position.y = THREE.MathUtils.lerp(mainGroupRef.current.position.y, targetPosY, delta * 4.0);
    }
    
    // Read leader positions
    if (showLeaders && fboSettings && fboRef.current && zoomLevelRef.current > 1.2) {
      const idx = Math.floor(time * 60) % 4; // Round robin, 1 per frame
      const size = fboSettings.size;
      const t = size * size;
      const posMap = [0, Math.floor(t * 0.25), Math.floor(t * 0.5), Math.floor(t * 0.75)];
      
      const partIdx = posMap[idx];
      const x = partIdx % size;
      const y = Math.floor(partIdx / size);
      
      if (fboRef.current) {
        gl.readRenderTargetPixels(fboRef.current.currentRt, x, y, 1, 1, readBuffer);
      }
      
      const gRef = leaderGroupRefs[idx];
      if (gRef.current) {
         gRef.current.position.set(readBuffer[0], readBuffer[1], readBuffer[2]);
         gRef.current.visible = true;
         
         const domOpacity = Math.min(1.0, (zoomLevelRef.current - 1.2) * 3.0);
         const div = leaderDivRefs[idx].current;
         if (div) {
             div.style.opacity = domOpacity.toFixed(2);
             div.style.color = leaderColors[idx]; // Ensure it stays colored
         }
      }
    } else {
      leaderGroupRefs.forEach((ref, idx) => {
        if (ref.current) ref.current.visible = false;
        const div = leaderDivRefs[idx].current;
        if (div) div.style.opacity = "0";
      });
    }
  });

  if (!fboReady || !fboSettings || !fboRef.current) return null;

  return (
    <group ref={mainGroupRef}>
      {/* 3D Background Environment */}
      <Stars radius={100} depth={50} count={5000} factor={5} saturation={0.5} fade speed={1.5} />
      <Sparkles count={300} scale={150} size={2.5} speed={0.4} opacity={0.3} color="#4285F4" />
      <Sparkles count={150} scale={100} size={2} speed={0.2} opacity={0.3} color="#DB4437" />
      
      {showNeural && (
        <>
          <NeuralWeb audioIntensityRef={audioIntensityRef} />
          <MagneticCell audioIntensityRef={audioIntensityRef} zoomLevelRef={zoomLevelRef} />
        </>
      )}

      <points geometry={fboRef.current.geo} frustumCulled={false}>
        <shaderMaterial
          ref={displayMatRef}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          vertexShader={displayVertexShader}
          fragmentShader={displayFragmentShader}
          uniforms={{
             uPositions: { value: null },
             uTime: { value: 0 },
             uOpacity: { value: 1.0 },
             uHueShift: { value: 0 },
             uAudio: { value: 0 },
             uBass: { value: 0 },
             uMid: { value: 0 },
             uTreble: { value: 0 },
             uDevicePixelRatio: { value: window.devicePixelRatio || 1 },
             uTotalParticles: { value: fboSettings.size * fboSettings.size },
             uZoom: { value: 1.0 },
             uTargetShapeIndex: { value: 0.0 }
          }}
        />
      </points>
      
      {showLeaders && leaderNames.map((name, i) => (
        <group ref={leaderGroupRefs[i]} key={name} visible={false}>
          <Html center distanceFactor={15} zIndexRange={[100, 0]} className="pointer-events-none">
            <div 
              ref={leaderDivRefs[i]}
              style={{ color: leaderColors[i], textShadow: '0 0 4px rgba(0,0,0,0.8)', opacity: 0, transition: 'opacity 0.1s' }}
              className="font-mono text-[9px] tracking-widest font-bold bg-black/50 px-1.5 py-0.5 rounded border border-white/20 backdrop-blur-sm"
            >
              {name}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
