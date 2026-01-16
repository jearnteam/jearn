"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useScrollBus } from "./ScrollContext";

export default function ThreeBall() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const { subscribe } = useScrollBus();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 🛑 WebGL support check
    const testCanvas = document.createElement("canvas");
    const testCtx =
      testCanvas.getContext("webgl") ||
      testCanvas.getContext("experimental-webgl");
    if (!testCtx) return;

    /* -------------------------
     * THREE SETUP
     * ----------------------- */
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;

    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
    }

    const renderer = rendererRef.current;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* -------------------------
     * GEOMETRY
     * ----------------------- */
    let hue = Math.random() * 360;

    const geometry = new THREE.TetrahedronGeometry(6);
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      transparent: true,
      opacity: 1,
    });

    const wireShape = new THREE.LineSegments(
      wireframeGeometry,
      wireMaterial
    );
    scene.add(wireShape);

    /* -------------------------
     * PHYSICS STATE
     * ----------------------- */
    let spinVelocityX = 0;
    let spinVelocityY = 0;

    const sensitivity = 0.0002;
    const friction = 0.925;
    const minVelocity = 0.0001;

    const updateColor = (amount: number) => {
      hue = (hue + amount) % 360;
      wireMaterial.color.setHSL(hue / 360, 1, 0.5);
    };

    /* -------------------------
     * SCROLL SUBSCRIPTION ✅
     * ----------------------- */
    const unsubscribe = subscribe((delta) => {
      if (delta === 0) return;

      spinVelocityY += delta * sensitivity;
      spinVelocityX += delta * sensitivity * 0.5;

      updateColor(delta * 0.3);
    });

    /* -------------------------
     * RENDER LOOP
     * ----------------------- */
    let rafId = 0;

    const render = () => {
      rafId = requestAnimationFrame(render);

      wireShape.rotation.y += spinVelocityY;
      wireShape.rotation.x += spinVelocityX;

      spinVelocityX *= friction;
      spinVelocityY *= friction;

      if (Math.abs(spinVelocityX) < minVelocity) spinVelocityX = 0;
      if (Math.abs(spinVelocityY) < minVelocity) spinVelocityY = 0;

      renderer.render(scene, camera);
    };

    render();

    /* -------------------------
     * CLEANUP
     * ----------------------- */
    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }

      geometry.dispose();
      wireframeGeometry.dispose();
      wireMaterial.dispose();
      renderer.dispose();
    };
  }, [subscribe]);

  return (
    <div
      ref={mountRef}
      className="w-[50px] h-[50px] flex items-center justify-center"
    />
  );
}
