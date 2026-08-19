import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CyberNetworkCanvasProps {
  intensity?: number;
  interactive?: boolean;
}

export const CyberNetworkCanvas: React.FC<CyberNetworkCanvasProps> = ({
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Determine node count based on screen width for maximum performance on mobile
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 120 : 260;
    const maxDistance = isMobile ? 140 : 165;
    const bounds = { x: 900, y: 600, z: 800 };

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06080d, 0.0012);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      1,
      2000
    );
    camera.position.z = 600;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x06080d, 1);
    container.appendChild(renderer.domElement);

    // Particle nodes data
    const particlesData: Array<{
      velocity: THREE.Vector3;
      numConnections: number;
      baseSpeed: number;
      pulsePhase: number;
    }> = [];

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    const baseCyan = new THREE.Color(0x00f2fe);
    const electricBlue = new THREE.Color(0x0284c7);
    const deepNavy = new THREE.Color(0x0369a1);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * bounds.x * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * bounds.y * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * bounds.z * 2;

      // Color variation: mostly cyan/electric blue, some deeper blue
      const colorChoice = Math.random();
      const nodeColor = colorChoice > 0.4 ? baseCyan : (colorChoice > 0.15 ? electricBlue : deepNavy);
      colors[i3] = nodeColor.r;
      colors[i3 + 1] = nodeColor.g;
      colors[i3 + 2] = nodeColor.b;

      particleSizes[i] = Math.random() * 3.5 + 2.0;

      // Subtle forward drift on some particles toward the viewer
      const zVel = (Math.random() - 0.35) * 0.7;

      particlesData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          zVel
        ),
        numConnections: 0,
        baseSpeed: 0.8 + Math.random() * 0.6,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Node Points Geometry
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    // Custom circle sprite texture for glowing nodes
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.25, 'rgba(0, 242, 254, 0.9)');
      gradient.addColorStop(0.65, 'rgba(2, 132, 199, 0.35)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const pointMaterial = new THREE.PointsMaterial({
      size: 14,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(particlesGeometry, pointMaterial);
    scene.add(pointCloud);

    // Connecting Lines Geometry
    const maxLineSegments = particleCount * 6;
    const linePositions = new Float32Array(maxLineSegments * 6);
    const lineColors = new Float32Array(maxLineSegments * 6);

    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
    linesGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });

    const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
    scene.add(linesMesh);

    // Data packets floating along connections
    const packetCount = isMobile ? 12 : 28;
    const packetPositions = new Float32Array(packetCount * 3);
    const packetGeometry = new THREE.BufferGeometry();
    packetGeometry.setAttribute('position', new THREE.BufferAttribute(packetPositions, 3));

    const packetTextureCanvas = document.createElement('canvas');
    packetTextureCanvas.width = 32;
    packetTextureCanvas.height = 32;
    const pCtx = packetTextureCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.9)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);
    }
    const packetTexture = new THREE.CanvasTexture(packetTextureCanvas);

    const packetMaterial = new THREE.PointsMaterial({
      size: 9,
      map: packetTexture,
      color: 0x38bdf8,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const packetCloud = new THREE.Points(packetGeometry, packetMaterial);
    scene.add(packetCloud);

    // Interactive mouse / touch parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      targetMouseX = (clientX - halfW) * 0.35;
      targetMouseY = (clientY - halfH) * 0.35;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax
      mouseX += (targetMouseX - mouseX) * 0.035;
      mouseY += (targetMouseY - mouseY) * 0.035;

      camera.position.x = mouseX * 0.4;
      camera.position.y = -mouseY * 0.4;
      camera.lookAt(0, 0, 0);

      // Slow orbital rotation of entire scene
      scene.rotation.y = elapsedTime * 0.025;
      scene.rotation.x = Math.sin(elapsedTime * 0.015) * 0.04;

      let vertexPos = 0;
      let colorPos = 0;
      let numConnectedLines = 0;

      for (let i = 0; i < particleCount; i++) {
        particlesData[i].numConnections = 0;
      }

      // Update particle positions
      const posArray = particlesGeometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const pData = particlesData[i];
        const i3 = i * 3;

        posArray[i3] += pData.velocity.x * pData.baseSpeed;
        posArray[i3 + 1] += pData.velocity.y * pData.baseSpeed;
        posArray[i3 + 2] += pData.velocity.z * pData.baseSpeed;

        // Wrap around bounds with gentle bounce or wrap
        if (posArray[i3] < -bounds.x || posArray[i3] > bounds.x) pData.velocity.x = -pData.velocity.x;
        if (posArray[i3 + 1] < -bounds.y || posArray[i3 + 1] > bounds.y) pData.velocity.y = -pData.velocity.y;
        
        // When moving forward toward camera, reset to far back for continuous flow
        if (posArray[i3 + 2] > 400) {
          posArray[i3 + 2] = -bounds.z;
        } else if (posArray[i3 + 2] < -bounds.z) {
          posArray[i3 + 2] = 400;
        }

        // Connect nearby nodes
        for (let j = i + 1; j < particleCount; j++) {
          const jData = particlesData[j];
          if (pData.numConnections >= 4 || jData.numConnections >= 4) continue;

          const j3 = j * 3;
          const dx = posArray[i3] - posArray[j3];
          const dy = posArray[i3 + 1] - posArray[j3 + 1];
          const dz = posArray[i3 + 2] - posArray[j3 + 2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < maxDistance * maxDistance) {
            const dist = Math.sqrt(distSq);
            const alpha = (1.0 - dist / maxDistance) * 0.45;

            // Line segment positions
            linePositions[vertexPos++] = posArray[i3];
            linePositions[vertexPos++] = posArray[i3 + 1];
            linePositions[vertexPos++] = posArray[i3 + 2];

            linePositions[vertexPos++] = posArray[j3];
            linePositions[vertexPos++] = posArray[j3 + 1];
            linePositions[vertexPos++] = posArray[j3 + 2];

            // Color gradient for line
            const intensity = alpha;
            lineColors[colorPos++] = 0.0 * intensity;
            lineColors[colorPos++] = 0.85 * intensity;
            lineColors[colorPos++] = 1.0 * intensity;

            lineColors[colorPos++] = 0.05 * intensity;
            lineColors[colorPos++] = 0.55 * intensity;
            lineColors[colorPos++] = 0.95 * intensity;

            numConnectedLines++;
            pData.numConnections++;
            jData.numConnections++;
          }
        }
      }

      // Update packet positions along random node paths
      const packetArray = packetGeometry.attributes.position.array as Float32Array;
      for (let k = 0; k < packetCount; k++) {
        const k3 = k * 3;
        const targetNodeIndex = (k * 7 + Math.floor(elapsedTime * 2)) % particleCount;
        const targetNodeIndex2 = (targetNodeIndex + 1) % particleCount;

        const t = (Math.sin(elapsedTime * 3 + k * 1.5) + 1) / 2;
        const n1_3 = targetNodeIndex * 3;
        const n2_3 = targetNodeIndex2 * 3;

        packetArray[k3] = posArray[n1_3] * (1 - t) + posArray[n2_3] * t;
        packetArray[k3 + 1] = posArray[n1_3 + 1] * (1 - t) + posArray[n2_3 + 1] * t;
        packetArray[k3 + 2] = posArray[n1_3 + 2] * (1 - t) + posArray[n2_3 + 2] * t;
      }

      particlesGeometry.attributes.position.needsUpdate = true;
      linesGeometry.attributes.position.needsUpdate = true;
      linesGeometry.attributes.color.needsUpdate = true;
      linesGeometry.setDrawRange(0, numConnectedLines * 2);
      packetGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      particlesGeometry.dispose();
      pointMaterial.dispose();
      linesGeometry.dispose();
      lineMaterial.dispose();
      packetGeometry.dispose();
      packetMaterial.dispose();
      texture.dispose();
      packetTexture.dispose();
      renderer.dispose();
    };
  }, [interactive]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Cyber Grid Texture Overlay */}
      <div className="absolute inset-0 cyber-grid-pattern opacity-40 mix-blend-screen pointer-events-none" />

      {/* Lightweight Scanlines */}
      <div className="absolute inset-0 cyber-scanlines opacity-20 pointer-events-none" />

      {/* Dark Vignette Overlay for Readability */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(6, 8, 13, 0.45) 0%, rgba(6, 8, 13, 0.85) 65%, rgba(4, 5, 8, 0.98) 100%)'
        }}
      />

      {/* Atmospheric Ambient Glow Accents in Corners */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[32rem] h-[32rem] bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
