"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // 🌈 pick a random starting hue
    let hue = Math.random() * 360;

    // 🌀 Geometry
    const geometry = new THREE.TetrahedronGeometry(6);
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      transparent: true,
      opacity: 1,
    });
    const wireShape = new THREE.LineSegments(wireframeGeometry, wireMaterial);
    scene.add(wireShape);

    // 🌈 Color hue control
    const updateColor = (amount: number) => {
      hue = (hue + amount) % 360;
      if (hue < 0) hue += 360;
      wireMaterial.color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    };

    // 🪄 Momentum settings
    let spinVelocityX = 0;
    let spinVelocityY = 0;

    const sensitivity = 0.00025; // how sensitive scroll affects spin
    const friction = 0.985;     // ease-out smoothness
    const minVelocity = 0.0001; // stop jitter when very slow

    // 📜 Scroll interaction
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

    // 🖼️ Render loop with eased momentum
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

    // 🧹 Cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-[50px] h-[50px] flex items-center justify-center"
    />
  );
}
