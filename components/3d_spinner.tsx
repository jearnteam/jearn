"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 🛑 Check if WebGL is supported
    const testCanvas = document.createElement("canvas");
    const testCtx =
      testCanvas.getContext("webgl") ||
      testCanvas.getContext("experimental-webgl");
    if (!testCtx) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;

    // 🔒 Create ONLY ONE renderer
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

    // 🌈 random hue
    let hue = Math.random() * 360;

    const geometry = new THREE.TetrahedronGeometry(6);
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      transparent: true,
      opacity: 1,
    });
    const wireShape = new THREE.LineSegments(wireframeGeometry, wireMaterial);
    scene.add(wireShape);

    const updateColor = (amount: number) => {
      hue = (hue + amount) % 360;
      wireMaterial.color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    };

    let spinVelocityX = 0;
    let spinVelocityY = 0;

    const sensitivity = 0.00025;
    const friction = 0.985;
    const minVelocity = 0.0001;

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      spinVelocityY += delta * sensitivity;
      spinVelocityX += delta * sensitivity * 0.5;

      updateColor(delta * 0.3);

      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll);

    const render = () => {
      requestAnimationFrame(render);

      wireShape.rotation.y += spinVelocityY;
      wireShape.rotation.x += spinVelocityX;

      spinVelocityX *= friction;
      spinVelocityY *= friction;

      if (Math.abs(spinVelocityX) < minVelocity) spinVelocityX = 0;
      if (Math.abs(spinVelocityY) < minVelocity) spinVelocityY = 0;

      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }

      // 🧹 FREE GPU MEMORY
      renderer.dispose();
      geometry.dispose();
      wireframeGeometry.dispose();
      wireMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-[50px] h-[50px] flex items-center justify-center"
    />
  );
}
