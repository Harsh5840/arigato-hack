'use client';

import {useEffect, useRef, useState} from 'react';

/*
 * The verified cartridge, rebuilt in code from the Anatomy "proof press" render
 * (design/anatomy/proof-press/reference-verify.png): a bearing tray, a package block,
 * an inset label panel, a pull bar and four bearing shoes. The ring and its four satellites
 * stand for the four authorities in the pipeline, in the same lane colours as the flow.
 * Everything is procedural, no external model or texture.
 */
const LANES = {controller: 0x1f6f9f, agent: 0x3347c9, verifier: 0xb4552f, human: 0x8a3a5c} as const;

export default function ProofCore({className}: {className?: string}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const {RoundedBoxGeometry} = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
      const {RoomEnvironment} = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed) return;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // The scene is drawn off-screen at twice the character grid, averaged down, and written as glyphs:
      // brighter surfaces become denser characters. Sized from the real font metrics so it fills the stage.
      const RAMP = ' .:-=+*#%@';
      const pre = document.createElement('pre');
      pre.className = 'how-ascii';
      pre.setAttribute('aria-hidden', 'true');
      el.appendChild(pre);
      const sample = document.createElement('canvas');
      const sampler = sample.getContext('2d', {willReadFrequently: true})!;
      let cols = 80, rows = 40;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.35;
      const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
      camera.position.set(8.2, 6.6, 8.7);
      camera.lookAt(0, 0.9, 0);

      const key = new THREE.DirectionalLight(0xffffff, 3.2);
      key.position.set(4, 8, 5);
      scene.add(key, new THREE.HemisphereLight(0xffffff, 0x777f6a, 0.25));

      const paper = new THREE.MeshPhysicalMaterial({color: 0xd4d7cd, roughness: 0.42, metalness: 0.04, clearcoat: 0.5, clearcoatRoughness: 0.35});
      const steel = new THREE.MeshPhysicalMaterial({color: 0xc9cdc4, roughness: 0.32, metalness: 0.85});
      const ink = new THREE.MeshStandardMaterial({color: 0x23281d, roughness: 0.55, metalness: 0.1});
      const accent = new THREE.MeshPhysicalMaterial({color: LANES.agent, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x101a55, emissiveIntensity: 0.45});

      const core = new THREE.Group();
      scene.add(core);
      const part = (geometry: import('three').BufferGeometry, material: import('three').Material, x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        core.add(mesh);
        return mesh;
      };
      const box = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r);

      // tray, package block, and the reveal seam between them
      part(box(3.8, 0.36, 3, 0.1), steel, 0, 0.18, 0);
      part(box(3.0, 1.5, 2.0, 0.14), paper, 0, 1.11, 0);
      part(box(3.06, 0.05, 2.06, 0.02), ink, 0, 0.9, 0);
      // inset label panel on top, with three printed rules
      part(box(2.5, 0.05, 1.5, 0.05), ink, 0, 1.88, 0);
      for (const [i, w] of [1.9, 1.5, 1.1].entries()) part(box(w, 0.025, 0.07, 0.01), steel, -0.2 - (1.9 - w) / 2 + 0.2, 1.925, -0.5 + i * 0.25);
      // verified check mark, extruded from a shape
      const mark = new THREE.Shape();
      mark.moveTo(-0.34, 0.02); mark.lineTo(-0.2, -0.12); mark.lineTo(-0.06, 0.04); mark.lineTo(0.3, -0.34);
      mark.lineTo(0.44, -0.2); mark.lineTo(-0.06, 0.32); mark.closePath();
      const check = part(new THREE.ExtrudeGeometry(mark, {depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3}), accent, 0.68, 1.92, 0.24);
      check.rotation.x = -Math.PI / 2;
      // pull bar and four bearing shoes
      part(box(1.5, 0.24, 0.26, 0.08), steel, 0, 0.42, 1.62);
      for (const sx of [-1.35, 1.35]) for (const sz of [-1.0, 1.0]) part(box(0.8, 0.22, 0.5, 0.06), ink, sx, -0.1, sz);

      // the four-authority ring with satellites
      const ring = new THREE.Group();
      ring.rotation.set(0.28, 0, -0.18);
      ring.position.y = 1.1;
      core.add(ring);
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.022, 12, 160), steel));
      const satellites = Object.values(LANES).map((color, i) => {
        const holder = new THREE.Group();
        holder.rotation.y = (i / 4) * Math.PI * 2;
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 32, 24),
          new THREE.MeshPhysicalMaterial({color, roughness: 0.25, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1}),
        );
        ball.position.x = 3.05;
        holder.add(ball);
        ring.add(holder);
        return holder;
      });

      // soft contact shadow, drawn from a radial gradient so no shadow map is needed
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 128;
      const g = shadowCanvas.getContext('2d')!;
      const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, 'rgba(35,45,25,0.22)');
      grad.addColorStop(1, 'rgba(35,45,25,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false}));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -0.36;
      scene.add(shadow);

      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let pointer = {x: 0, y: 0};
      let tilt = {x: 0, y: 0};
      let t0 = performance.now();
      let raf = 0;
      let visible = true;

      const size = () => {
        const w = el.clientWidth || 600;
        const h = el.clientHeight || 520;
        const font = w < 560 ? 7.5 : w < 900 ? 8.5 : 9.5;
        cols = Math.max(24, Math.floor(w / (font * 0.6)));
        rows = Math.max(12, Math.floor(h / font));
        pre.style.fontSize = font + 'px';
        pre.style.lineHeight = font + 'px';
        renderer.setSize(cols * 2, rows * 2, false);
        sample.width = cols;
        sample.height = rows;
        camera.aspect = w / h;
        camera.fov = w / h < 0.85 ? 34 : 26;
        camera.updateProjectionMatrix();
      };
      const frame = (now: number) => {
        const dt = Math.min((now - t0) / 1000, 0.05);
        t0 = now;
        const time = now / 1000;
        tilt.x += (pointer.x - tilt.x) * (1 - Math.exp(-dt / 0.18));
        tilt.y += (pointer.y - tilt.y) * (1 - Math.exp(-dt / 0.18));
        core.rotation.y = -0.5 + tilt.x * 0.55 + (calm ? 0 : Math.sin(time * 0.35) * 0.12);
        core.rotation.x = tilt.y * 0.18;
        core.position.y = calm ? 0 : Math.sin(time * 0.9) * 0.07;
        satellites.forEach((s, i) => (s.rotation.y = (i / 4) * Math.PI * 2 + (calm ? 0 : time * 0.28)));
        renderer.render(scene, camera);
        sampler.clearRect(0, 0, cols, rows);
        sampler.drawImage(renderer.domElement, 0, 0, cols, rows);
        const px = sampler.getImageData(0, 0, cols, rows).data;
        const lines: string[] = [];
        for (let y = 0; y < rows; y++) {
          let line = '';
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const lum = Math.pow(((px[i] + px[i + 1] + px[i + 2]) / 765) * (px[i + 3] / 255), 0.9);
            line += RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length * 1.08))];
          }
          lines.push(line);
        }
        pre.textContent = lines.join('\n');
        raf = visible && !calm ? requestAnimationFrame(frame) : 0;
      };
      const start = () => { if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(frame); } };

      const onMove = (e: PointerEvent) => {
        const b = el.getBoundingClientRect();
        pointer = {x: ((e.clientX - b.left) / b.width - 0.5) * 2, y: ((e.clientY - b.top) / b.height - 0.5) * 2};
        if (calm) requestAnimationFrame(frame);
      };
      const observer = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; if (visible) start(); });
      const resizer = new ResizeObserver(() => { size(); if (calm) requestAnimationFrame(frame); });
      observer.observe(el);
      resizer.observe(el);
      el.addEventListener('pointermove', onMove);
      size();
      start();
      if (calm) requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        resizer.disconnect();
        el.removeEventListener('pointermove', onMove);
        scene.traverse(object => {
          const mesh = object as import('three').Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material as import('three').Material | import('three').Material[] | undefined;
          (Array.isArray(material) ? material : material ? [material] : []).forEach(m => m.dispose());
        });
        pmrem.dispose();
        renderer.dispose();
        pre.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  return <div ref={host} className={className} role="img" aria-label="A verified dependency cartridge ringed by four satellites: controller, AI agents, hosted verifier and human reviewer.">
    {failed && <div className="how-core-fallback">3D view unavailable in this browser</div>}
  </div>;
}
