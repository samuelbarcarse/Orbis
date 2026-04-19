// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Stable NASA-derived earth texture hosted by threejs.org examples CDN.
const EARTH_TEXTURE = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

const latLngToVec3 = (lat, lng, radius) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
};

const riskColor = (level) => {
  switch (level) {
    case 'critical': return 0xff4d6d;
    case 'high': return 0xffa94d;
    case 'moderate': return 0x4fc3f7;
    case 'low': return 0x34d399;
    default: return 0x93c5fd;
  }
};

// Subsolar point (where the sun is directly overhead) for the given UTC time.
const sunDirection = (date = new Date()) => {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const sunLng = -((utcHours - 12) * 15);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const sunLat = 23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);
  return latLngToVec3(sunLat, sunLng, 1).normalize();
};

export default function Globe({ regions = [], alerts = [], activeLayers = [], onRegionClick, onHoverRegion }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({ cleanup: null });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030815);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xa9c6ff,
      size: 0.07,
      transparent: true,
      opacity: 0.7,
    })));

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.4, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Earth
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const earthTex = loader.load(EARTH_TEXTURE);
    earthTex.colorSpace = THREE.SRGBColorSpace;

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshPhongMaterial({
        map: earthTex,
        specular: new THREE.Color(0x0e2440),
        shininess: 14,
        emissive: new THREE.Color(0x0a1a35),
        emissiveIntensity: 0.35,
      }),
    );
    scene.add(earth);

    // Atmospheric glow (Fresnel backside)
    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(1.035, 96, 96),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vN;
          void main() {
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vN;
          void main() {
            float i = pow(1.0 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(0.25, 0.55, 0.98, 1.0) * i;
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
      }),
    );
    scene.add(atmos);

    // Lighting — sun direction represents current UTC (day/night terminator)
    scene.add(new THREE.AmbientLight(0x2a3f6a, 0.55));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.25);
    const updateSun = () => {
      const v = sunDirection().multiplyScalar(6);
      sun.position.copy(v);
    };
    updateSun();
    scene.add(sun);
    const sunInterval = setInterval(updateSun, 60_000);

    // Markers — parented to earth so they stay locked to lat/lng
    const markersGroup = new THREE.Group();
    earth.add(markersGroup);
    const pickable = [];

    regions.forEach((r) => {
      if (r.latitude == null || r.longitude == null) return;
      const pos = latLngToVec3(r.latitude, r.longitude, 1.015);
      const color = riskColor(r.risk_level);
      const size = 0.016 + Math.min(0.045, (r.risk_score || 0) / 1800);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(size, 20, 20),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
      );
      dot.position.copy(pos);
      dot.userData = { type: 'region', data: r };
      markersGroup.add(dot);
      pickable.push(dot);

      // Critical zones get a glow halo
      if (r.risk_level === 'critical' || r.risk_level === 'high') {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(size * 2.2, 20, 20),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }),
        );
        halo.position.copy(pos);
        halo.userData = { type: 'halo' };
        markersGroup.add(halo);
      }
    });

    // Vessel alerts
    const showVessels = activeLayers.includes('vessels') || activeLayers.includes('alerts');
    if (showVessels) {
      alerts.forEach((a) => {
        if (a.latitude == null || a.longitude == null) return;
        if (a.status && a.status !== 'active' && a.status !== 'investigating') return;
        const pos = latLngToVec3(a.latitude, a.longitude, 1.011);
        const color = a.severity === 'high' ? 0xff5577 : a.severity === 'medium' ? 0xffb454 : 0xffe066;
        const pt = new THREE.Mesh(
          new THREE.SphereGeometry(0.0085, 12, 12),
          new THREE.MeshBasicMaterial({ color }),
        );
        pt.position.copy(pos);
        markersGroup.add(pt);
      });
    }

    // SAR hotspots layer — cluster rings for regions with many anomalous vessels
    if (activeLayers.includes('hotspots') || activeLayers.includes('sar')) {
      regions
        .filter((r) => (r.anomalous_vessels || 0) >= 10)
        .forEach((r) => {
          const pos = latLngToVec3(r.latitude, r.longitude, 1.02);
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.04, 0.065, 48),
            new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
          );
          ring.position.copy(pos);
          ring.lookAt(new THREE.Vector3(0, 0, 0));
          markersGroup.add(ring);
        });
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.55;
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    // Picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;

    const setMouseFromEvent = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = (e) => {
      setMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      if (hit?.object?.userData?.type === 'region') {
        onRegionClick?.(hit.object.userData.data);
      }
    };

    const onMove = (e) => {
      setMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      const region = hit?.object?.userData?.data ?? null;
      if (region !== hovered) {
        hovered = region;
        onHoverRegion?.(region);
        renderer.domElement.style.cursor = region ? 'pointer' : 'grab';
      }
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.style.cursor = 'grab';

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current.cleanup = () => {
      cancelAnimationFrame(frameId);
      clearInterval(sunInterval);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('pointermove', onMove);
      controls.dispose();
      renderer.dispose();
      earthTex.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };

    return () => sceneRef.current.cleanup?.();
  }, [regions, alerts, activeLayers, onRegionClick, onHoverRegion]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
