/* ===========================================================
   SENTINEL — App Logic
   Three.js Horizon Hero + GSAP Entrance Animations
   =========================================================== */

(function () {
  'use strict';

  // ──────────────────────────────────────
  // 1. THREE.JS — Horizon Hero Background
  // ──────────────────────────────────────
  const container = document.getElementById('hero-canvas-container');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020805, 0.018);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 16);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x020805, 1);
  container.appendChild(renderer.domElement);

  // ── Terrain Grid (primary) ──
  const gridSize = 100;
  const gridDivisions = 80;
  const geometry = new THREE.PlaneGeometry(
    gridSize,
    gridSize,
    gridDivisions,
    gridDivisions
  );
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const originalY = new Float32Array(positions.count);
  const originalX = new Float32Array(positions.count);
  const originalZ = new Float32Array(positions.count);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    const y =
      Math.sin(x * 0.12) * 0.8 +
      Math.cos(z * 0.1) * 0.7 +
      Math.sin(dist * 0.06) * 1.2;
    positions.setY(i, y);
    originalY[i] = y;
    originalX[i] = x;
    originalZ[i] = z;
  }
  geometry.computeVertexNormals();

  const terrainMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8d468,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });

  const terrain = new THREE.Mesh(geometry, terrainMaterial);
  terrain.position.y = -3;
  scene.add(terrain);

  // ── Second terrain layer (deeper, slower) ──
  const geo2 = new THREE.PlaneGeometry(120, 120, 50, 50);
  geo2.rotateX(-Math.PI / 2);
  const mat2 = new THREE.MeshBasicMaterial({
    color: 0xb8d468,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });
  const terrain2 = new THREE.Mesh(geo2, mat2);
  terrain2.position.y = -6;
  scene.add(terrain2);

  // ── Particle Field ──
  const particleCount = 3500;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSpeeds = new Float32Array(particleCount);
  const particlePhases = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 100;
    particlePositions[i * 3 + 1] = Math.random() * 35 - 8;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    particleSpeeds[i] = 0.005 + Math.random() * 0.015;
    particlePhases[i] = Math.random() * Math.PI * 2;
  }
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xc8e070,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ── Second particle layer (tiny, fast, dim) ──
  const dustCount = 5000;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 120;
    dustPositions[i * 3 + 1] = Math.random() * 40 - 10;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xb0cc55,
    size: 0.04,
    transparent: true,
    opacity: 0.45,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);

  // ── Orbiting Rings ──
  const rings = [];
  const ringRadii = [8, 14, 22];
  const ringYPositions = [1, -1, 3];
  ringRadii.forEach((radius, idx) => {
    const ringGeo = new THREE.RingGeometry(radius, radius + 0.06, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc8e070,
      transparent: true,
      opacity: 0.1 + idx * 0.03,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 + (idx - 1) * 0.15;
    ring.position.y = ringYPositions[idx];
    scene.add(ring);
    rings.push(ring);
  });

  // ── Glowing Horizon Line ──
  const horizonPoints = [];
  for (let x = -80; x <= 80; x += 0.4) {
    horizonPoints.push(
      new THREE.Vector3(x, Math.sin(x * 0.08) * 0.5, -35)
    );
  }
  const horizonGeometry = new THREE.BufferGeometry().setFromPoints(horizonPoints);
  const horizonMaterial = new THREE.LineBasicMaterial({
    color: 0xd0e880,
    transparent: true,
    opacity: 0.35,
  });
  const horizonLine = new THREE.Line(horizonGeometry, horizonMaterial);
  horizonLine.position.y = -2;
  scene.add(horizonLine);

  // ── Data Stream Lines (vertical, animated) ──
  const dataStreams = [];
  for (let i = 0; i < 12; i++) {
    const streamPoints = [];
    const xPos = (Math.random() - 0.5) * 60;
    const zPos = -15 - Math.random() * 25;
    for (let y = -8; y <= 20; y += 0.3) {
      streamPoints.push(new THREE.Vector3(xPos + Math.sin(y * 0.5) * 0.3, y, zPos));
    }
    const streamGeo = new THREE.BufferGeometry().setFromPoints(streamPoints);
    const streamMat = new THREE.LineBasicMaterial({
      color: 0xa4be5c,
      transparent: true,
      opacity: 0.0,
    });
    const stream = new THREE.Line(streamGeo, streamMat);
    scene.add(stream);
    dataStreams.push({ mesh: stream, material: streamMat, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5 });
  }

  // ── Horizontal scan lines ──
  for (let i = 0; i < 6; i++) {
    const linePoints = [];
    const yPos = (Math.random() - 0.5) * 10;
    for (let x = -50; x <= 50; x += 0.5) {
      linePoints.push(new THREE.Vector3(x, yPos, -25 - Math.random() * 5));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xb8d468,
      transparent: true,
      opacity: 0.06,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
  }

  // ── Ambient light (dimmer) ──
  const ambientLight = new THREE.AmbientLight(0xa4be5c, 0.25);
  scene.add(ambientLight);

  // ── Mouse interaction ──
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Animation Loop ──
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.008;

    // Smooth mouse follow
    mouseX += (targetMouseX - mouseX) * 0.015;
    mouseY += (targetMouseY - mouseY) * 0.015;

    // Camera auto-drift + mouse follow
    const autoDriftX = Math.sin(time * 0.3) * 2;
    const autoDriftY = Math.cos(time * 0.2) * 0.8;
    camera.position.x = autoDriftX + mouseX * 1.8;
    camera.position.y = 5 + autoDriftY + mouseY * 0.6;
    camera.position.z = 16 + Math.sin(time * 0.15) * 1.5;
    camera.lookAt(Math.sin(time * 0.1) * 0.5, 0.5, 0);

    // ── Animate terrain vertices (multi-frequency waves) ──
    const pos = terrain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = originalX[i];
      const z = originalZ[i];
      const wave1 = Math.sin(time * 1.5 + x * 0.2 + z * 0.15) * 0.35;
      const wave2 = Math.cos(time * 0.8 + x * 0.08 - z * 0.12) * 0.5;
      const wave3 = Math.sin(time * 2.5 + (x + z) * 0.1) * 0.15;
      pos.setY(i, originalY[i] + wave1 + wave2 + wave3);
    }
    pos.needsUpdate = true;

    // ── Animate second terrain (slow roll) ──
    const pos2 = terrain2.geometry.attributes.position;
    for (let i = 0; i < pos2.count; i++) {
      const x = pos2.getX(i);
      const z = pos2.getZ(i);
      pos2.setY(i, Math.sin(time * 0.4 + x * 0.05 + z * 0.04) * 1.5);
    }
    pos2.needsUpdate = true;

    // ── Animate particles (lateral drift + rise) ──
    const pPos = particles.geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      let x = pPos.getX(i);
      let y = pPos.getY(i);
      let z = pPos.getZ(i);

      y += particleSpeeds[i];
      x += Math.sin(time + particlePhases[i]) * 0.008;
      z += Math.cos(time * 0.7 + particlePhases[i]) * 0.006;

      if (y > 28) { y = -8; x = (Math.random() - 0.5) * 100; z = (Math.random() - 0.5) * 100; }

      pPos.setX(i, x);
      pPos.setY(i, y);
      pPos.setZ(i, z);
    }
    pPos.needsUpdate = true;
    particles.rotation.y = time * 0.03;

    // ── Animate dust layer ──
    dustParticles.rotation.y = -time * 0.02;
    dustParticles.rotation.x = Math.sin(time * 0.1) * 0.05;

    // ── Animate orbiting rings ──
    rings.forEach((ring, idx) => {
      const speed = 0.15 + idx * 0.08;
      ring.rotation.z = time * speed;
      ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.3 + idx) * 0.2;
      ring.material.opacity = 0.08 + Math.sin(time * 1.5 + idx * 2) * 0.06;
    });

    // ── Animate data streams (pulse in and out) ──
    dataStreams.forEach((stream) => {
      const pulse = Math.sin(time * stream.speed + stream.phase);
      stream.material.opacity = pulse > 0.4 ? (pulse - 0.4) * 0.4 : 0;
    });

    // ── Pulse horizon ──
    horizonMaterial.opacity = 0.3 + Math.sin(time * 2) * 0.12;

    // ── Subtle terrain material pulse ──
    terrainMaterial.opacity = 0.15 + Math.sin(time * 1.2) * 0.06;

    renderer.render(scene, camera);
  }
  animate();

  // ── Resize Handler ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ────────────────────────────────────
  // 2. GSAP — Entrance Animations
  // ────────────────────────────────────

  // Timeline for hero entrance
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  // Title
  tl.to('#hero-title', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    delay: 0.3,
  });

  // Subtitle
  tl.to(
    '#hero-subtitle',
    {
      opacity: 1,
      y: 0,
      duration: 1,
    },
    '-=0.8'
  );

  // Feature Pills — staggered slide up
  tl.to(
    '.pill',
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.15,
    },
    '-=0.5'
  );

  // CTA Button
  tl.to(
    '.cta-button',
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
    },
    '-=0.4'
  );

  // Set initial states  (GSAP fromTo pattern)
  gsap.set('#hero-title', { y: 40, opacity: 0 });
  gsap.set('#hero-subtitle', { y: 30, opacity: 0 });
  gsap.set('.pill', { y: 60, opacity: 0 });
  gsap.set('.cta-button', { y: 30, opacity: 0 });

  // Re-run the timeline (since we set states after defining it)
  tl.restart();

  // ────────────────────────────────────
  // 3. Navbar Scroll Effect
  // ────────────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // ────────────────────────────────────
  // 4. Nav Link Active State
  // ────────────────────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
})();
