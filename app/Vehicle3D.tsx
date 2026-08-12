"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type VehicleKind = "flight" | "car" | "train" | "ferry";

type Vehicle3DProps = {
  kind: VehicleKind;
  progress?: number;
  className?: string;
};

const COLORS = {
  flight: { body: 0xf7f8fb, accent: 0x0a84ff, dark: 0x223046 },
  car: { body: 0xff375f, accent: 0xffd60a, dark: 0x20242b },
  train: { body: 0xf8fafc, accent: 0xbf5af2, dark: 0x272a35 },
  ferry: { body: 0xf8fafc, accent: 0x32ade6, dark: 0x183548 },
} as const;

function material(color: number, metalness = 0.18, roughness = 0.55) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function mesh(geometry: THREE.BufferGeometry, color: number, metalness?: number, roughness?: number) {
  const item = new THREE.Mesh(geometry, material(color, metalness, roughness));
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function buildPlane() {
  const palette = COLORS.flight;
  const group = new THREE.Group();
  const fuselage = mesh(new THREE.CapsuleGeometry(.23, 2.35, 10, 20), palette.body, .22, .38);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.scale.set(1, .76, .78);
  group.add(fuselage);

  const nose = mesh(new THREE.ConeGeometry(.23, .72, 24), palette.body, .22, .38);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.52;
  group.add(nose);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(.55, 0);
  wingShape.lineTo(-.7, 1.7);
  wingShape.lineTo(-.42, .1);
  wingShape.lineTo(-.65, -1.7);
  wingShape.closePath();
  const wings = mesh(new THREE.ExtrudeGeometry(wingShape, { depth: .06, bevelEnabled: true, bevelSize: .025, bevelThickness: .025 }), palette.body, .18, .4);
  wings.rotation.x = Math.PI / 2;
  wings.position.z = -.07;
  group.add(wings);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(-.75, 0);
  tailShape.lineTo(-1.28, .63);
  tailShape.lineTo(-1.12, .06);
  tailShape.lineTo(-1.28, -.63);
  tailShape.closePath();
  const tail = mesh(new THREE.ExtrudeGeometry(tailShape, { depth: .05, bevelEnabled: true, bevelSize: .02, bevelThickness: .02 }), palette.accent, .15, .45);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = .02;
  group.add(tail);

  const fin = mesh(new THREE.BoxGeometry(.62, .05, .58), palette.accent, .15, .45);
  fin.position.set(-1.03, 0, .28);
  fin.rotation.y = -.35;
  group.add(fin);

  for (const y of [-.58, .58]) {
    const engine = mesh(new THREE.CylinderGeometry(.15, .17, .55, 20), palette.dark, .35, .35);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(.05, y, -.18);
    group.add(engine);
  }

  for (let index = 0; index < 8; index += 1) {
    const windowMesh = mesh(new THREE.SphereGeometry(.035, 10, 8), palette.dark, .05, .3);
    windowMesh.position.set(.78 - index * .22, -.205, .09);
    group.add(windowMesh);
  }
  group.rotation.set(.16, -.12, -.12);
  group.scale.setScalar(.78);
  return group;
}

function wheel() {
  const tire = mesh(new THREE.CylinderGeometry(.22, .22, .15, 20), 0x1c1d22, .1, .78);
  tire.rotation.x = Math.PI / 2;
  const hub = mesh(new THREE.CylinderGeometry(.1, .1, .17, 16), 0xc9d0da, .72, .25);
  hub.rotation.x = Math.PI / 2;
  tire.add(hub);
  return tire;
}

function buildCar() {
  const palette = COLORS.car;
  const group = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(2.35, 1.05, .48, 4, 3, 2), palette.body, .5, .33);
  body.position.z = .02;
  group.add(body);
  const cabin = mesh(new THREE.BoxGeometry(1.28, .92, .52), palette.dark, .22, .22);
  cabin.position.set(-.05, 0, .48);
  cabin.scale.set(1, .92, .82);
  group.add(cabin);
  const roof = mesh(new THREE.BoxGeometry(.95, .88, .08), palette.body, .5, .33);
  roof.position.set(-.08, 0, .79);
  group.add(roof);
  for (const x of [-.72, .72]) for (const y of [-.54, .54]) {
    const tire = wheel();
    tire.position.set(x, y, -.24);
    group.add(tire);
  }
  const light = mesh(new THREE.BoxGeometry(.09, .72, .13), palette.accent, .08, .25);
  light.position.set(1.2, 0, .09);
  group.add(light);
  group.rotation.set(.08, -.18, -.12);
  group.scale.setScalar(.84);
  return group;
}

function buildTrain() {
  const palette = COLORS.train;
  const group = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(2.8, .92, .72), palette.body, .32, .4);
  body.position.z = .08;
  group.add(body);
  const nose = mesh(new THREE.ConeGeometry(.48, 1.05, 4), palette.body, .32, .38);
  nose.rotation.z = -Math.PI / 2;
  nose.rotation.x = Math.PI / 4;
  nose.scale.y = .83;
  nose.position.set(1.75, 0, .08);
  group.add(nose);
  const glass = mesh(new THREE.BoxGeometry(.7, .94, .28), palette.dark, .08, .18);
  glass.position.set(1.05, 0, .25);
  group.add(glass);
  const stripe = mesh(new THREE.BoxGeometry(2.82, .95, .09), palette.accent, .16, .42);
  stripe.position.z = -.06;
  group.add(stripe);
  for (const x of [-.9, -.25, .4]) {
    const windowMesh = mesh(new THREE.BoxGeometry(.38, .96, .28), palette.dark, .08, .18);
    windowMesh.position.set(x, 0, .25);
    group.add(windowMesh);
  }
  for (const x of [-.88, .82]) for (const y of [-.4, .4]) {
    const tire = wheel();
    tire.scale.setScalar(.72);
    tire.position.set(x, y, -.37);
    group.add(tire);
  }
  group.rotation.set(.1, -.08, -.08);
  group.scale.setScalar(.75);
  return group;
}

function buildFerry() {
  const palette = COLORS.ferry;
  const group = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(1.55, 0);
  hullShape.lineTo(.95, .58);
  hullShape.lineTo(-1.35, .58);
  hullShape.lineTo(-1.55, .35);
  hullShape.lineTo(-1.55, -.35);
  hullShape.lineTo(-1.35, -.58);
  hullShape.lineTo(.95, -.58);
  hullShape.closePath();
  const hull = mesh(new THREE.ExtrudeGeometry(hullShape, { depth: .38, bevelEnabled: true, bevelSize: .08, bevelThickness: .06 }), palette.dark, .25, .45);
  hull.position.z = -.35;
  group.add(hull);
  const deck = mesh(new THREE.BoxGeometry(2.25, .9, .24), palette.body, .2, .5);
  deck.position.set(-.05, 0, .13);
  group.add(deck);
  const bridge = mesh(new THREE.BoxGeometry(1.18, .72, .56), palette.body, .2, .46);
  bridge.position.set(-.25, 0, .5);
  group.add(bridge);
  const windows = mesh(new THREE.BoxGeometry(1.2, .74, .2), palette.accent, .08, .22);
  windows.position.set(-.18, 0, .62);
  group.add(windows);
  const roof = mesh(new THREE.BoxGeometry(1.34, .82, .08), 0xffffff, .2, .4);
  roof.position.set(-.25, 0, .82);
  group.add(roof);
  const funnel = mesh(new THREE.CylinderGeometry(.12, .15, .45, 18), 0xff9f0a, .2, .42);
  funnel.rotation.x = Math.PI / 2;
  funnel.position.set(-.78, 0, .9);
  group.add(funnel);
  group.rotation.set(.14, -.12, -.08);
  group.scale.setScalar(.8);
  return group;
}

function createVehicle(kind: VehicleKind) {
  if (kind === "flight") return buildPlane();
  if (kind === "car") return buildCar();
  if (kind === "train") return buildTrain();
  return buildFerry();
}

export default function Vehicle3D({ kind, progress = 0, className = "" }: Vehicle3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
    camera.position.set(0, -7.8, 4.8);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const vehicle = createVehicle(kind);
    scene.add(vehicle);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7890a8, 2.35));
    const key = new THREE.DirectionalLight(0xffffff, 3.8);
    key.position.set(4, -5, 8);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(kind === "flight" ? 0x77bfff : 0x9cdcff, 2.1);
    rim.position.set(-4, 3, 4);
    scene.add(rim);

    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x0c1320, transparent: true, opacity: .16, depthWrite: false });
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 40),
      shadowMaterial,
    );
    shadow.scale.set(1.4, .43, 1);
    shadow.position.z = -1.02;
    scene.add(shadow);

    let frame = 0;
    let start = performance.now();
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const render = (now: number) => {
      const elapsed = (now - start) / 1000;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        vehicle.position.z = Math.sin(elapsed * 1.7 + progress * .04) * .08;
        vehicle.rotation.z += (Math.sin(elapsed * .55) * .035 - vehicle.rotation.z) * .025;
        vehicle.rotation.y += (Math.sin(elapsed * .42) * .06 - vehicle.rotation.y) * .02;
        shadowMaterial.opacity = .13 + Math.sin(elapsed * 1.7) * .025;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
        else object.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      start = 0;
    };
  }, [kind, progress]);

  return <div ref={mountRef} className={`vehicle-3d ${className}`} aria-label={`${kind} 3D 模型`} />;
}
