"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type VehicleKind = "flight" | "car" | "train" | "ferry";

type Vehicle3DProps = {
  kind: VehicleKind;
  progress?: number;
  className?: string;
  /** 屏幕方位角，0 为正上方，顺时针递增。 */
  heading?: number;
};

const MODELS: Record<VehicleKind, string> = {
  flight: "/models/plane.glb",
  car: "/models/car.glb",
  train: "/models/train.glb",
  ferry: "/models/ferry.glb",
};

const LABELS: Record<VehicleKind, string> = {
  flight: "飞机",
  car: "汽车",
  train: "火车",
  ferry: "轮船",
};

/** 导入模型的车头统一朝本地 +X，地图航向只需旋转外层容器。 */
const FORWARD_FIX: Record<VehicleKind, number> = {
  flight: Math.PI / 2,
  car: Math.PI / 2,
  train: 0,
  ferry: 0,
};

function shortestTurn(from: number, to: number) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const item of materials) {
      const material = item as THREE.MeshStandardMaterial;
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.metalnessMap?.dispose();
      item.dispose();
    }
  });
}

export default function Vehicle3D({ kind, progress = 0, className = "", heading }: Vehicle3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const headingRef = useRef(heading);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { headingRef.current = heading; }, [heading]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    let loadedModel: THREE.Object3D | null = null;
    setState("loading");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(4.7, -7.8, 4.6);
    camera.lookAt(0, 0, 0.5);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const yaw = new THREE.Group();
    const presentation = new THREE.Group();
    presentation.rotation.set(0.08, 0, -0.08);
    yaw.add(presentation);
    scene.add(yaw);

    scene.add(new THREE.HemisphereLight(0xf8fbff, 0x486078, 2.45));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(4, -5, 8);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(kind === "car" ? 0xff9caf : 0x82c7ff, 2.3);
    rim.position.set(-5, 3, 5);
    scene.add(rim);

    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x07101d, transparent: true, opacity: 0.15, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), shadowMaterial);
    shadow.scale.set(1.45, 0.42, 1);
    shadow.position.z = -0.72;
    scene.add(shadow);

    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(
      MODELS[kind],
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        const model = gltf.scene;
        model.rotation.z = FORWARD_FIX[kind];
        model.updateMatrixWorld(true);
        const firstBox = new THREE.Box3().setFromObject(model);
        const size = firstBox.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z) || 1;
        model.scale.multiplyScalar((kind === "train" ? 3.55 : 3.15) / maxSize);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.y -= center.y;
        model.position.z -= box.min.z + 0.72;
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
        });
        loadedModel = model;
        presentation.add(model);
        setState("ready");
      },
      undefined,
      () => { if (!disposed) setState("error"); },
    );

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

    const start = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let yawSettled = false;
    const render = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (headingRef.current !== undefined) {
        const target = (90 - headingRef.current) * Math.PI / 180;
        if (!yawSettled) {
          yaw.rotation.z = target;
          yawSettled = true;
        } else {
          yaw.rotation.z += shortestTurn(yaw.rotation.z, target) * 0.14;
        }
      }
      if (!reduceMotion.matches) {
        presentation.position.z = Math.sin(elapsed * 1.7 + progressRef.current * 0.04) * 0.065;
        presentation.rotation.y += (Math.sin(elapsed * 0.42) * 0.045 - presentation.rotation.y) * 0.025;
        shadowMaterial.opacity = 0.12 + Math.sin(elapsed * 1.7) * 0.025;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      draco.dispose();
      if (loadedModel) disposeObject(loadedModel);
      shadow.geometry.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [kind]);

  return (
    <div ref={mountRef} className={`vehicle-3d ${className} is-${state}`} aria-label={`${LABELS[kind]} 3D 模型`}>
      {state === "loading" && <span className="vehicle-load-state" aria-hidden="true" />}
      {state === "error" && <span className="vehicle-load-error">模型加载失败</span>}
    </div>
  );
}
