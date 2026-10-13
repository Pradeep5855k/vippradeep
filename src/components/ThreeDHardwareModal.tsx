import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  X,
  RotateCcw,
  Maximize2,
  Printer,
  Barcode,
  Package,
  Sparkles,
  Volume2,
  Play,
  Pause,
} from 'lucide-react';

interface ThreeDHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModel?: 'pos' | 'scanner' | 'product';
  productName?: string;
  productPrice?: number;
}

export const ThreeDHardwareModal: React.FC<ThreeDHardwareModalProps> = ({
  isOpen,
  onClose,
  initialModel = 'pos',
  productName = 'Chakki Atta 5kg',
  productPrice = 275,
}) => {
  const [selectedModel, setSelectedModel] = useState<'pos' | 'scanner' | 'product'>(initialModel);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [laserActive, setLaserActive] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentMeshGroupRef = useRef<THREE.Group | null>(null);
  const laserMeshRef = useRef<THREE.Mesh | null>(null);
  const paperMeshRef = useRef<THREE.Mesh | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setSelectedModel(initialModel);
  }, [initialModel]);

  // Setup Three.js scene
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a); // Navy Slate-900

    // Grid Floor
    const grid = new THREE.GridHelper(12, 24, 0x3b82f6, 0x1e293b);
    grid.position.y = -1.6;
    scene.add(grid);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    containerRef.current.replaceChildren(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(5, 10, 7);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    blueRimLight.position.set(-6, 4, -4);
    scene.add(blueRimLight);

    const amberFillLight = new THREE.DirectionalLight(0xf59e0b, 0.8);
    amberFillLight.position.set(4, -2, -2);
    scene.add(amberFillLight);

    // 5. Load model geometry based on selected model
    loadModel(selectedModel, scene);

    // 6. Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (currentMeshGroupRef.current && isAutoRotating) {
        currentMeshGroupRef.current.rotation.y += delta * 0.45;
      }

      // Animate thermal paper roll feeding if POS model
      if (paperMeshRef.current) {
        paperMeshRef.current.position.y = 0.85 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
      }

      // Animate laser glow if scanner model
      if (laserMeshRef.current && laserActive) {
        const mat = laserMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 + Math.sin(clock.getElapsedTime() * 12) * 0.3;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isOpen, selectedModel, isAutoRotating, laserActive]);

  const loadModel = (type: 'pos' | 'scanner' | 'product', scene: THREE.Scene) => {
    if (currentMeshGroupRef.current) {
      scene.remove(currentMeshGroupRef.current);
    }

    const group = new THREE.Group();

    if (type === 'pos') {
      // --- 3D POS THERMAL TERMINAL ---
      // Base Chassis
      const baseGeo = new THREE.BoxGeometry(2.4, 0.9, 3.2);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.3,
        roughness: 0.4,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = -0.4;
      group.add(base);

      // Angled Display Pod
      const displayGeo = new THREE.BoxGeometry(2.1, 1.4, 0.3);
      const displayMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.5,
        roughness: 0.2,
      });
      const displayPod = new THREE.Mesh(displayGeo, displayMat);
      displayPod.position.set(0, 0.7, 0.7);
      displayPod.rotation.x = -Math.PI / 6;
      group.add(displayPod);

      // Glowing Touch Screen with Billing Details
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, 512, 320);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('BILLING PRO POS', 30, 60);
        ctx.font = '24px monospace';
        ctx.fillText(`CUSTOMER: CASH WALK-IN`, 30, 110);
        ctx.fillText(`TOTAL ITEMS: 4`, 30, 150);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 44px monospace';
        ctx.fillText(`₹${productPrice.toFixed(2)}`, 30, 230);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(30, 260, 452, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('CHARGED & PRINT READY', 110, 288);
      }
      const screenTexture = new THREE.CanvasTexture(canvas);
      const screenGeo = new THREE.PlaneGeometry(1.9, 1.2);
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.72, 0.86);
      screen.rotation.x = -Math.PI / 6;
      group.add(screen);

      // Thermal Printer Compartment Hood
      const printerHoodGeo = new THREE.BoxGeometry(1.8, 0.8, 1.4);
      const printerHoodMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
      });
      const printerHood = new THREE.Mesh(printerHoodGeo, printerHoodMat);
      printerHood.position.set(0, 0.35, -0.7);
      group.add(printerHood);

      // Thermal Paper Feeding Out
      const paperGeo = new THREE.PlaneGeometry(1.2, 0.9);
      const paperMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      const paper = new THREE.Mesh(paperGeo, paperMat);
      paper.position.set(0, 0.85, -0.6);
      paper.rotation.x = Math.PI / 4;
      paperMeshRef.current = paper;
      group.add(paper);

      // Status Indicator LED
      const ledGeo = new THREE.SphereGeometry(0.06, 16, 16);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0.9, 0.1, -0.2);
      group.add(led);

    } else if (type === 'scanner') {
      // --- 3D BARCODE LASER SCANNER GUN ---
      // Scanner Gun Head
      const headGeo = new THREE.BoxGeometry(1.4, 1.1, 2.2);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.3,
        metalness: 0.2,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 0.8, 0);
      group.add(head);

      // Scanner Rubber Bumper (Yellow/Orange contrast)
      const bumperGeo = new THREE.BoxGeometry(1.5, 1.2, 0.3);
      const bumperMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 });
      const bumper = new THREE.Mesh(bumperGeo, bumperMat);
      bumper.position.set(0, 0.8, 1.0);
      group.add(bumper);

      // Scanner Glass Window
      const glassGeo = new THREE.PlaneGeometry(1.2, 0.9);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.1,
        metalness: 0.8,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 0.8, 1.16);
      group.add(glass);

      // Red Laser Beam Fan
      const laserGeo = new THREE.ConeGeometry(1.6, 3.2, 16, 1, true);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0xff0044,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      const laser = new THREE.Mesh(laserGeo, laserMat);
      laser.position.set(0, 0.8, 2.7);
      laser.rotation.x = Math.PI / 2;
      laserMeshRef.current = laser;
      group.add(laser);

      // Handle / Grip
      const handleGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.0, 16);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, -0.3, -0.4);
      handle.rotation.x = Math.PI / 8;
      group.add(handle);

      // Trigger
      const triggerGeo = new THREE.BoxGeometry(0.18, 0.4, 0.3);
      const triggerMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const trigger = new THREE.Mesh(triggerGeo, triggerMat);
      trigger.position.set(0, 0.15, 0.05);
      group.add(trigger);

    } else {
      // --- 3D PRODUCT PACKAGE INSPECTOR ---
      // Package Box
      const boxGeo = new THREE.BoxGeometry(1.9, 2.6, 1.2);

      // Generate realistic dynamic texture with product details and barcode
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Front packaging
        ctx.fillStyle = '#0f223d';
        ctx.fillRect(0, 0, 512, 700);

        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 512, 160);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('BILLING PRO', 40, 80);
        ctx.font = '22px sans-serif';
        ctx.fillText('PREMIUM PROVISION STORE', 40, 120);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(productName.substring(0, 18), 40, 240);

        ctx.fillStyle = '#ffffff';
        ctx.font = '26px sans-serif';
        ctx.fillText('100% Pure & Traditional Sortex Cleaned', 40, 300);

        // Price Badge
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(40, 360, 220, 80, 16);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px monospace';
        ctx.fillText(`₹${productPrice}`, 60, 415);

        // Barcode lines at bottom
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(40, 510, 432, 120);
        ctx.fillStyle = '#000000';
        ctx.font = '16px monospace';
        for (let i = 60; i < 440; i += 7) {
          ctx.fillRect(i, 525, (i % 3 === 0 ? 4 : 2), 70);
        }
        ctx.fillText('8 9 0 1 0 3 0 3 8 3 7 4 8', 120, 615);
      }
      const boxTexture = new THREE.CanvasTexture(canvas);
      const boxMat = new THREE.MeshStandardMaterial({
        map: boxTexture,
        roughness: 0.4,
        metalness: 0.1,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 0.1;
      group.add(box);
    }

    currentMeshGroupRef.current = group;
    scene.add(group);
  };

  // Mouse / Touch Drag to Rotate Orbit
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !currentMeshGroupRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    currentMeshGroupRef.current.rotation.y += deltaX * 0.01;
    currentMeshGroupRef.current.rotation.x += deltaY * 0.01;

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const resetView = () => {
    if (currentMeshGroupRef.current) {
      currentMeshGroupRef.current.rotation.set(0, 0, 0);
    }
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 1.2, 5.2);
    }
  };

  const playScannerAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5">
      <div className="w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Interactive 3D Hardware & Product Viewer</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Drag to rotate 360° · Scroll to zoom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model switcher tabs */}
            <div className="hidden sm:flex bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedModel('pos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  selectedModel === 'pos'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Thermal POS</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('scanner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  selectedModel === 'scanner'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Laser Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('product')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  selectedModel === 'product'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>3D Package</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3D WebGL Canvas Viewport */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full h-80 sm:h-[420px] cursor-grab active:cursor-grabbing touch-none select-none bg-slate-950 flex items-center justify-center overflow-hidden"
        >
          {/* Overlay controls */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setIsAutoRotating((prev) => !prev)}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-slate-700 flex items-center gap-1.5 transition"
            >
              {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoRotating ? 'Pause Spin' : 'Auto Spin'}</span>
            </button>

            <button
              type="button"
              onClick={resetView}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Angle</span>
            </button>

            {selectedModel === 'scanner' && (
              <button
                type="button"
                onClick={() => {
                  setLaserActive((prev) => !prev);
                  playScannerAudio();
                }}
                className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-red-500 flex items-center gap-1.5 transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Trigger Laser & Beep</span>
              </button>
            )}
          </div>

          <div className="absolute top-4 right-4 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 pointer-events-none">
            WebGL 60FPS
          </div>
        </div>

        {/* Mobile Model Switcher & Details Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex sm:hidden w-full gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedModel('pos')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center ${
                selectedModel === 'pos' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              POS Terminal
            </button>
            <button
              type="button"
              onClick={() => setSelectedModel('scanner')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center ${
                selectedModel === 'scanner' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Scanner
            </button>
            <button
              type="button"
              onClick={() => setSelectedModel('product')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center ${
                selectedModel === 'product' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              3D Product
            </button>
          </div>

          <div className="text-slate-400 text-center sm:text-left">
            {selectedModel === 'pos' &&
              'Dual LCD POS Billing Counter Machine with thermal receipt paper feeding and USB connectivity.'}
            {selectedModel === 'scanner' &&
              'High-speed 1D/2D QR Barcode Laser Optical Gun with instant trigger and audio feedback.'}
            {selectedModel === 'product' &&
              `Retail product packaging inspection for ${productName} (₹${productPrice}).`}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shrink-0"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
