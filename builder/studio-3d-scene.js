/* Nebula bouquet studio — original procedural botanical models, rendered locally. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fract = value => value - Math.floor(value);
  const random = seed => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
  const COLORS = {
    red: '#a72e48', pink: '#e8a0b2', white: '#fff9ed', cream: '#f2d7ac',
    violet: '#aa86bb', yellow: '#f4ce65', orange: '#ea9866', peach: '#efb99f',
    blue: '#8baacf', purple: '#aa86bb'
  };

  class Nebula3DScene {
    constructor(options) {
      this.canvas = options.canvas;
      this.onSelect = options.onSelect || function () {};
      this.onReady = options.onReady || function () {};
      this.onError = options.onError || function () {};
      this.disposed = false;
      this.autoRotate = false;
      this.listeners = [];
      this.geometries = new Map();
      this.materials = new Map();
      this.transientGeometries = [];
      this.pointers = new Map();
      this.flowerGroups = new Map();
      this.pickTargets = [];
      this.selected = null;
      this.frame = 0;
      this.lastTime = 0;
      this.dirty = true;
      try {
        if (!window.THREE) throw new Error('The 3D renderer could not load.');
        this.T = window.THREE;
        this.init();
        this.bindControls();
        this.resize();
        this.tick(0);
        this.onReady();
      } catch (error) {
        this.failed = true;
        this.onError(error);
      }
    }

    init() {
      const T = this.T;
      this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.renderer.setClearColor(0xf4f1e9, 0);
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(36, 1, 0.1, 80);
      this.target = new T.Vector3(0, 2.18, 0);
      this.orbit = { theta: 0.2, phi: 1.08, radius: 9.4 };
      this.destination = { ...this.orbit };
      this.scene.add(new T.HemisphereLight(0xfffaf0, 0xa1ad96, 1.8));
      const key = new T.DirectionalLight(0xfff4e3, 2.5);
      key.position.set(-3.5, 8, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = key.shadow.camera.bottom = -4.5;
      key.shadow.camera.right = key.shadow.camera.top = 4.5;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 18;
      key.shadow.normalBias = 0.025;
      key.shadow.bias = -0.0003;
      key.shadow.radius = 4;
      this.scene.add(key);
      const fill = new T.DirectionalLight(0xf0f6ff, 1.0);
      fill.position.set(5, 4, -2);
      this.scene.add(fill);
      const rim = new T.DirectionalLight(0xffe6d5, 1.2);
      rim.position.set(-2, 5, -5);
      this.scene.add(rim);
      this.bouquet = new T.Group();
      this.scene.add(this.bouquet);

      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 128;
      const context = shadowCanvas.getContext('2d');
      const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(55, 61, 44, 0.26)');
      gradient.addColorStop(0.3, 'rgba(55, 61, 44, 0.15)');
      gradient.addColorStop(1, 'rgba(55, 61, 44, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      this.shadowTexture = new T.CanvasTexture(shadowCanvas);
      this.contactShadow = new T.Mesh(this.geometry('floor', () => new T.PlaneGeometry(4.3, 3.5)), this.material('floor', () => new T.MeshBasicMaterial({ map: this.shadowTexture, transparent: true, depthWrite: false })));
      this.contactShadow.rotation.x = -Math.PI / 2;
      this.contactShadow.position.y = 0.025;
      this.scene.add(this.contactShadow);
      this.selectionHalo = new T.Mesh(this.geometry('selection', () => new T.TorusGeometry(0.57, 0.012, 5, 64)), this.material('selection', () => new T.MeshBasicMaterial({ color: '#ac8055', transparent: true, opacity: 0.84, depthTest: false })));
      this.selectionHalo.rotation.x = Math.PI / 2;
      this.selectionHalo.visible = false;
      this.selectionHalo.renderOrder = 8;
      this.scene.add(this.selectionHalo);
      this.raycaster = new T.Raycaster();
      this.pointerPosition = new T.Vector2();
      this.canvas.style.touchAction = 'none';
      if (!this.canvas.hasAttribute('tabindex')) this.canvas.tabIndex = 0;
      this.canvas.setAttribute('aria-label', 'Interactive 3D bouquet. Drag to rotate, scroll to zoom, or use the arrow keys.');
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }

    geometry(key, factory) {
      if (!this.geometries.has(key)) this.geometries.set(key, factory());
      return this.geometries.get(key);
    }

    material(key, factory) {
      if (!this.materials.has(key)) this.materials.set(key, factory());
      return this.materials.get(key);
    }

    surface(fn, nu, nv) {
      const T = this.T;
      const positions = [], colors = [], indices = [];
      for (let j = 0; j <= nv; j++) {
        for (let i = 0; i <= nu; i++) {
          const point = fn(i / nu, j / nv);
          positions.push(point[0], point[1], point[2]);
          const shade = point[3] === undefined ? 1 : point[3];
          colors.push(shade, shade, shade);
        }
      }
      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i, b = a + nu + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    merge(parts) {
      const T = this.T;
      const positions = [], normals = [], colors = [];
      for (const geometry of parts) {
        const flat = geometry.index ? geometry.toNonIndexed() : geometry;
        positions.push(...flat.attributes.position.array);
        normals.push(...flat.attributes.normal.array);
        if (flat.attributes.color) colors.push(...flat.attributes.color.array);
        else for (let i = 0; i < flat.attributes.position.count; i++) colors.push(1, 1, 1);
        if (flat !== geometry) flat.dispose();
        geometry.dispose();
      }
      const merged = new T.BufferGeometry();
      merged.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      merged.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
      merged.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      merged.computeBoundingSphere();
      return merged;
    }

    roseGeometry(ruffled) {
      return this.geometry(ruffled ? 'carnation' : 'rose', () => {
        const parts = [];
        const rings = ruffled
          ? [[11, 0.48, 0.23], [9, 0.38, 0.32], [8, 0.28, 0.39], [6, 0.18, 0.42], [4, 0.09, 0.44]]
          : [[8, 0.48, 0.24], [7, 0.39, 0.33], [6, 0.30, 0.40], [5, 0.215, 0.44], [4, 0.135, 0.46], [3, 0.067, 0.465]];
        rings.forEach(([count, radius, height], ring) => {
          for (let petal = 0; petal < count; petal++) {
            const angle = petal / count * TAU + ring * 1.93;
            const variance = random(ring * 21 + petal + 7);
            parts.push(this.surface((u, v) => {
              const across = u * 2 - 1;
              const spread = (0.28 + Math.sin(v * Math.PI / 2) * 0.84) * (Math.PI / count) * 1.35;
              const phi = angle + across * spread + (1 - v) * 0.22;
              const wave = ruffled ? Math.sin(across * 24 + petal) * 0.018 * v * v : Math.sin(across * 5 + petal) * 0.008 * v;
              const r = 0.023 + (radius - 0.023) * Math.pow(Math.sin(v * Math.PI / 2), 1.17) + wave;
              const y = -0.16 + (height + 0.16) * Math.sin(v * Math.PI / 2) - 0.055 * Math.pow(v, 6) * (1 - across * across)
                - 0.075 * Math.pow(Math.abs(across), 4) * Math.pow(v, 3) + wave * 1.4 + (variance - 0.5) * 0.035 * v;
              return [Math.sin(phi) * r, y, Math.cos(phi) * r, 0.65 + 0.35 * v - 0.035 * ring];
            }, ruffled ? 18 : 12, 11));
          }
        });
        return this.merge(parts);
      });
    }

    tulipGeometry() {
      return this.geometry('tulip', () => {
        const parts = [];
        for (let petal = 0; petal < 6; petal++) {
          parts.push(this.surface((u, v) => {
            const across = u * 2 - 1;
            const angle = petal * TAU / 6 + across * (0.16 + 0.44 * Math.sin(v * Math.PI * 0.6));
            const r = 0.045 + 0.285 * Math.sin(v * Math.PI * 0.78) + (petal % 2) * 0.015;
            const y = -0.13 + 0.64 * v + 0.085 * Math.cos(across * Math.PI / 2) * Math.pow(v, 4);
            return [Math.sin(angle) * r, y, Math.cos(angle) * r, 0.75 + 0.25 * v];
          }, 14, 15));
        }
        return this.merge(parts);
      });
    }

    daisyGeometry(sunflower) {
      return this.geometry(sunflower ? 'sunflower' : 'gerbera', () => {
        const parts = [];
        const count = sunflower ? 26 : 32;
        for (let ring = 0; ring < 2; ring++) {
          for (let petal = 0; petal < count; petal++) {
            const angle = TAU * (petal + ring * 0.5) / count;
            parts.push(this.surface((u, v) => {
              const across = u * 2 - 1;
              const length = (sunflower ? 0.61 : 0.50) - ring * 0.065;
              const r = 0.12 + (length - 0.12) * v;
              const width = Math.pow(Math.sin(Math.PI * v), 0.65) * (sunflower ? 0.078 : 0.045) * across;
              return [Math.sin(angle) * r + Math.cos(angle) * width, 0.035 + Math.sin(v * Math.PI) * 0.055 + ring * 0.027 - 0.09 * v * v + across * across * 0.025, Math.cos(angle) * r - Math.sin(angle) * width, 0.85 + 0.15 * v];
            }, 5, 12));
          }
        }
        return this.merge(parts);
      });
    }

    leafGeometry(round) {
      return this.geometry(round ? 'round-leaf' : 'leaf', () => this.surface((u, v) => {
        const across = u * 2 - 1;
        const width = Math.pow(Math.sin(Math.PI * v), round ? 0.6 : 1.05) * (round ? 0.20 : 0.14);
        return [across * width, v * (round ? 0.37 : 0.56), Math.sin(v * Math.PI) * 0.055 + across * across * 0.033, 0.84 + 0.13 * Math.abs(across)];
      }, 8, 12));
    }

    stemMaterial() {
      return this.material('stem', () => new this.T.MeshStandardMaterial({ color: '#60754c', roughness: 0.83 }));
    }

    leafMaterial(round) {
      return this.material(round ? 'eucalyptus-leaf' : 'rose-leaf', () => new this.T.MeshStandardMaterial({ color: round ? '#7e9a8b' : '#526f45', roughness: 0.84, side: this.T.DoubleSide, vertexColors: true }));
    }

    cylinderBetween(start, end, radius, material, parent) {
      const T = this.T;
      const direction = new T.Vector3().subVectors(end, start);
      const mesh = new T.Mesh(this.geometry('stem-cylinder', () => new T.CylinderGeometry(1, 1, 1, 7)), material || this.stemMaterial());
      mesh.scale.set(radius, direction.length(), radius);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
      mesh.castShadow = true;
      (parent || this.bouquet).add(mesh);
      return mesh;
    }

    addLeaf(parent, position, angle, size, round) {
      const mesh = new this.T.Mesh(this.leafGeometry(round), this.leafMaterial(round));
      mesh.position.copy(position);
      mesh.rotation.set(0.5 + Math.sin(angle) * 0.4, angle, -0.9);
      mesh.scale.setScalar(size);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    }

    addEucalyptus(parent, position, seed, large) {
      const T = this.T;
      const sprig = new T.Group();
      sprig.position.copy(position);
      sprig.rotation.set(Math.sin(seed) * 0.28, seed, Math.cos(seed) * 0.24);
      const height = large ? 1.45 : 0.95;
      this.cylinderBetween(new T.Vector3(0, -0.25, 0), new T.Vector3(0.08, height, 0), 0.014, null, sprig);
      for (let i = 0; i < 7; i++) {
        const y = i * height / 7;
        const size = (0.74 - i * 0.055) * (large ? 1.22 : 1);
        for (let side = 0; side < 2; side++) {
          const leaf = this.addLeaf(sprig, new T.Vector3(0.08 * y / height, y, 0), i * 0.75 + side * Math.PI, size, true);
          leaf.rotation.z = side ? 1.0 : -1.0;
        }
      }
      parent.add(sprig);
      return sprig;
    }

    addBabysBreath(parent, position, seed) {
      const T = this.T;
      const group = new T.Group();
      group.position.copy(position);
      const geometry = this.geometry('tiny-bloom', () => new T.IcosahedronGeometry(0.04, 1));
      const material = this.material('tiny-bloom', () => new T.MeshStandardMaterial({ color: '#fffcf3', roughness: 0.82 }));
      const stemMaterial = this.material('fine-stem', () => new T.MeshStandardMaterial({ color: '#859172', roughness: 0.9 }));
      for (let branch = 0; branch < 8; branch++) {
        const angle = branch * 2.4 + seed;
        const end = new T.Vector3(Math.sin(angle) * (0.22 + random(branch + seed) * 0.2), 0.24 + random(seed + branch * 3) * 0.52, Math.cos(angle) * 0.36);
        this.cylinderBetween(new T.Vector3(0, -0.35, 0), end, 0.007, stemMaterial, group);
        for (let dot = 0; dot < 4; dot++) {
          const mesh = new T.Mesh(geometry, material);
          mesh.position.copy(end).add(new T.Vector3(Math.sin(dot * 2.4) * 0.085, random(dot + branch) * 0.07, Math.cos(dot * 2.4) * 0.075));
          mesh.scale.setScalar(0.65 + random(dot + seed) * 0.55);
          group.add(mesh);
        }
      }
      parent.add(group);
      return group;
    }

    flowerColor(id) {
      if (id === 'sunflower') return '#efbf45';
      if (id === 'gerbera_daisy') return '#fff9ed';
      const colorName = Object.keys(COLORS).find(color => id.includes(color));
      return COLORS[colorName] || '#efd2b6';
    }

    addFlower(item, position, index) {
      const T = this.T;
      const group = new T.Group();
      group.userData.uid = item.uid;
      this.bouquet.add(group);
      const base = new T.Vector3(Math.sin(index * 2.4) * 0.14, 0.10 + random(index + 10) * 0.12, Math.cos(index * 2.4) * 0.13);
      const waist = new T.Vector3(position.x * 0.15, 1.6, position.z * 0.15);
      this.cylinderBetween(base, waist, 0.023, null, group);
      this.cylinderBetween(waist, position, 0.022, null, group);
      for (let leaf = 0; leaf < 2; leaf++) {
        const fraction = 0.35 + leaf * 0.22;
        this.addLeaf(group, waist.clone().lerp(position, fraction), index * 1.8 + leaf * 3.3, 0.95, false);
      }
      const head = new T.Group();
      head.position.copy(position);
      const spread = this.design?.shape === 'heart' ? 0.05 : 0.22;
      const direction = new T.Vector3(position.x * spread, 1, position.z * spread + 0.06).normalize();
      head.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
      head.rotateY(index * 2.399);
      group.add(head);
      if (item.id === 'eucalyptus') {
        this.addEucalyptus(head, new T.Vector3(0, -0.25, 0), index, false);
      } else if (item.id === 'babys_breath') {
        this.addBabysBreath(head, new T.Vector3(), index + 1);
      } else {
        const tulip = item.id.includes('tulip');
        const daisy = item.id === 'sunflower' || item.id.includes('gerbera') || item.id.includes('daisy');
        const color = this.flowerColor(item.id);
        const material = this.material('petal-' + color, () => new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 0.66, metalness: 0, vertexColors: true }));
        const geometry = tulip ? this.tulipGeometry() : daisy ? this.daisyGeometry(item.id === 'sunflower') : this.roseGeometry(item.id.includes('carnation'));
        const bloom = new T.Mesh(geometry, material);
        const scale = 0.93 + random(index + 29) * 0.13;
        bloom.scale.setScalar(scale);
        bloom.castShadow = true;
        // Thin intersecting petals use baked vertex shading; self-shadowing
        // produces serrated edges on mobile shadow maps.
        bloom.receiveShadow = false;
        head.add(bloom);
        if (daisy) {
          const disk = new T.Mesh(this.geometry('daisy-disk', () => new T.SphereGeometry(1, 28, 14)), this.material(item.id === 'sunflower' ? 'sunflower-disk' : 'daisy-disk', () => new T.MeshStandardMaterial({ color: item.id === 'sunflower' ? '#60462c' : '#bba13f', roughness: 1 })));
          disk.scale.set(item.id === 'sunflower' ? 0.21 : 0.12, 0.078, item.id === 'sunflower' ? 0.21 : 0.12);
          disk.position.y = 0.078;
          head.add(disk);
          const seedGeo = this.geometry('pollen', () => new T.IcosahedronGeometry(0.013, 0));
          const seedMat = this.material('pollen', () => new T.MeshStandardMaterial({ color: '#ce9b36', roughness: 1 }));
          const pollen = new T.InstancedMesh(seedGeo, seedMat, 70);
          const matrix = new T.Matrix4();
          for (let s = 0; s < 70; s++) {
            const radius = Math.sqrt(s / 70) * (item.id === 'sunflower' ? 0.195 : 0.108);
            const angle = s * 2.399;
            matrix.makeTranslation(Math.cos(angle) * radius, 0.12 + Math.sqrt(Math.max(0, 1 - s / 70)) * 0.04, Math.sin(angle) * radius);
            pollen.setMatrixAt(s, matrix);
          }
          head.add(pollen);
        }
        const calyx = new T.Mesh(this.geometry('calyx', () => new T.SphereGeometry(0.14, 10, 6)), this.stemMaterial());
        calyx.position.y = -0.12;
        calyx.scale.y = 0.65;
        head.add(calyx);
      }
      group.traverse(object => { if (object.isMesh) { object.userData.uid = item.uid; this.pickTargets.push(object); } });
      this.flowerGroups.set(item.uid, { group, head, position, id: item.id });
    }

    positions(count, shape) {
      const T = this.T;
      const points = [];
      if (shape === 'heart') {
        const radius = Math.max(0.65, Math.min(2.0, 0.34 * Math.sqrt(count)));
        const outline = [], distances = [0];
        for (let i = 0; i <= 360; i++) {
          const t = i * TAU / 360;
          outline.push([Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]);
          if (i) distances.push(distances[i - 1] + Math.hypot(outline[i][0] - outline[i - 1][0], outline[i][1] - outline[i - 1][1]));
        }
        let remaining = count, scale = 1;
        while (remaining > 0) {
          if (remaining <= 3) {
            for (let i = 0; i < remaining; i++) points.push(new T.Vector3((i - (remaining - 1) / 2) * 0.53, 3.52, 0.03));
            break;
          }
          const ringCount = Math.min(remaining, Math.max(6, Math.round(Math.sqrt(remaining) * 1.45) * 2));
          for (let i = 0; i < ringCount; i++) {
            const distance = i * distances[360] / ringCount;
            const step = distances.findIndex(d => d >= distance);
            const [x, z] = outline[Math.max(0, step)];
            points.push(new T.Vector3(x * radius * scale, 3.5, z * radius * scale));
          }
          remaining -= ringCount; scale *= 0.50;
        }
        return points;
      }
      const radius = count <= 1 ? 0 : Math.min(1.65, 0.34 * Math.sqrt(count));
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? Math.sqrt(i / (count - 1)) : 0;
        const angle = i * 2.3999632297;
        const r = radius * t;
        const y = shape === 'dome' ? 3.84 - t * t * 0.56 : 3.70 - t * t * 0.28 + (random(i + 3) - 0.5) * 0.25;
        points.push(new T.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r * 0.87));
      }
      return points;
    }

    addPaper(kind, count) {
      if (kind === 'none') return;
      const T = this.T;
      const palette = { ivory: '#e9dec9', blush: '#dcb6b8', sage: '#afbaaa', noir: '#353b37' };
      const color = palette[kind] || palette.ivory;
      const material = this.material('paper-' + kind, () => new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 0.93, metalness: 0, vertexColors: true }));
      const radius = Math.max(1.12, Math.min(1.9, 0.34 * Math.sqrt(count) + 0.24));
      for (let panel = 0; panel < 7; panel++) {
        const angle = panel * TAU / 7 + 0.3;
        const back = Math.cos(angle) < 0;
        const top = back ? 3.43 + Math.sin(panel * 2.3) * 0.13 : 3.13 + Math.sin(panel * 1.4) * 0.14;
        const geometry = this.surface((u, v) => {
          const across = u * 2 - 1;
          const phi = angle + across * 0.64;
          const fold = 0.045 * Math.cos(across * Math.PI * 2) * v;
          const r = 0.22 + (radius - 0.22) * Math.pow(v, 1.65) + fold;
          const pointedRim = 0.22 * (1 - Math.abs(across)) * Math.pow(v, 6);
          const y = 0.69 + (top - 0.69) * v + pointedRim;
          return [Math.sin(phi) * r, y, Math.cos(phi) * r, 0.92 + 0.065 * Math.cos(across * Math.PI * 2)];
        }, 12, 14);
        this.transientGeometries.push(geometry);
        const mesh = new T.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.bouquet.add(mesh);
      }
      // A thin tissue layer peeks out between the folds.
      const tissueMaterial = this.material('tissue', () => new T.MeshStandardMaterial({ color: '#fffcf1', side: T.DoubleSide, roughness: 0.95, transparent: true, opacity: 0.52, depthWrite: false }));
      for (let panel = 0; panel < 3; panel++) {
        const angle = Math.PI + (panel - 1) * 0.95;
        const geometry = this.surface((u, v) => {
          const across = u * 2 - 1, phi = angle + across * 0.51;
          const r = 0.28 + (radius - 0.33) * v;
          return [Math.sin(phi) * r, 1.5 + 2.02 * v + Math.cos(across * 3.2) * 0.10 * v, Math.cos(phi) * r, 1];
        }, 10, 8);
        this.transientGeometries.push(geometry);
        this.bouquet.add(new T.Mesh(geometry, tissueMaterial));
      }
    }

    addRibbon(kind) {
      if (kind === 'none') return;
      const T = this.T;
      const palette = { ivory: '#ecdfc4', rose: '#af747c', sage: '#6e8674' };
      const material = this.material('ribbon-' + kind, () => new T.MeshStandardMaterial({ color: palette[kind] || palette.ivory, roughness: 0.42, metalness: 0.08, side: T.DoubleSide, vertexColors: true }));
      const band = new T.Mesh(this.geometry('ribbon-band', () => this.surface((u, v) => {
        const angle = u * TAU;
        const r = 0.47 + (v - 0.5) * 0.12;
        return [Math.sin(angle) * r, 1.43 + v * 0.19, Math.cos(angle) * r, 1];
      }, 48, 3)), material);
      this.bouquet.add(band);
      const bow = new T.Group();
      bow.position.set(0, 1.52, 0.49);
      for (const side of [-1, 1]) {
        const loop = new T.Mesh(this.geometry('bow-loop-' + side, () => this.surface((u, v) => {
          const t = u * TAU;
          const width = (v - 0.5) * 0.18;
          return [side * (0.06 + 0.55 * Math.sin(t / 2)), Math.sin(t) * 0.24 + width, 0.13 * Math.sin(t / 2) + Math.cos(t) * 0.065 + width * Math.sin(t), 0.87 + 0.12 * Math.sin(v * Math.PI)];
        }, 36, 5)), material);
        loop.rotation.z = side * 0.16;
        loop.castShadow = true;
        bow.add(loop);
        const tail = new T.Mesh(this.geometry('bow-tail-' + side, () => this.surface((u, v) => {
          const w = (u - 0.5) * 0.19;
          return [side * (0.06 + v * 0.23) + w, -v * 0.73 + Math.abs(u - 0.5) * 0.12 * Math.pow(v, 12), 0.04 + Math.sin(v * 4) * 0.12 + w * Math.sin(v * 5), 0.92 + 0.08 * Math.sin(u * Math.PI)];
        }, 8, 20)), material);
        tail.castShadow = true;
        bow.add(tail);
      }
      const knot = new T.Mesh(this.geometry('bow-knot', () => new T.SphereGeometry(1, 16, 10)), this.material('knot-' + kind, () => new T.MeshStandardMaterial({ color: palette[kind] || palette.ivory, roughness: 0.45 })));
      knot.scale.set(0.115, 0.09, 0.08);
      knot.position.z = 0.09;
      bow.add(knot);
      this.bouquet.add(bow);
    }

    setDesign(design) {
      if (this.failed || this.disposed) return;
      this.design = design;
      this.bouquet.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      this.bouquet.clear();
      this.transientGeometries.forEach(geometry => geometry.dispose());
      this.transientGeometries = [];
      this.flowerGroups.clear();
      this.pickTargets = [];
      const items = (design.items || []).slice(0, 60);
      const isFoliage = item => item.id === 'eucalyptus' || item.id === 'babys_breath';
      const blooms = items.filter(item => !isFoliage(item));
      const foliage = items.filter(isFoliage);
      const points = this.positions(blooms.length, design.shape || 'gathered');
      blooms.forEach((item, index) => this.addFlower(item, points[index], index));
      const foliageRadius = Math.max(0.35, Math.min(1.7, Math.sqrt(blooms.length || foliage.length) * 0.32));
      foliage.forEach((item, index) => {
        const angle = foliage.length < 5 ? Math.PI - 0.9 + index * 1.8 / Math.max(1, foliage.length - 1) : index * 2.399;
        const p = new this.T.Vector3(Math.sin(angle) * foliageRadius, 2.98 + random(index) * 0.12, Math.cos(angle) * foliageRadius);
        this.addFlower(item, p, blooms.length + index);
      });
      if (design.greenery && items.length) {
        const radius = Math.min(1.6, Math.max(0.58, Math.sqrt(items.length) * 0.34));
        for (let i = 0; i < 6; i++) {
          const angle = i * TAU / 6 + 0.3;
          this.addEucalyptus(this.bouquet, new this.T.Vector3(Math.sin(angle) * radius * 0.9, 2.8, Math.cos(angle) * radius * 0.75), angle, i % 2 === 0);
        }
        for (let i = 0; i < 3; i++) {
          const angle = i * TAU / 3 + 0.8;
          this.addBabysBreath(this.bouquet, new this.T.Vector3(Math.sin(angle) * radius, 3.15, Math.cos(angle) * radius * 0.8), i * 4 + 1);
        }
      }
      if (items.length) {
        this.addPaper(design.paper || 'ivory', items.length);
        this.addRibbon(design.ribbon || 'ivory');
      }
      this.contactShadow.visible = !!items.length;
      this.setSelected(this.selected);
      this.dirty = true;
    }

    setSelected(uid) {
      this.selected = uid;
      if (!this.selectionHalo) return;
      const flower = this.flowerGroups.get(uid);
      this.selectionHalo.visible = !!flower;
      if (flower) {
        this.selectionHalo.position.copy(flower.position);
        this.selectionHalo.position.y += flower.id.includes('tulip') ? 0.47 : 0.20;
        this.selectionHalo.scale.setScalar(flower.id === 'sunflower' ? 1.14 : 1);
      }
      this.dirty = true;
    }

    setView(view) {
      const views = { front: [0, 1.40], top: [0, 0.09], side: [Math.PI / 2, 1.32], perspective: [0.2, 1.08] };
      const angles = views[view] || views.perspective;
      // Pick the shortest turn when the user has already spun the bouquet.
      this.destination.theta = this.orbit.theta + Math.atan2(Math.sin(angles[0] - this.orbit.theta), Math.cos(angles[0] - this.orbit.theta));
      this.destination.phi = angles[1];
      this.dirty = true;
    }

    zoom(delta) {
      if (!this.destination) return;
      this.destination.radius = clamp(this.destination.radius - delta * 0.65, 5.4, 14.8);
      this.dirty = true;
    }

    resetView() {
      if (!this.destination) return;
      this.setView('perspective');
      this.destination.radius = 9.4;
      this.dirty = true;
    }

    setAutoRotate(enabled) {
      this.autoRotate = Boolean(enabled);
      this.dirty = true;
    }

    resize() {
      if (!this.renderer || this.disposed) return;
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.dirty = true;
    }

    listen(target, event, callback, options) {
      target.addEventListener(event, callback, options);
      this.listeners.push(() => target.removeEventListener(event, callback, options));
    }

    bindControls() {
      const canvas = this.canvas;
      this.listen(canvas, 'pointerdown', event => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        canvas.focus({ preventScroll: true });
        canvas.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.dragStart = { x: event.clientX, y: event.clientY };
        this.didDrag = this.pointers.size > 1;
        this.pinchDistance = this.getPinchDistance();
        canvas.style.cursor = 'grabbing';
      });
      this.listen(canvas, 'pointermove', event => {
        const previous = this.pointers.get(event.pointerId);
        if (!previous) return;
        const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size > 1) {
          const distance = this.getPinchDistance();
          if (this.pinchDistance) this.zoom((distance - this.pinchDistance) / 38);
          this.pinchDistance = distance;
          this.didDrag = true;
        } else {
          if (Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y) > 4) this.didDrag = true;
          this.destination.theta -= dx * 0.006;
          this.destination.phi = clamp(this.destination.phi - dy * 0.006, 0.08, 1.72);
          this.dirty = true;
        }
      });
      const release = event => {
        if (!this.pointers.has(event.pointerId)) return;
        const select = !this.didDrag && this.pointers.size === 1 && event.type === 'pointerup';
        this.pointers.delete(event.pointerId);
        this.pinchDistance = this.getPinchDistance();
        if (!this.pointers.size) canvas.style.cursor = 'grab';
        if (select) this.pick(event.clientX, event.clientY);
      };
      this.listen(canvas, 'pointerup', release);
      this.listen(canvas, 'pointercancel', release);
      this.listen(canvas, 'lostpointercapture', release);
      this.listen(canvas, 'wheel', event => { event.preventDefault(); this.zoom(-clamp(event.deltaY, -150, 150) / 130); }, { passive: false });
      this.listen(canvas, 'keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', 'Escape'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') this.destination.theta -= 0.12;
        if (event.key === 'ArrowRight') this.destination.theta += 0.12;
        if (event.key === 'ArrowUp') this.destination.phi = clamp(this.destination.phi - 0.10, 0.08, 1.72);
        if (event.key === 'ArrowDown') this.destination.phi = clamp(this.destination.phi + 0.10, 0.08, 1.72);
        if (event.key === '+' || event.key === '=') this.zoom(1);
        if (event.key === '-') this.zoom(-1);
        if (event.key === '0') this.resetView();
        if (event.key === 'Escape') this.onSelect(null);
        this.dirty = true;
      });
      this.listen(canvas, 'webglcontextlost', event => {
        event.preventDefault();
        this.failed = true;
        this.onError(new Error('The 3D view paused because the graphics context was lost. Please reload to continue.'));
      });
      canvas.style.cursor = 'grab';
    }

    getPinchDistance() {
      if (this.pointers.size < 2) return 0;
      const [a, b] = Array.from(this.pointers.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    pick(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerPosition.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
      this.raycaster.setFromCamera(this.pointerPosition, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickTargets, false);
      this.onSelect(hits.length ? hits[0].object.userData.uid : null);
    }

    updateCamera() {
      const aspectCompensation = this.camera.aspect < 0.9 ? 0.9 / Math.max(this.camera.aspect, 0.5) : 1;
      const radius = this.orbit.radius * aspectCompensation;
      const sin = Math.sin(this.orbit.phi);
      this.camera.position.set(this.target.x + radius * sin * Math.sin(this.orbit.theta), this.target.y + radius * Math.cos(this.orbit.phi), this.target.z + radius * sin * Math.cos(this.orbit.theta));
      this.camera.lookAt(this.target);
    }

    tick(time) {
      if (this.disposed || this.failed) return;
      const elapsed = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
      this.lastTime = time;
      if (this.autoRotate && !this.pointers.size && !document.hidden) {
        this.destination.theta += elapsed * 0.16;
        this.dirty = true;
      }
      let moving = false;
      for (const key of ['theta', 'phi', 'radius']) {
        const difference = this.destination[key] - this.orbit[key];
        if (Math.abs(difference) > 0.0001) {
          this.orbit[key] += difference * Math.min(1, elapsed * 10);
          moving = true;
        }
      }
      if ((this.dirty || moving) && !document.hidden) {
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
        this.dirty = false;
      }
      this.frame = requestAnimationFrame(nextTime => this.tick(nextTime));
    }

    capture() {
      if (this.failed || this.disposed) throw new Error('The 3D view is unavailable.');
      const wasVisible = this.selectionHalo.visible;
      this.selectionHalo.visible = false;
      this.renderer.setClearColor(0xf4f1e9, 1);
      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      const image = this.canvas.toDataURL('image/png');
      this.renderer.setClearColor(0xf4f1e9, 0);
      this.selectionHalo.visible = wasVisible;
      this.dirty = true;
      return image;
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      cancelAnimationFrame(this.frame);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.listeners.forEach(remove => remove());
      if (this.bouquet) this.bouquet.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      this.geometries.forEach(geometry => geometry.dispose());
      this.transientGeometries.forEach(geometry => geometry.dispose());
      this.materials.forEach(material => material.dispose());
      if (this.shadowTexture) this.shadowTexture.dispose();
      if (this.renderer) this.renderer.dispose();
      this.flowerGroups.clear();
      this.pointers.clear();
    }
  }

  window.Nebula3DScene = Nebula3DScene;
})();
