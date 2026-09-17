'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Rotate3D } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';

/** Client component: can also be imported directly by a Next.js App Router page. */
export default function RotatingContainer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<((play: boolean) => void) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    // Load WebGL only in the browser, keeping the server render independent of it.
    void import('three').then(async (THREE) => {
      if (disposed) return;
      let gpu: InstanceType<typeof THREE.WebGLRenderer> | undefined;
      let renderer: InstanceType<typeof THREE.WebGLRenderer> | SVGRenderer;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', { antialias: true, alpha: true });
      if (context) {
        gpu = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
        renderer = gpu;
      } else {
        // Project the same 3D geometry to vector paths when WebGL is unavailable.
        const { SVGRenderer } = await import('three/addons/renderers/SVGRenderer.js');
        if (disposed) return;
        renderer = new SVGRenderer();
        renderer.setQuality('high');
        renderer.setClearColor(new THREE.Color(0xeff5f3), 1);
      }
      const scene = new THREE.Scene();
      const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
      const materials: InstanceType<typeof THREE.Material>[] = [];
      let observer: ResizeObserver | undefined;
      let intersection: IntersectionObserver | undefined;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let run = !motion.matches;
      let visible = true;
      let contextLost = false;
      let lastTime: number | null = null;
      let animationId = 0;

      cleanup = () => {
        cancelAnimationFrame(animationId);
        observer?.disconnect();
        intersection?.disconnect();
        motion.removeEventListener('change', onMotionChange);
        document.removeEventListener('visibilitychange', syncLoop);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        gpu?.dispose();
        renderer.domElement.remove();
        controlRef.current = null;
      };

      if (gpu) {
        gpu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        gpu.setClearColor(0xeff5f3, 0);
        gpu.outputColorSpace = THREE.SRGBColorSpace;
        gpu.toneMapping = THREE.ACESFilmicToneMapping;
        gpu.toneMappingExposure = 1.3;
      }
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.setAttribute('aria-label', 'Modelo 3D de um contêiner verde com paredes corrugadas e portas metálicas.');
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 3.5, 10);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xe6f4ed, gpu ? 2 : 0.9));
      const key = new THREE.DirectionalLight(0xffffff, gpu ? 3.8 : 0.9);
      key.position.set(-4, 7, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xa2dacc, gpu ? 2 : 0.4);
      rim.position.set(5, 3, -5);
      scene.add(rim);

      const container = new THREE.Group();
      container.rotation.y = -0.55;
      scene.add(container);
      const paint = new THREE.MeshStandardMaterial({ color: 0x167b63, roughness: 0.42, metalness: 0.3 });
      const ribs = new THREE.MeshStandardMaterial({ color: 0x238e73, roughness: 0.48, metalness: 0.3 });
      const frame = new THREE.MeshStandardMaterial({ color: 0x105341, roughness: 0.4, metalness: 0.45 });
      const steel = new THREE.MeshStandardMaterial({ color: 0xb5c5c0, roughness: 0.26, metalness: 0.65 });
      const seam = new THREE.MeshStandardMaterial({ color: 0x103d32, roughness: 0.65 });
      materials.push(paint, ribs, frame, steel, seam);

      function box(w: number, h: number, d: number, x: number, y: number, z: number, material: InstanceType<typeof THREE.Material>) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        container.add(mesh);
        return mesh;
      }

      // A compact shipping-container model with corrugation, corner castings and locking bars.
      box(4.15, 1.62, 1.64, 0, 0, 0, paint);
      for (const z of [-0.835, 0.835]) {
        for (let i = 0; i < 23; i++) box(0.074, 1.44, 0.048, -1.92 + i * 0.175, 0, z, ribs);
        for (const y of [-0.84, 0.84]) box(4.3, 0.105, 0.105, 0, y, z, frame);
      }
      for (let i = 0; i < 23; i++) box(0.074, 0.04, 1.49, -1.92 + i * 0.175, 0.827, 0, ribs);
      for (const x of [-2.09, 2.09]) {
        for (const z of [-0.83, 0.83]) {
          box(0.13, 1.75, 0.13, x, 0, z, frame);
          for (const y of [-0.825, 0.825]) box(0.19, 0.17, 0.18, x, y, z, steel);
        }
        for (const y of [-0.84, 0.84]) box(0.12, 0.105, 1.7, x, y, 0, frame);
      }
      // Rear wall and two end doors on the opposite end.
      for (let i = 0; i < 9; i++) box(0.035, 1.44, 0.065, -2.093, 0, -0.68 + i * 0.17, ribs);
      box(0.045, 1.5, 0.025, 2.104, 0, 0, seam);
      for (const z of [-0.6, -0.2, 0.2, 0.6]) {
        box(0.045, 1.41, 0.035, 2.14, 0, z, steel);
        for (const y of [-0.53, 0.53]) box(0.07, 0.07, 0.09, 2.16, y, z, frame);
        box(0.065, 0.045, 0.17, 2.18, -0.2, z, steel);
      }

      const render = () => renderer.render(scene, camera);
      function animate(time: number) {
        if (disposed || contextLost || !run || !visible || document.hidden) return;
        animationId = requestAnimationFrame(animate);
        if (!gpu && lastTime !== null && time - lastTime < 32) return;
        const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        container.rotation.y = (container.rotation.y + delta * 0.38) % (Math.PI * 2);
        render();
      }
      function syncLoop() {
        if (disposed || contextLost) return;
        lastTime = null;
        cancelAnimationFrame(animationId);
        if (run && visible && !document.hidden) animationId = requestAnimationFrame(animate);
        render();
      }
      function onMotionChange() {
        run = !motion.matches;
        setPlaying(run);
        syncLoop();
      }
      function onContextLost(event: Event) {
        event.preventDefault();
        contextLost = true;
        cancelAnimationFrame(animationId);
        setStatus('error');
        setPlaying(false);
      }

      controlRef.current = (play) => {
        run = play;
        setPlaying(play);
        syncLoop();
      };
      observer = new ResizeObserver(() => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        // Fit the complete model at every angle, even in the narrow sidebar.
        const distance = 2.75 / Math.tan(THREE.MathUtils.degToRad(16)) / Math.min(camera.aspect, 1);
        camera.position.set(0, distance * 0.32, distance);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        if (gpu) gpu.setSize(width, height, false);
        else renderer.setSize(width, height);
        render();
      });
      observer.observe(host);
      intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncLoop();
      });
      intersection.observe(host);
      motion.addEventListener('change', onMotionChange);
      document.addEventListener('visibilitychange', syncLoop);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      setPlaying(run);
      setStatus('ready');
      syncLoop();
    }).catch((error: unknown) => {
      cleanup();
      if (!disposed) {
        console.error('Container 3D unavailable:', error);
        setStatus('error');
      }
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <section className="container-viewer" aria-label="Visualização do contêiner em 3D">
      <div className="container-viewer-heading">
        <span><Rotate3D size={17} />Contêiner 3D</span>
        <Button type="button" variant="ghost" size="sm" className="container-motion" disabled={status !== 'ready'} onClick={() => controlRef.current?.(!playing)} aria-label={playing ? 'Pausar rotação' : 'Iniciar rotação'}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? 'Pausar' : 'Girar'}
        </Button>
      </div>
      <div className="container-canvas" ref={hostRef}>
        {status === 'loading' && <p className="container-fallback" role="status">Carregando modelo 3D…</p>}
        {status === 'error' && <p className="container-fallback" role="status">A visualização 3D não está disponível neste navegador. O controle do pátio continua funcionando.</p>}
      </div>
      <div className="container-viewer-caption"><span>VISTA 360°</span><span>Modelo ilustrativo</span></div>
    </section>
  );
}
