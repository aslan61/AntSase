import { useEffect, useMemo, useRef } from 'react';
import type { ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges, Grid, OrbitControls, Text } from '@react-three/drei';
import { Color, Object3D, Vector3, TOUCH, MOUSE } from 'three';
import type { InstancedMesh } from 'three';
import { SAHALAR, slotToLocal } from '@sase/shared';
import type { Saha, ZoneBlock } from '@sase/shared';
import { SCENE_CONFIG } from '../config';
import { useAppStore } from '../store';
import { FIELD_LAYOUTS, worldBlockCenter, worldSlot } from './layout';
import type { FieldLayout } from './layout';

function CameraController() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const destination = useRef(new Vector3());
  const lookAt = useRef(new Vector3());
  const desiredZoom = useRef(12);
  const animating = useRef(true);
  const focusSaha = useAppStore((state) => state.focusSaha);
  const focusBlock = useAppStore((state) => state.focusBlock);
  const selected = useAppStore((state) => state.selected);
  const nonce = useAppStore((state) => state.focusNonce);
  const mode = useAppStore((state) => state.viewMode);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const isInitialLoad = useRef(true);
  const prevMode = useRef(mode);

  useEffect(() => {
    const stopAutomaticCamera = (): void => { animating.current = false; };
    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', stopAutomaticCamera, true);
    canvas.addEventListener('wheel', stopAutomaticCamera, { capture: true, passive: true });
    return () => {
      canvas.removeEventListener('pointerdown', stopAutomaticCamera, true);
      canvas.removeEventListener('wheel', stopAutomaticCamera, true);
    };
  }, [gl]);

  useEffect(() => {
    // If everything is null, we only transition if it's initial load or mode changed!
    const isReset = !selected && !focusBlock && !focusSaha;
    if (isReset) {
      if (isInitialLoad.current || mode !== prevMode.current) {
        isInitialLoad.current = false;
        prevMode.current = mode;
        const target = [0, 0, 0] as const;
        const distance = 74;
        lookAt.current.set(target[0], 0, target[2]);
        destination.current.set(target[0] + (mode === '3d' ? distance * 0.42 : 0), distance, target[2] + (mode === '3d' ? distance * 0.68 : 0.01));
        desiredZoom.current = mode === '3d' ? 1 : 7;
        animating.current = true;
      }
      return;
    }

    const field = focusSaha ? FIELD_LAYOUTS.get(focusSaha) : undefined;
    const blockPosition = focusBlock ? worldBlockCenter(focusBlock.sahaId, focusBlock.blockId) : undefined;
    const selectedPosition = selected ? worldSlot(selected.sahaId, selected.blockId, selected.col, selected.row) : undefined;
    const target = selectedPosition ?? blockPosition ?? (field ? [field.centerX, 0, 0] as const : [0, 0, 0] as const);
    const distance = selected ? 5.4 : focusBlock ? 12 : field ? 36 : 70;
    lookAt.current.set(target[0], 0, target[2]);
    destination.current.set(target[0] + (mode === '3d' ? distance * 0.48 : 0), distance, target[2] + (mode === '3d' ? distance * 0.52 : 0.01));
    desiredZoom.current = mode === '3d' ? 1 : (selected ? 52 : focusBlock ? 30 : field ? 14 : 7);
    animating.current = true;
    prevMode.current = mode;
  }, [focusBlock, focusSaha, mode, nonce, selected]);
  useFrame(() => {
    if (!animating.current) return;
    camera.position.lerp(destination.current, 0.085);
    if ('zoom' in camera) {
      camera.zoom += (desiredZoom.current - camera.zoom) * 0.085;
      camera.updateProjectionMatrix();
    }
    if (controls.current) {
      controls.current.target.lerp(lookAt.current, 0.1);
      controls.current.update();
    }
    const zoomReady = !('zoom' in camera) || Math.abs(camera.zoom - desiredZoom.current) < 0.02;
    const targetReady = controls.current ? controls.current.target.distanceTo(lookAt.current) < 0.03 : false;
    if (camera.position.distanceTo(destination.current) < 0.03 && targetReady && zoomReady) animating.current = false;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={false}
      screenSpacePanning
      zoomToCursor
      rotateSpeed={0.72}
      zoomSpeed={0.9}
      panSpeed={0.85}
      onStart={() => { animating.current = false; }}
      minDistance={1}
      maxDistance={200}
      minZoom={2}
      maxZoom={80}
      minPolarAngle={mode === '2d' ? 0 : 0.08}
      maxPolarAngle={mode === '2d' ? 0.02 : Math.PI / 2.2}
      mouseButtons={
        mode === '2d'
          ? { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
          : cameraMode === 'pan'
            ? { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
            : { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }
      }
      touches={
        mode === '2d'
          ? { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }
          : { ONE: cameraMode === 'pan' ? TOUCH.PAN : TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
      }
    />
  );
}

function Slots({ saha, block }: { readonly saha: Saha; readonly block: ZoneBlock }) {
  const emptyMesh = useRef<InstancedMesh>(null);
  const carBodyMesh = useRef<InstancedMesh>(null);
  const carCabinMesh = useRef<InstancedMesh>(null);
  const carWindowMesh = useRef<InstancedMesh>(null);
  const carWheelMesh = useRef<InstancedMesh>(null);
  const placements = useAppStore((state) => state.report.placements).filter((item) => item.sahaId === saha.id && item.blockId === block.id);
  const selected = useAppStore((state) => state.selected);
  const select = useAppStore((state) => state.select);
  const focusBlock = useAppStore((state) => state.focusBlock);
  const focusPeron = useAppStore((state) => state.focusPeron);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => {
    if (emptyMesh.current) {
      for (let index = 0; index < block.capacity; index += 1) {
        const { col, row } = slotToLocal(block, index + 1);
        const [x, , z] = worldSlot(saha.id, block.id, col, row);
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(x, 0.025, z); dummy.updateMatrix(); emptyMesh.current.setMatrixAt(index, dummy.matrix);

        // Park karesi araçtan ayrı ve nötr kalır; sarı otomobil net biçimde seçilir.
        const isOccupied = placements.some((p) => p.slotIndex === index + 1);
        emptyMesh.current.setColorAt(index, new Color(isOccupied ? '#5f7893' : '#3b668c'));
      }
      emptyMesh.current.instanceMatrix.needsUpdate = true;
      if (emptyMesh.current.instanceColor) emptyMesh.current.instanceColor.needsUpdate = true;
    }
    if (carBodyMesh.current && carCabinMesh.current && carWindowMesh.current && carWheelMesh.current) {
      placements.forEach((item, index) => {
        const [x, , z] = worldSlot(item.sahaId, item.blockId, item.col, item.row);
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(x, 0.18, z);
        dummy.updateMatrix();
        carBodyMesh.current?.setMatrixAt(index, dummy.matrix);

        dummy.position.set(x, 0.34, z - 0.02);
        dummy.updateMatrix();
        carCabinMesh.current?.setMatrixAt(index, dummy.matrix);

        dummy.position.set(x, 0.445, z - 0.02);
        dummy.updateMatrix();
        carWindowMesh.current?.setMatrixAt(index, dummy.matrix);

        const wheelPositions = [
          [-0.27, -0.33], [0.27, -0.33], [-0.27, 0.33], [0.27, 0.33],
        ] as const;
        wheelPositions.forEach(([offsetX, offsetZ], wheelIndex) => {
          dummy.position.set(x + offsetX, 0.13, z + offsetZ);
          dummy.rotation.set(0, 0, Math.PI / 2);
          dummy.updateMatrix();
          carWheelMesh.current?.setMatrixAt(index * 4 + wheelIndex, dummy.matrix);
        });
      });
      carBodyMesh.current.instanceMatrix.needsUpdate = true;
      carCabinMesh.current.instanceMatrix.needsUpdate = true;
      carWindowMesh.current.instanceMatrix.needsUpdate = true;
      carWheelMesh.current.instanceMatrix.needsUpdate = true;
      carBodyMesh.current.computeBoundingSphere();
      carCabinMesh.current.computeBoundingSphere();
      carWindowMesh.current.computeBoundingSphere();
      carWheelMesh.current.computeBoundingSphere();
    }
  }, [block, dummy, placements, saha.id, selected]);
  const handleVehicleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    if (event.delta > 4) return;
    if (event.instanceId !== undefined) select(placements[event.instanceId] ?? null);
  };
  const handleWheelClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    if (event.delta > 4) return;
    if (event.instanceId !== undefined) select(placements[Math.floor(event.instanceId / 4)] ?? null);
  };
  const handleSlotClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    if (event.delta > 4) return;
    if (event.instanceId === undefined) return;
    const coordinate = slotToLocal(block, event.instanceId + 1);
    const placement = placements.find((item) => item.col === coordinate.col && item.row === coordinate.row);
    if (placement) {
      select(placement);
    } else {
      select({
        sahaId: saha.id,
        blockId: block.id,
        slotIndex: event.instanceId + 1,
        col: coordinate.col,
        row: coordinate.row,
      });
    }
  };
  const showLabels = focusBlock?.sahaId === saha.id && focusBlock.blockId === block.id;
  const placementBySlot = useMemo(() => new Map(placements.map((item) => [item.slotIndex, item])), [placements]);
  const isSelectedBlock = selected?.sahaId === saha.id && selected?.blockId === block.id;
  const [selectedX, , selectedZ] = selected && isSelectedBlock
    ? worldSlot(saha.id, block.id, selected.col, selected.row)
    : [0, 0, 0];
  return (
    <>
      <instancedMesh ref={emptyMesh} args={[undefined, undefined, block.capacity]} onClick={handleSlotClick}>
        <boxGeometry args={[SCENE_CONFIG.slotWidth, 0.04, SCENE_CONFIG.slotDepth]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      {placements.length > 0 && (
        <>
          <instancedMesh ref={carBodyMesh} args={[undefined, undefined, placements.length]} onClick={handleVehicleClick} castShadow frustumCulled={false}>
            <boxGeometry args={[SCENE_CONFIG.slotWidth * 0.74, 0.24, SCENE_CONFIG.slotDepth * 0.8]} />
            <meshStandardMaterial color="#ffd400" metalness={0.24} roughness={0.3} emissive="#806900" emissiveIntensity={0.5} />
          </instancedMesh>
          <instancedMesh ref={carCabinMesh} args={[undefined, undefined, placements.length]} onClick={handleVehicleClick} castShadow frustumCulled={false}>
            <boxGeometry args={[SCENE_CONFIG.slotWidth * 0.56, 0.18, SCENE_CONFIG.slotDepth * 0.36]} />
            <meshStandardMaterial color="#ffd400" metalness={0.24} roughness={0.3} emissive="#806900" emissiveIntensity={0.5} />
          </instancedMesh>
          <instancedMesh ref={carWindowMesh} args={[undefined, undefined, placements.length]} onClick={handleVehicleClick} castShadow frustumCulled={false}>
            <boxGeometry args={[SCENE_CONFIG.slotWidth * 0.42, 0.035, SCENE_CONFIG.slotDepth * 0.22]} />
            <meshStandardMaterial color="#18324a" metalness={0.65} roughness={0.18} />
          </instancedMesh>
          <instancedMesh ref={carWheelMesh} args={[undefined, undefined, placements.length * 4]} onClick={handleWheelClick} castShadow frustumCulled={false}>
            <cylinderGeometry args={[0.085, 0.085, 0.07, 10]} />
            <meshStandardMaterial color="#05080d" roughness={0.92} />
          </instancedMesh>
        </>
      )}
      {selected && isSelectedBlock && (
        <mesh position={[selectedX, selected.saseNo ? SCENE_CONFIG.vehicleHeight / 2 + 0.06 : 0.04, selectedZ]} raycast={() => null}>
          <boxGeometry args={[
            SCENE_CONFIG.slotWidth * (selected.saseNo ? 0.82 : 1.05),
            selected.saseNo ? SCENE_CONFIG.vehicleHeight + 0.04 : 0.06,
            SCENE_CONFIG.slotDepth * (selected.saseNo ? 0.82 : 1.05)
          ]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}
      {showLabels && Array.from({ length: block.capacity }, (_, index) => {
        const coordinate = slotToLocal(block, index + 1);
        const [x, , z] = worldSlot(saha.id, block.id, coordinate.col, coordinate.row);
        const placement = placementBySlot.get(index + 1);
        if (!placement) return null;
        return (
          <group key={index} position={[x, 0.535, z]} rotation={[0, -Math.PI / 2, 0]} onClick={(event) => { event.stopPropagation(); if (event.delta <= 4) select(placement); }}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
              <planeGeometry args={[SCENE_CONFIG.slotDepth * 0.93, SCENE_CONFIG.slotWidth * 0.34]} />
              <meshBasicMaterial color="#07111f" transparent opacity={0.86} depthWrite={false} />
            </mesh>
            <Text position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} fontSize={0.132} letterSpacing={-0.05} maxWidth={SCENE_CONFIG.slotDepth * 0.92} color="#ffffff" fontWeight="bold" textAlign="center" anchorX="center" anchorY="middle" outlineWidth={0.014} outlineColor="#000000">
              {placement.saseNo}
            </Text>
          </group>
        );
      })}
    </>
  );
}

function RoadMarkings({ saha, layout }: { readonly saha: Saha; readonly layout: FieldLayout }) {
  const fieldStartZ = -layout.depth / 2 + SCENE_CONFIG.fieldPadding;
  const rowBounds = [...new Set(saha.blocks.map((block) => block.row))]
    .sort((a, b) => a - b)
    .map((row) => {
      const rowBlocks = saha.blocks.filter((block) => block.row === row);
      const bounds = rowBlocks.map((block) => {
        const item = layout.blocks.get(block.id);
        if (!item) return null;
        const center = fieldStartZ + item.z;
        return { min: center - item.depth / 2, max: center + item.depth / 2 };
      }).filter((item): item is { min: number; max: number } => item !== null);
      return {
        row,
        min: Math.min(...bounds.map((item) => item.min)),
        max: Math.max(...bounds.map((item) => item.max)),
        split: rowBlocks.some((block) => block.side === 'L') && rowBlocks.some((block) => block.side === 'R'),
      };
    });

  const horizontalRoads = rowBounds.slice(0, -1).map((bounds, index) => {
    const next = rowBounds[index + 1];
    return next ? (bounds.max + next.min) / 2 : bounds.max;
  });
  const dashLength = 1.45;
  const dashGap = 0.8;
  const dashPitch = dashLength + dashGap;
  const usableWidth = layout.width - SCENE_CONFIG.fieldPadding * 2;
  const horizontalCount = Math.max(1, Math.floor(usableWidth / dashPitch));
  const horizontalStart = layout.centerX - ((horizontalCount - 1) * dashPitch) / 2;

  return (
    <group>
      {horizontalRoads.flatMap((z, roadIndex) => Array.from({ length: horizontalCount }, (_, dashIndex) => (
        <mesh key={`road-h-${roadIndex}-${dashIndex}`} position={[horizontalStart + dashIndex * dashPitch, 0.055, z]} raycast={() => null}>
          <boxGeometry args={[dashLength, 0.025, 0.1]} />
          <meshBasicMaterial color="#ffd400" toneMapped={false} />
        </mesh>
      )))}
      {rowBounds.filter((bounds) => bounds.split).flatMap((bounds) => {
        const length = bounds.max - bounds.min;
        const count = Math.max(1, Math.floor(length / dashPitch));
        const start = (bounds.min + bounds.max) / 2 - ((count - 1) * dashPitch) / 2;
        return Array.from({ length: count }, (_, dashIndex) => (
          <mesh key={`road-v-${bounds.row}-${dashIndex}`} position={[layout.centerX, 0.055, start + dashIndex * dashPitch]} raycast={() => null}>
            <boxGeometry args={[0.1, 0.025, dashLength]} />
            <meshBasicMaterial color="#ffd400" toneMapped={false} />
          </mesh>
        ));
      })}
    </group>
  );
}

function Field({ saha }: { readonly saha: Saha }) {
  const layout = FIELD_LAYOUTS.get(saha.id);
  const focusPeron = useAppStore((state) => state.focusPeron);
  if (!layout) return null;
  return (
    <group>
      <mesh position={[layout.centerX, -0.12, 0]} receiveShadow>
        <boxGeometry args={[layout.width, 0.2, layout.depth]} />
        <meshStandardMaterial color="#0e1b2b" roughness={0.95} />
      </mesh>
      <Grid position={[layout.centerX, 0.001, 0]} args={[layout.width, layout.depth]} cellSize={1} cellColor="#22354b" sectionColor="#36506d" fadeDistance={120} />
      <RoadMarkings saha={saha} layout={layout} />
      <Text position={[layout.centerX, 0.25, -layout.depth / 2 - 1.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.45} color="#e2e8f0" anchorX="center">{saha.name}</Text>
      {saha.blocks.map((block) => {
        const blockLayout = layout.blocks.get(block.id);
        if (!blockLayout) return null;
        const labelX = layout.centerX + blockLayout.x;
        const labelZ = -layout.depth / 2 + SCENE_CONFIG.fieldPadding + blockLayout.z;

        const laneLetter = block.category;
        const labelColor = '#fbbf24';

        const cornerLabels: Array<{ x: number; z: number }> = [];
        const zTop = labelZ - blockLayout.depth / 2 - 0.35;
        const zBottom = labelZ + blockLayout.depth / 2 + 0.35;
        const peronNumberLabels = block.laneDepths.map((_depth, col) => ({
          x: worldSlot(saha.id, block.id, col, 0)[0],
          number: col + 1,
        }));

        if (block.side === 'L') {
          const xInner = layout.centerX - SCENE_CONFIG.centerAisle / 2 - 0.45;
          const xOuter = layout.centerX + blockLayout.x - blockLayout.width / 2 - 0.45;
          cornerLabels.push({ x: xInner, z: zTop }, { x: xInner, z: zBottom });
          cornerLabels.push({ x: xOuter, z: zTop }, { x: xOuter, z: zBottom });
        } else if (block.side === 'R') {
          const xInner = layout.centerX + SCENE_CONFIG.centerAisle / 2 + 0.45;
          const xOuter = layout.centerX + blockLayout.x + blockLayout.width / 2 + 0.45;
          cornerLabels.push({ x: xInner, z: zTop }, { x: xInner, z: zBottom });
          cornerLabels.push({ x: xOuter, z: zTop }, { x: xOuter, z: zBottom });
        } else {
          const xLeft = layout.centerX - blockLayout.width / 2 - 0.45;
          const xRight = layout.centerX + blockLayout.width / 2 + 0.45;
          cornerLabels.push({ x: xLeft, z: zTop }, { x: xLeft, z: zBottom });
          cornerLabels.push({ x: xRight, z: zTop }, { x: xRight, z: zBottom });
        }

        return (
          <group key={block.id}>
            <mesh position={[labelX, 0.002, labelZ]} receiveShadow>
              <boxGeometry args={[blockLayout.width + 0.36, 0.045, blockLayout.depth + 0.36]} />
              <meshStandardMaterial color="#102a43" emissive="#061525" emissiveIntensity={0.18} roughness={0.96} />
              <Edges color="#52b7f0" threshold={15} />
            </mesh>
            <Slots saha={saha} block={block} />
            <Text position={[labelX, 0.08, labelZ]} rotation={[-Math.PI / 2, 0, 0]} fontSize={Math.min(0.85, blockLayout.width / 7)} color={block.special ? '#ffffff' : SCENE_CONFIG.palette[block.category] ?? '#fff'} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#07111f" onClick={(event) => { event.stopPropagation(); if (event.delta <= 4) focusPeron(saha.id, block.id); }}>
              {block.category}
            </Text>
            {block.planLabel && block.planLabel !== block.category && <Text position={[labelX, 0.075, labelZ + 0.72]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#cbd5e1" anchorX="center" anchorY="middle">PDF: {block.planLabel}</Text>}
            {peronNumberLabels.flatMap((peron) => [
              <Text key={`front-${peron.number}`} position={[peron.x, 0.065, zTop]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} color="#fde047" fontWeight="bold" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#07111f" onClick={(event) => { event.stopPropagation(); if (event.delta <= 4) focusPeron(saha.id, block.id); }}>{peron.number}</Text>,
              <Text key={`back-${peron.number}`} position={[peron.x, 0.065, zBottom]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={0.2} color="#fde047" fontWeight="bold" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#07111f" onClick={(event) => { event.stopPropagation(); if (event.delta <= 4) focusPeron(saha.id, block.id); }}>{peron.number}</Text>,
            ])}
            {cornerLabels.map((pt, idx) => (
              <Text key={idx} position={[pt.x, 0.055, pt.z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color={labelColor} fontWeight="bold" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#07111f">
                {laneLetter}
              </Text>
            ))}
          </group>
        );
      })}
    </group>
  );
}

export function SahaScene() {
  const mode = useAppStore((state) => state.viewMode);
  const setCanvas = useAppStore((state) => state.setCanvas);
  return (
    <div className="scene" aria-label="İki sahanın etkileşimli 3B görünümü">
      <Canvas key={mode} orthographic={mode === '2d'} shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={mode === '2d' ? { position: SCENE_CONFIG.camera.orthographic, zoom: 12, near: 0.1, far: 300 } : { position: SCENE_CONFIG.camera.perspective, fov: 42, near: 0.1, far: 300 }} onCreated={({ gl }) => setCanvas(gl.domElement)}>
        <color attach="background" args={['#07111f']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[20, 50, 15]} intensity={2.2} castShadow />
        {SAHALAR.map((saha) => <Field key={saha.id} saha={saha} />)}
        <CameraController />
      </Canvas>
    </div>
  );
}
