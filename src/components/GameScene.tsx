/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState } from '../store/gameStore';
import { WORLD_SIZE, TURN_SPEED, BOOST_SPEED, BASE_SPEED, getTables, getMovingObstacles, MOVING_OBSTACLES_CONFIGS, MovingObstacleConfig } from '../shared/types';
import { playPizzaCollectSound, playCrashSound, playShieldCollectSound, playShieldPopSound, playPizzaShootSound } from '../utils/audio';
import * as THREE from 'three';

const localCollectedOrbs = new Set<string>();
const tablesList = getTables();

function shadeColor(color: string, percent: number): string {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.min(255, Math.max(0, R + percent));
  G = Math.min(255, Math.max(0, G + percent));
  B = Math.min(255, Math.max(0, B + percent));

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}


// Chef model facing local +X axis by default
export function ChefModel({ color }: { color: string }) {
  const headSize = 0.38;

  return (
    <group>
      {/* ==================== 1. MOTORCYCLE / SCOOTER VEHICLE ==================== */}
      
      {/* Back / Main Body Frame (Vespa curved style) */}
      <mesh position={[-0.15, 0, 0.25]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.45, 0.45]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.9} 
          roughness={0.15} 
        />
      </mesh>
      
      {/* Front Nose Shield / Apron */}
      <mesh position={[0.3, 0, 0.45]} rotation={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.1, 0.48, 0.65]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.9} 
          roughness={0.15} 
        />
      </mesh>

      {/* Floorboard / Leg rest */}
      <mesh position={[0.1, 0, 0.15]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.06]} />
        <meshStandardMaterial color="#1e272e" roughness={0.9} />
      </mesh>

      {/* Front Wheel Mudguard */}
      <mesh position={[0.48, 0, 0.2]} castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      {/* Front Wheel */}
      <group position={[0.48, 0, -0.05]}>
        {/* Tire */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
          <meshStandardMaterial color="#0b0c10" roughness={0.95} />
        </mesh>
        {/* Steel Rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.13, 12]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Rear Wheel */}
      <group position={[-0.45, 0, -0.05]}>
        {/* Tire */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
          <meshStandardMaterial color="#0b0c10" roughness={0.95} />
        </mesh>
        {/* Steel Rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.13, 12]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Handlebars / Steering column */}
      <group position={[0.3, 0, 0.72]}>
        {/* Fork Column */}
        <mesh position={[0, 0, -0.1]} rotation={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Horizontal Bar */}
        <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.65, 8]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Left Grip */}
        <mesh position={[0, -0.31, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.1, 8]} />
          <meshStandardMaterial color="#1e272e" roughness={0.9} />
        </mesh>
        {/* Right Grip */}
        <mesh position={[0, 0.31, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.1, 8]} />
          <meshStandardMaterial color="#1e272e" roughness={0.9} />
        </mesh>
        {/* Rearview Mirrors */}
        <group position={[-0.03, -0.22, 0.16]}>
          <mesh rotation={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
            <meshStandardMaterial color="#bdc3c7" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.08]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
            <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.1} />
          </mesh>
        </group>
        <group position={[-0.03, 0.22, 0.16]}>
          <mesh rotation={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
            <meshStandardMaterial color="#bdc3c7" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.08]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
            <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.1} />
          </mesh>
        </group>
      </group>

      {/* Headlight (Glowing front circle) */}
      <mesh position={[0.42, 0, 0.68]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffeaa7" 
          emissiveIntensity={5.0} 
          roughness={0.1}
        />
      </mesh>

      {/* Red Tail Light */}
      <mesh position={[-0.52, 0, 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.05]} />
        <meshStandardMaterial 
          color="#ff0000" 
          emissive="#ff3f34" 
          emissiveIntensity={4.0} 
        />
      </mesh>

      {/* Exhaust Pipe */}
      <mesh position={[-0.45, -0.22, 0.08]} rotation={[0.1, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.04, 0.45, 8]} />
        <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.05} />
      </mesh>


      {/* ==================== 2. DELIVERY CHEF RIDER ==================== */}

      {/* Seat */}
      <mesh position={[-0.08, 0, 0.5]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.08]} />
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </mesh>

      {/* Rider's Torso */}
      <group position={[-0.08, 0, 0.72]} rotation={[0, 0.15, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.26, 0.24, 0.42, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        
        {/* Red Scarf */}
        <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.04, 8, 16]} />
          <meshStandardMaterial color="#d63031" roughness={0.7} />
        </mesh>

        {/* Buttons */}
        <mesh position={[0.22, -0.06, 0.05]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#2d3436" roughness={0.5} />
        </mesh>
        <mesh position={[0.22, 0.06, 0.05]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#2d3436" roughness={0.5} />
        </mesh>
        <mesh position={[0.22, -0.06, -0.05]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#2d3436" roughness={0.5} />
        </mesh>
        <mesh position={[0.22, 0.06, -0.05]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#2d3436" roughness={0.5} />
        </mesh>

        {/* Arms holding handlebars */}
        <mesh position={[0.18, -0.18, 0.1]} rotation={[0.4, 0.6, -0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.32, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        <mesh position={[0.18, 0.18, 0.1]} rotation={[-0.4, 0.6, 0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.32, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>

        {/* Skin Head */}
        <group position={[0.04, 0, 0.35]}>
          <mesh castShadow>
            <sphereGeometry args={[headSize, 16, 16]} />
            <meshStandardMaterial color="#ffddc1" roughness={0.6} />
          </mesh>

          {/* Cute Chef Nose */}
          <mesh position={[0.35, 0, 0.01]} castShadow>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color="#ffb090" roughness={0.5} />
          </mesh>

          {/* Expressive Eyes (Nestled behind the goggles) */}
          {/* Left Eye Sclera */}
          <mesh position={[0.31, -0.09, 0.08]} castShadow>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          {/* Left Eye Pupil */}
          <mesh position={[0.365, -0.09, 0.08]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#1e272e" roughness={0.4} />
          </mesh>

          {/* Right Eye Sclera */}
          <mesh position={[0.31, 0.09, 0.08]} castShadow>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
          {/* Right Eye Pupil */}
          <mesh position={[0.365, 0.09, 0.08]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#1e272e" roughness={0.4} />
          </mesh>

          {/* Rosy Cheeks */}
          <mesh position={[0.29, -0.18, -0.02]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ff7979" roughness={0.8} />
          </mesh>
          <mesh position={[0.29, 0.18, -0.02]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ff7979" roughness={0.8} />
          </mesh>

          {/* Happy Open Smile */}
          <mesh position={[0.31, 0, -0.13]}>
            <boxGeometry args={[0.02, 0.08, 0.04]} />
            <meshStandardMaterial color="#5c0000" roughness={0.9} />
          </mesh>

          {/* Elegant Curly Chef Mustache */}
          {/* Center Connection */}
          <mesh position={[0.34, 0, -0.05]} castShadow>
            <boxGeometry args={[0.05, 0.06, 0.06]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.9} />
          </mesh>
          {/* Left Wing */}
          <mesh position={[0.33, -0.08, -0.06]} rotation={[0.1, 0, -0.25]} castShadow>
            <boxGeometry args={[0.06, 0.15, 0.07]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.9} />
          </mesh>
          {/* Left Curly Tip */}
          <mesh position={[0.31, -0.16, -0.04]} rotation={[0, 0, -0.6]} castShadow>
            <boxGeometry args={[0.05, 0.08, 0.05]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.9} />
          </mesh>
          {/* Right Wing */}
          <mesh position={[0.33, 0.08, -0.06]} rotation={[-0.1, 0, 0.25]} castShadow>
            <boxGeometry args={[0.06, 0.15, 0.07]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.9} />
          </mesh>
          {/* Right Curly Tip */}
          <mesh position={[0.31, 0.16, -0.04]} rotation={[0, 0, 0.6]} castShadow>
            <boxGeometry args={[0.05, 0.08, 0.05]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.9} />
          </mesh>

          {/* Eyes with Glasses/Goggles */}
          <group position={[0.24, 0, 0.06]}>
            <mesh position={[-0.1, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.28, 0.02, 6, 16]} />
              <meshStandardMaterial color="#2d3436" roughness={0.9} />
            </mesh>
            {/* Left Lens Frame & Glass (aligned correctly pointing forward!) */}
            <mesh position={[0.1, -0.09, 0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.085, 0.085, 0.03, 12]} />
              <meshStandardMaterial color="#2d3436" roughness={0.9} />
            </mesh>
            <mesh position={[0.11, -0.09, 0.02]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.075, 0.075, 0.031, 12]} />
              <meshStandardMaterial color="#0984e3" metalness={0.9} roughness={0.1} transparent opacity={0.65} />
            </mesh>
            {/* Right Lens Frame & Glass (aligned correctly pointing forward!) */}
            <mesh position={[0.1, 0.09, 0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.085, 0.085, 0.03, 12]} />
              <meshStandardMaterial color="#2d3436" roughness={0.9} />
            </mesh>
            <mesh position={[0.11, 0.09, 0.02]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.075, 0.075, 0.031, 12]} />
              <meshStandardMaterial color="#0984e3" metalness={0.9} roughness={0.1} transparent opacity={0.65} />
            </mesh>
            {/* Goggles Bridge */}
            <mesh position={[0.1, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
              <meshStandardMaterial color="#2d3436" roughness={0.9} />
            </mesh>
          </group>

          {/* Chef Hat */}
          <group position={[-0.05, 0, 0.32]} rotation={[0, -0.08, 0]}>
            <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.12, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.1]} castShadow>
              <sphereGeometry args={[0.34, 16, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
          </group>
        </group>
      </group>


      {/* ==================== 3. BACK DELIVERY RACK & PIZZA BOX STACK ==================== */}
      
      {/* Chrome Luggage Rack Structure */}
      <group position={[-0.58, 0, 0.44]}>
        <mesh position={[0.1, -0.12, -0.12]} rotation={[0.4, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.95} />
        </mesh>
        <mesh position={[0.1, 0.12, -0.12]} rotation={[-0.4, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.95} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.35, 0.02]} />
          <meshStandardMaterial color="#bdc3c7" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Stack of static Pizza Boxes on the back rack */}
      {/* Box 1 (Bottom, largest, aligned) */}
      <group position={[-0.58, 0, 0.52]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.34, 0.07]} />
          <meshStandardMaterial color="#f5f6fa" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.036]}>
          <boxGeometry args={[0.34, 0.06, 0.002]} />
          <meshStandardMaterial color="#e84118" roughness={0.7} />
        </mesh>
        <mesh position={[0.1, 0, 0.036]}>
          <boxGeometry args={[0.02, 0.34, 0.002]} />
          <meshStandardMaterial color="#44bd32" roughness={0.7} />
        </mesh>
      </group>

      {/* Box 2 (Middle, slightly smaller, slightly rotated) */}
      <group position={[-0.58, 0.02, 0.6]} rotation={[0, 0, 0.18]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.32, 0.07]} />
          <meshStandardMaterial color="#f5f6fa" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.036]}>
          <boxGeometry args={[0.32, 0.05, 0.002]} />
          <meshStandardMaterial color="#e84118" roughness={0.7} />
        </mesh>
        <mesh position={[-0.08, 0, 0.036]}>
          <boxGeometry args={[0.02, 0.32, 0.002]} />
          <meshStandardMaterial color="#44bd32" roughness={0.7} />
        </mesh>
      </group>

      {/* Box 3 (Top, slightly smaller, rotated the other way) */}
      <group position={[-0.58, -0.01, 0.68]} rotation={[0, 0, -0.12]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.3, 0.07]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.036]}>
          <boxGeometry args={[0.12, 0.12, 0.002]} />
          <meshStandardMaterial color="#e84118" roughness={0.7} />
        </mesh>
      </group>

    </group>
  );
}

function InstancedTables({ clothTexture }: { clothTexture: THREE.CanvasTexture }) {
  const poleMeshRef = useRef<THREE.InstancedMesh>(null);
  const plateMeshRef = useRef<THREE.InstancedMesh>(null);
  const topMeshRef = useRef<THREE.InstancedMesh>(null);
  const clothMeshRef = useRef<THREE.InstancedMesh>(null);
  const chairSeatMeshRef = useRef<THREE.InstancedMesh>(null);
  const chairBackMeshRef = useRef<THREE.InstancedMesh>(null);
  const chairLegsMeshRef = useRef<THREE.InstancedMesh>(null);

  const radius = 2.4; // Collidable radius of the tables (constant)

  // Geometries memoization
  const geometries = useMemo(() => {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8);
    poleGeo.rotateX(Math.PI / 2); // align along Z axis as originally positioned

    const plateGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12);
    plateGeo.rotateX(Math.PI / 2);

    const topGeo = new THREE.CylinderGeometry(radius, radius, 0.1, 24);
    topGeo.rotateX(Math.PI / 2);

    const clothGeo = new THREE.CylinderGeometry(radius - 0.05, radius - 0.05, 0.02, 24);
    clothGeo.rotateX(Math.PI / 2);

    const seatGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);

    const backGeo = new THREE.BoxGeometry(0.08, 0.5, 0.7);

    const legsGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    legsGeo.rotateX(Math.PI / 2);

    return { poleGeo, plateGeo, topGeo, clothGeo, seatGeo, backGeo, legsGeo };
  }, []);

  // Materials memoization
  const materials = useMemo(() => {
    const poleMat = new THREE.MeshStandardMaterial({ color: '#7f8c8d', metalness: 0.8, roughness: 0.2 });
    const plateMat = new THREE.MeshStandardMaterial({ color: '#2c3e50', metalness: 0.6, roughness: 0.4 });
    const topMat = new THREE.MeshStandardMaterial({ color: '#d35400', roughness: 0.5 });
    const clothMat = new THREE.MeshStandardMaterial({ map: clothTexture, roughness: 0.8 });
    const seatMat = new THREE.MeshStandardMaterial({ color: '#7f8c8d', roughness: 0.8 });
    const backMat = new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.6 });
    const legsMat = new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.5 });
    return { poleMat, plateMat, topMat, clothMat, seatMat, backMat, legsMat };
  }, [clothTexture]);

  useEffect(() => {
    if (
      !poleMeshRef.current ||
      !plateMeshRef.current ||
      !topMeshRef.current ||
      !clothMeshRef.current ||
      !chairSeatMeshRef.current ||
      !chairBackMeshRef.current ||
      !chairLegsMeshRef.current
    ) {
      return;
    }

    const tables = tablesList;
    const tableCount = tables.length;

    let tableIdx = 0;
    let chairIdx = 0;

    const dummy = new THREE.Object3D();

    for (const table of tables) {
      // Base table transform matrix
      const tx = table.x;
      const ty = table.y;

      // 1. Pole: position [0, 0, 0.5]
      dummy.position.set(tx, ty, 0.5);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poleMeshRef.current.setMatrixAt(tableIdx, dummy.matrix);

      // 2. Plate: position [0, 0, 0.05]
      dummy.position.set(tx, ty, 0.05);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      plateMeshRef.current.setMatrixAt(tableIdx, dummy.matrix);

      // 3. Wood Top: position [0, 0, 1.05]
      dummy.position.set(tx, ty, 1.05);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      topMeshRef.current.setMatrixAt(tableIdx, dummy.matrix);

      // 4. Cloth: position [0, 0, 1.11]
      dummy.position.set(tx, ty, 1.11);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      clothMeshRef.current.setMatrixAt(tableIdx, dummy.matrix);

      // Chairs (4 around each table)
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const chairDist = radius + 0.6;
        const chairX = Math.cos(angle) * chairDist;
        const chairY = Math.sin(angle) * chairDist;

        const groupPosition = new THREE.Vector3(tx + chairX, ty + chairY, 0);
        const groupRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle + Math.PI));

        // Seat: position [0, 0, 0.45] in group
        const seatPosLocal = new THREE.Vector3(0, 0, 0.45);
        const seatPosWorld = seatPosLocal.clone().applyQuaternion(groupRotation).add(groupPosition);
        dummy.position.copy(seatPosWorld);
        dummy.rotation.set(0, 0, angle + Math.PI);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        chairSeatMeshRef.current.setMatrixAt(chairIdx, dummy.matrix);

        // Back: position [-0.22, 0, 0.8] in group
        const backPosLocal = new THREE.Vector3(-0.22, 0, 0.8);
        const backPosWorld = backPosLocal.clone().applyQuaternion(groupRotation).add(groupPosition);
        dummy.position.copy(backPosWorld);
        dummy.rotation.set(0, 0, angle + Math.PI);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        chairBackMeshRef.current.setMatrixAt(chairIdx, dummy.matrix);

        // Legs: position [0, 0, 0.2], rotation [Math.PI / 2, 0, 0] in group
        const legsPosLocal = new THREE.Vector3(0, 0, 0.2);
        const legsPosWorld = legsPosLocal.clone().applyQuaternion(groupRotation).add(groupPosition);
        dummy.position.copy(legsPosWorld);
        const legsRotLocal = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
        const legsRotWorld = groupRotation.clone().multiply(legsRotLocal);
        dummy.rotation.setFromQuaternion(legsRotWorld);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        chairLegsMeshRef.current.setMatrixAt(chairIdx, dummy.matrix);

        chairIdx++;
      }

      tableIdx++;
    }

    poleMeshRef.current.count = tableIdx;
    poleMeshRef.current.instanceMatrix.needsUpdate = true;

    plateMeshRef.current.count = tableIdx;
    plateMeshRef.current.instanceMatrix.needsUpdate = true;

    topMeshRef.current.count = tableIdx;
    topMeshRef.current.instanceMatrix.needsUpdate = true;

    clothMeshRef.current.count = tableIdx;
    clothMeshRef.current.instanceMatrix.needsUpdate = true;

    chairSeatMeshRef.current.count = chairIdx;
    chairSeatMeshRef.current.instanceMatrix.needsUpdate = true;

    chairBackMeshRef.current.count = chairIdx;
    chairBackMeshRef.current.instanceMatrix.needsUpdate = true;

    chairLegsMeshRef.current.count = chairIdx;
    chairLegsMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [geometries, materials]);

  return (
    <group>
      <instancedMesh ref={poleMeshRef} args={[null as any, null as any, 100]} castShadow>
        <primitive object={geometries.poleGeo} />
        <primitive object={materials.poleMat} />
      </instancedMesh>
      <instancedMesh ref={plateMeshRef} args={[null as any, null as any, 100]} castShadow>
        <primitive object={geometries.plateGeo} />
        <primitive object={materials.plateMat} />
      </instancedMesh>
      <instancedMesh ref={topMeshRef} args={[null as any, null as any, 100]} castShadow receiveShadow>
        <primitive object={geometries.topGeo} />
        <primitive object={materials.topMat} />
      </instancedMesh>
      <instancedMesh ref={clothMeshRef} args={[null as any, null as any, 100]} castShadow receiveShadow>
        <primitive object={geometries.clothGeo} />
        <primitive object={materials.clothMat} />
      </instancedMesh>
      <instancedMesh ref={chairSeatMeshRef} args={[null as any, null as any, 400]} castShadow>
        <primitive object={geometries.seatGeo} />
        <primitive object={materials.seatMat} />
      </instancedMesh>
      <instancedMesh ref={chairBackMeshRef} args={[null as any, null as any, 400]} castShadow>
        <primitive object={geometries.backGeo} />
        <primitive object={materials.backMat} />
      </instancedMesh>
      <instancedMesh ref={chairLegsMeshRef} args={[null as any, null as any, 400]} castShadow>
        <primitive object={geometries.legsGeo} />
        <primitive object={materials.legsMat} />
      </instancedMesh>
    </group>
  );
}


function MovingObstacle({ config }: { config: MovingObstacleConfig }) {
  const ref = useRef<THREE.Group>(null);
  const trayRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const time = Date.now() / 1000;
    const angle = time * config.speed;
    const x = config.cx + Math.cos(angle) * config.patrolRadius;
    const y = config.cy + Math.sin(angle) * config.patrolRadius;
    
    ref.current.position.set(x, y, 0);
    ref.current.rotation.set(0, 0, angle + Math.PI / 2);

    if (config.type === 'waiter') {
      ref.current.position.z = Math.abs(Math.sin(time * 8)) * 0.15;
      if (trayRef.current) {
        trayRef.current.rotation.z = Math.sin(time * 12) * 0.1;
        trayRef.current.rotation.x = Math.cos(time * 10) * 0.05;
      }
    } else {
      if (trayRef.current) {
        trayRef.current.rotation.z = time * 5;
      }
    }
  });

  return (
    <group ref={ref}>
      {config.type === 'waiter' ? (
        <group>
          {/* Waiter Suit / Torso */}
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 0.9, 12]} />
            <meshStandardMaterial color="#1e272e" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.45, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>

          {/* Red Tie */}
          <mesh position={[0.22, 0, 0.65]} castShadow>
            <boxGeometry args={[0.1, 0.08, 0.3]} />
            <meshStandardMaterial color="#ea2027" roughness={0.5} />
          </mesh>

          {/* Skin Head */}
          <mesh position={[0, 0, 1.15]} castShadow>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshStandardMaterial color="#fed330" roughness={0.6} />
          </mesh>

          {/* Chef / Baker Hat */}
          <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.28, 0.4, 16]} />
            <meshStandardMaterial color="#f5f6fa" roughness={0.9} />
          </mesh>

          {/* Arms holding the tray */}
          <mesh position={[0.2, 0.2, 0.5]} rotation={[0.4, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>
          <mesh position={[0.2, -0.2, 0.5]} rotation={[-0.4, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>

          {/* Serving Tray with Pizzas / wobbly accessories */}
          <group ref={trayRef} position={[0.35, 0, 0.65]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.5, 0.5, 0.04, 12]} />
              <meshStandardMaterial color="#d2d2d2" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0.08]} castShadow>
              <boxGeometry args={[0.35, 0.35, 0.08]} />
              <meshStandardMaterial color="#d35400" roughness={0.5} />
            </mesh>
            <mesh position={[0.18, 0.18, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.06, 0.2, 8]} />
              <meshStandardMaterial color="#ea2027" roughness={0.3} />
            </mesh>
          </group>
        </group>
      ) : (
        <group>
          {/* Cleaning Robot body (Roomba) */}
          <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.25, 16]} />
            <meshStandardMaterial color="#2f3640" metalness={0.5} roughness={0.3} />
          </mesh>

          {/* Inner details */}
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.04, 16]} />
            <meshStandardMaterial color="#353b48" roughness={0.5} />
          </mesh>

          {/* Blinking Sensor Dome */}
          <mesh position={[0, 0, 0.29]} castShadow>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#00a8ff" emissive="#00a8ff" emissiveIntensity={1.5} />
          </mesh>

          {/* Little green/orange status lights */}
          <mesh position={[0.45, 0.45, 0.25]} castShadow>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#4cd137" emissive="#4cd137" emissiveIntensity={2.0} />
          </mesh>
          <mesh position={[-0.45, -0.45, 0.25]} castShadow>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#e1b12c" emissive="#e1b12c" emissiveIntensity={2.0} />
          </mesh>

          {/* Spinning floor sweeper brush */}
          <group ref={trayRef} position={[0, 0, 0.02]}>
            <mesh position={[0.7, 0, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.06, 0.02]} />
              <meshStandardMaterial color="#e1b12c" />
            </mesh>
            <mesh position={[-0.7, 0, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.06, 0.02]} />
              <meshStandardMaterial color="#e1b12c" />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

function PizzeriaWalls() {
  const wallThickness = 2;
  const wallHeight = 4;
  const halfSize = WORLD_SIZE / 2;

  return (
    <group>
      {/* Top Wall */}
      <mesh position={[0, halfSize + wallThickness / 2, wallHeight / 2]} castShadow receiveShadow>
        <boxGeometry args={[WORLD_SIZE + wallThickness * 2, wallThickness, wallHeight]} />
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </mesh>
      {/* Bottom Wall */}
      <mesh position={[0, -halfSize - wallThickness / 2, wallHeight / 2]} castShadow receiveShadow>
        <boxGeometry args={[WORLD_SIZE + wallThickness * 2, wallThickness, wallHeight]} />
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-halfSize - wallThickness / 2, 0, wallHeight / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, WORLD_SIZE, wallHeight]} />
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[halfSize + wallThickness / 2, 0, wallHeight / 2]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, WORLD_SIZE, wallHeight]} />
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Snake({ playerId, color, isLocal, boxTexture }: { playerId: string, color: string, isLocal: boolean, boxTexture: THREE.CanvasTexture }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const shieldVisualRef = useRef<THREE.Mesh>(null);
  const boostFlameRef = useRef<THREE.Mesh>(null);
  const trailMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{x: number, y: number}[]>([]);

  const trailParticles = useRef<{
    x: number;
    y: number;
    z: number;
    life: number;
    decay: number;
    size: number;
    vx: number;
    vy: number;
    vz: number;
  }[]>([]);

  const trailGeometry = useMemo(() => {
    return new THREE.OctahedronGeometry(0.35, 0);
  }, []);

  const trailMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [color]);

  const boxMaterials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color: '#e5dec9', // Warm authentic light cardboard
      roughness: 0.6,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: boxTexture,
      roughness: 0.8,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: '#c4b9a3', // Darker underside cardboard
      roughness: 0.85,
    });
    return [sideMat, sideMat, sideMat, sideMat, topMat, bottomMat];
  }, [boxTexture]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      if (trailMeshRef.current) {
        trailMeshRef.current.count = 0;
      }
      return;
    }
    
    headRef.current.visible = true;
    const isInvincible = player.invincibleUntil ? Date.now() < player.invincibleUntil : false;
    if (isInvincible) {
      const flash = Math.floor(Date.now() / 150) % 2 === 0;
      headRef.current.visible = flash;
      bodyRef.current.visible = flash;
    } else {
      headRef.current.visible = true;
      bodyRef.current.visible = true;
    }

    // Animate shield bubble
    const hasShield = !!player.hasShield;
    if (shieldVisualRef.current) {
      shieldVisualRef.current.visible = hasShield;
      if (hasShield) {
        const pulse = 1.7 + Math.sin(state.clock.getElapsedTime() * 6.0) * 0.12;
        shieldVisualRef.current.scale.set(pulse, pulse, pulse);
        shieldVisualRef.current.rotation.y = state.clock.getElapsedTime() * 1.5;
        shieldVisualRef.current.rotation.x = state.clock.getElapsedTime() * 0.5;
      }
    }

    // Animate boost flame
    if (boostFlameRef.current) {
      const isBoosting = !!player.isBoosting;
      boostFlameRef.current.visible = isBoosting;
      if (isBoosting) {
        const pulseX = 1.0 + Math.sin(state.clock.getElapsedTime() * 30.0) * 0.25;
        const pulseYZ = 0.8 + Math.cos(state.clock.getElapsedTime() * 30.0) * 0.15;
        boostFlameRef.current.scale.set(pulseX, pulseYZ, pulseYZ);
      }
    }

    // Update and animate trail particles
    if (trailMeshRef.current) {
      const particles = trailParticles.current;

      // Spawn new trail particles
      if (player.state === 'alive' && player.segments.length > 0) {
        const head = player.segments[0];
        const isBoosting = !!player.isBoosting;
        const spawnCount = isBoosting ? 2 : 1;

        for (let s = 0; s < spawnCount; s++) {
          // Shoot particles backwards based on current moving angle
          const angle = player.currentAngle;
          const speedFactor = isBoosting ? 2.5 : 1.2;
          particles.push({
            x: head.x + (Math.random() - 0.5) * 0.25,
            y: head.y + (Math.random() - 0.5) * 0.25,
            z: 0.15 + Math.random() * 0.2,
            life: 1.0,
            decay: isBoosting ? 1.4 : 1.0, // boosting particles fade slightly quicker for shorter hot trails
            size: isBoosting ? 0.45 : 0.32,
            vx: -Math.cos(angle) * speedFactor + (Math.random() - 0.5) * 0.4,
            vy: -Math.sin(angle) * speedFactor + (Math.random() - 0.5) * 0.4,
            vz: 0.1 + Math.random() * 0.2,
          });
        }
      }

      // Safeguard total trail particles per player
      if (particles.length > 150) {
        particles.splice(0, particles.length - 150);
      }

      // Update particle physics and build instanced transformation matrices
      let activeCount = 0;
      const time = state.clock.getElapsedTime();
      for (let j = 0; j < particles.length; j++) {
        const p = particles[j];
        p.life -= p.decay * delta;
        if (p.life > 0) {
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;

          dummy.position.set(p.x, p.y, p.z);
          const scale = p.size * p.life;
          dummy.scale.set(scale, scale, scale);
          dummy.rotation.set(time * 3 + j, time * 2, 0);
          dummy.updateMatrix();

          trailMeshRef.current.setMatrixAt(activeCount, dummy.matrix);

          if (activeCount !== j) {
            particles[activeCount] = p;
          }
          activeCount++;
        }
      }
      particles.length = activeCount;
      trailMeshRef.current.count = activeCount;
      trailMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    
    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({ 
        x: player.segments[idx]?.x || 0, 
        y: player.segments[idx]?.y || 0 
      });
    }

    for (let i = 0; i < count; i++) {
      let targetX = player.segments[i].x;
      let targetY = player.segments[i].y;
      
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }
      
      if (i === 0) {
        headRef.current.position.set(curr.x, curr.y, 0.5);
        headRef.current.rotation.set(0, 0, player.currentAngle);
      } else {
        // Pizza boxes: slightly float and trail
        dummy.position.set(curr.x, curr.y, 0.22 + Math.sin(state.clock.getElapsedTime() * 5 + i * 0.3) * 0.03);
        dummy.rotation.set(0, 0, player.currentAngle);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <group ref={headRef} scale={[2.1, 2.1, 2.1]}>
        <ChefModel color={color} />
        <mesh ref={boostFlameRef} position={[-0.5, 0, 0.25]} rotation={[0, -Math.PI / 2, 0]}>
          <coneGeometry args={[0.3, 0.8, 8]} />
          <meshStandardMaterial
            color="#ff4500"
            emissive="#ff0000"
            emissiveIntensity={5.0}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
        <mesh ref={shieldVisualRef}>
          <sphereGeometry args={[1.0, 16, 16]} />
          <meshStandardMaterial
            color="#00f0ff"
            emissive="#00d2d3"
            emissiveIntensity={1.8}
            transparent={true}
            opacity={0.35}
            roughness={0.1}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <instancedMesh ref={bodyRef} args={[null as any, null as any, 2000]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1.5, 1.5, 0.35]} />
        <primitive object={boxMaterials[0]} attach="material-0" />
        <primitive object={boxMaterials[1]} attach="material-1" />
        <primitive object={boxMaterials[2]} attach="material-2" />
        <primitive object={boxMaterials[3]} attach="material-3" />
        <primitive object={boxMaterials[4]} attach="material-4" />
        <primitive object={boxMaterials[5]} attach="material-5" />
      </instancedMesh>

      <instancedMesh ref={trailMeshRef} args={[null as any, null as any, 200]} frustumCulled={false}>
        <primitive object={trailGeometry} />
        <primitive object={trailMaterial} />
      </instancedMesh>
    </group>
  );
}

function Projectiles({ pizzaTexture }: { pizzaTexture: THREE.CanvasTexture }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const pizzaGeometry = useMemo(() => {
    // A smaller, thinner pizza slice or whole pizza that flies
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const materials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color: '#ff4757', // glowing pepperoni red
      emissive: '#ff4757',
      emissiveIntensity: 1.5,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: pizzaTexture,
      emissive: '#ffa502', // cheese glowing
      emissiveIntensity: 1.0,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: '#d4a359',
    });
    return [sideMat, topMat, bottomMat];
  }, [pizzaTexture]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const gs = globalGameState.current;
    if (!gs || !gs.projectiles) {
      meshRef.current.count = 0;
      return;
    }

    const time = state.clock.getElapsedTime();
    let idx = 0;

    for (const projId in gs.projectiles) {
      const proj = gs.projectiles[projId];
      if (idx >= 300) break; // cap at 300 projectiles on screen

      dummy.position.set(proj.x, proj.y, 0.3);
      // Fast spin around Z-axis and slightly tumble
      dummy.rotation.set(0, 0, time * 20 + idx * 0.5);
      dummy.scale.set(1.2, 1.2, 1.2);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(idx, dummy.matrix);
      idx++;
    }

    meshRef.current.count = idx;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, 300]} frustumCulled={false}>
      <primitive object={pizzaGeometry} />
      <primitive object={materials[0]} attach="material-0" />
      <primitive object={materials[1]} attach="material-1" />
      <primitive object={materials[2]} attach="material-2" />
    </instancedMesh>
  );
}

function Orbs({ pizzaTexture }: { pizzaTexture: THREE.CanvasTexture }) {
  const pizzaMeshRef = useRef<THREE.InstancedMesh>(null);
  const shieldMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const pizzaGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.22, 16);
    geo.rotateX(Math.PI / 2); // Make caps face the Z axis (upward)
    return geo;
  }, []);

  const shieldGeometry = useMemo(() => {
    return new THREE.OctahedronGeometry(1.0, 0);
  }, []);

  const pizzaMaterials = useMemo(() => {
    const crustMat = new THREE.MeshStandardMaterial({
      color: '#d4a359',
      roughness: 0.9,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: pizzaTexture,
      roughness: 0.6,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: '#c2934a',
      roughness: 0.9,
    });
    return [crustMat, topMat, bottomMat];
  }, [pizzaTexture]);

  const shieldMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#00f0ff',
      emissive: '#00d2d3',
      emissiveIntensity: 3.0,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9,
    });
  }, []);

  useFrame((state) => {
    if (!pizzaMeshRef.current || !shieldMeshRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    const time = state.clock.getElapsedTime();
    let pizzaIdx = 0;
    let shieldIdx = 0;

    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];
      
      if (orb.isShield) {
        // Floating & spinning shield power-up
        const zOffset = 0.4 + Math.sin(time * 4.5 + orb.x * 0.4) * 0.15;
        dummy.position.set(orb.x, orb.y, zOffset);
        dummy.rotation.set(time * 2.0, time * 1.5, time * 1.2);
        const pulse = 1.0 + Math.sin(time * 6.0) * 0.1;
        dummy.scale.set(pulse, pulse, pulse);
        dummy.updateMatrix();
        shieldMeshRef.current.setMatrixAt(shieldIdx, dummy.matrix);
        shieldIdx++;
      } else {
        // Floating pizzas
        const zOffset = 0.2 + Math.sin(time * 3.5 + orb.x * 0.4) * 0.12;
        dummy.position.set(orb.x, orb.y, zOffset);
        dummy.rotation.set(0, 0, time * 1.2 + orb.x);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pizzaMeshRef.current.setMatrixAt(pizzaIdx, dummy.matrix);
        pizzaIdx++;
      }
    }

    pizzaMeshRef.current.count = pizzaIdx;
    pizzaMeshRef.current.instanceMatrix.needsUpdate = true;

    shieldMeshRef.current.count = shieldIdx;
    shieldMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={pizzaMeshRef} args={[null as any, null as any, 1000]} castShadow receiveShadow frustumCulled={false}>
        <primitive object={pizzaGeometry} />
        <primitive object={pizzaMaterials[0]} attach="material-0" />
        <primitive object={pizzaMaterials[1]} attach="material-1" />
        <primitive object={pizzaMaterials[2]} attach="material-2" />
      </instancedMesh>

      <instancedMesh ref={shieldMeshRef} args={[null as any, null as any, 200]} castShadow receiveShadow frustumCulled={false}>
        <primitive object={shieldGeometry} />
        <primitive object={shieldMaterial} />
      </instancedMesh>
    </group>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb, isSolo } = useGameStore();
  const { camera } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false });
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());
  const cameraTarget = useRef({ x: 0, y: 0, z: 30 });
  const shakeIntensity = useRef(0);
  const lastShakeOffset = useRef({ x: 0, y: 0, z: 0 });

  const localPlayerRef = useRef<{
    active: boolean;
    segments: {x: number, y: number}[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
    hasShield: boolean;
    invincibleUntil?: number;
  }>({
    active: false,
    segments: [],
    score: 5,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
    hasShield: false,
  });

  // Canvas textures memoization
  const pizzaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cx = 128, cy = 128;
      
      // 1. Crust with radial gradient (golden baked wood-fired)
      const crustGrad = ctx.createRadialGradient(cx, cy, 95, cx, cy, 128);
      crustGrad.addColorStop(0, '#d35400'); // deep orange-brown edge
      crustGrad.addColorStop(0.3, '#f39c12'); // golden crust center
      crustGrad.addColorStop(0.8, '#f5b041'); // light doughy inner
      crustGrad.addColorStop(1, '#9a7d0a'); // caramelized outer rim
      ctx.fillStyle = crustGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 128, 0, Math.PI * 2);
      ctx.fill();

      // Leopard spotting (charred spots) on the crust
      ctx.fillStyle = 'rgba(40, 20, 10, 0.7)';
      const spots = [
        { x: 30, y: 100, r: 4 }, { x: 45, y: 50, r: 3 }, { x: 100, y: 25, r: 5 },
        { x: 170, y: 28, r: 4 }, { x: 220, y: 90, r: 5 }, { x: 230, y: 150, r: 3 },
        { x: 195, y: 210, r: 6 }, { x: 130, y: 240, r: 4 }, { x: 70, y: 220, r: 5 },
        { x: 25, y: 160, r: 4 }
      ];
      spots.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        // softer outer glow for the burn spot
        ctx.fillStyle = 'rgba(70, 35, 15, 0.3)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(40, 20, 10, 0.7)';
      });

      // 2. Rich Tomato Sauce (slightly irregular, deep red-maroon)
      const sauceGrad = ctx.createRadialGradient(cx, cy, 70, cx, cy, 104);
      sauceGrad.addColorStop(0, '#c0392b');
      sauceGrad.addColorStop(0.8, '#962d22');
      sauceGrad.addColorStop(1, '#78241c');
      ctx.fillStyle = sauceGrad;
      ctx.beginPath();
      // add minor ripples to edge
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const offset = Math.sin(a * 12) * 1.5;
        const rx = cx + Math.cos(a) * (103 + offset);
        const ry = cy + Math.sin(a) * (103 + offset);
        if (a === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();

      // 3. Melted Mozzarella Cheese (glorious golden-white & toasted spots)
      const cheeseGrad = ctx.createRadialGradient(cx - 10, cy - 10, 20, cx, cy, 96);
      cheeseGrad.addColorStop(0, '#fff9e6'); // fresh bubbly center
      cheeseGrad.addColorStop(0.4, '#f9e79f'); // rich melted yellow
      cheeseGrad.addColorStop(0.8, '#f5b041'); // golden toasted cheese
      cheeseGrad.addColorStop(1, '#d35400'); // crispy cheese border
      ctx.fillStyle = cheeseGrad;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const offset = Math.cos(a * 16) * 2;
        const rx = cx + Math.cos(a) * (94 + offset);
        const ry = cy + Math.sin(a) * (94 + offset);
        if (a === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();

      // Brown toasted cheese bubbles
      ctx.fillStyle = 'rgba(160, 64, 0, 0.75)';
      const cheeseBubbles = [
        { x: 100, y: 110, r: 8 }, { x: 140, y: 90, r: 6 }, { x: 155, y: 145, r: 7 },
        { x: 110, y: 160, r: 5 }, { x: 90, y: 80, r: 6 }, { x: 160, y: 115, r: 4 }
      ];
      cheeseBubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        // inner lighter toast
        ctx.fillStyle = 'rgba(211, 84, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(b.x - 1, b.y - 1, b.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(160, 64, 0, 0.75)';
      });

      // 4. Pepperonis with 3D cupped rim and grease highlight
      const peps = [
        { x: 128, y: 128, r: 20 },
        { x: 90, y: 90, r: 16 },
        { x: 166, y: 90, r: 16 },
        { x: 90, y: 166, r: 16 },
        { x: 166, y: 166, r: 16 },
        { x: 128, y: 60, r: 14 },
        { x: 128, y: 196, r: 14 },
        { x: 60, y: 128, r: 14 },
        { x: 196, y: 128, r: 14 },
      ];
      peps.forEach(p => {
        // Draw shadowed border (cupped rim)
        ctx.fillStyle = '#641e16'; // burnt dark rim
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Draw rich red pepperoni body
        const pepGrad = ctx.createRadialGradient(p.x - p.r*0.2, p.y - p.r*0.2, 2, p.x, p.y, p.r - 1.5);
        pepGrad.addColorStop(0, '#e74c3c'); // bright center grease
        pepGrad.addColorStop(0.6, '#b03a2e'); // cured meat red
        pepGrad.addColorStop(1, '#78281f'); // dark rim shadow
        ctx.fillStyle = pepGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r - 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Little white fat spots (classic cured pepperoni texture)
        ctx.fillStyle = 'rgba(253, 235, 208, 0.8)';
        const fatSpots = [
          { dx: -0.4, dy: -0.2, r: 1.2 }, { dx: 0.2, dy: -0.5, r: 1.5 },
          { dx: 0.5, dy: 0.3, r: 1.2 }, { dx: -0.2, dy: 0.5, r: 1 },
          { dx: -0.5, dy: 0.4, r: 1.5 }, { dx: 0.3, dy: 0.1, r: 1.3 }
        ];
        fatSpots.forEach(fs => {
          ctx.beginPath();
          ctx.arc(p.x + p.r * fs.dx, p.y + p.r * fs.dy, fs.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Glossy grease pool reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Fresh Basil Leaves (green, organic, curled)
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      const basilLeaves = [
        { x: 105, y: 128, rot: 0.8, sz: 12 },
        { x: 155, y: 110, rot: -0.4, sz: 15 },
        { x: 110, y: 150, rot: 2.1, sz: 10 },
        { x: 140, y: 180, rot: -1.2, sz: 13 },
        { x: 80, y: 70, rot: 0.2, sz: 11 },
        { x: 180, y: 75, rot: 1.5, sz: 12 }
      ];
      basilLeaves.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        
        // Draw leaf shape
        ctx.beginPath();
        ctx.moveTo(0, -b.sz);
        ctx.quadraticCurveTo(b.sz * 0.7, -b.sz * 0.5, b.sz * 0.2, b.sz);
        ctx.quadraticCurveTo(-b.sz * 0.7, -b.sz * 0.5, 0, -b.sz);
        ctx.closePath();
        
        // Leaf gradient (rich fresh green)
        const leafGrad = ctx.createLinearGradient(0, -b.sz, 0, b.sz);
        leafGrad.addColorStop(0, '#2ecc71');
        leafGrad.addColorStop(1, '#1b5e20');
        ctx.fillStyle = leafGrad;
        ctx.fill();

        // Main vein
        ctx.strokeStyle = '#a3e4d7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -b.sz);
        ctx.lineTo(0, b.sz * 0.8);
        ctx.stroke();

        ctx.restore();
      });
      ctx.shadowBlur = 0; // reset shadow

      // 6. Subtle cut lines (8 slices)
      ctx.strokeStyle = 'rgba(40, 20, 10, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(angle) * 100, cy - Math.sin(angle) * 100);
        ctx.lineTo(cx + Math.cos(angle) * 100, cy + Math.sin(angle) * 100);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  const clothTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const size = 32;
      // Checkerboard base
      for (let x = 0; x < 256; x += size) {
        for (let y = 0; y < 256; y += size) {
          const isEven = (x / size + y / size) % 2 === 0;
          if (isEven) {
            // Textured soft white/cream
            ctx.fillStyle = '#f9f9f9';
          } else {
            // Richer Italian red
            ctx.fillStyle = '#c0392b';
          }
          ctx.fillRect(x, y, size, size);

          // Add a subtle inner shadow or gradient to each cell to represent soft drapes/folds
          const cellGrad = ctx.createRadialGradient(x + size/2, y + size/2, size * 0.1, x + size/2, y + size/2, size * 0.8);
          cellGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
          cellGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
          ctx.fillStyle = cellGrad;
          ctx.fillRect(x, y, size, size);
        }
      }

      // Add a realistic fabric/cotton weave overlay
      // Draw ultra-fine horizontal and vertical threads
      ctx.lineWidth = 1;
      for (let i = 0; i < 256; i += 2) {
        // Vertical threads
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();

        // Horizontal threads
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, []);

  const floorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const size = 512; // Increase resolution to 512 for extreme detail
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Deep dark floor base (color of grout/base)
      ctx.fillStyle = '#2d150f'; // Dark charcoal-brown grout
      ctx.fillRect(0, 0, size, size);

      const numTiles = 4; // 4x4 tiles inside 512x512
      const tileSize = size / numTiles;
      const groutSize = 6;

      for (let tx = 0; tx < numTiles; tx++) {
        for (let ty = 0; ty < numTiles; ty++) {
          const x = tx * tileSize;
          const y = ty * tileSize;
          const w = tileSize - groutSize;
          const h = tileSize - groutSize;

          // Unique clay shade variation for this specific tile
          // Terracotta can range from warm clay-orange to deep earthy-red
          const hueSeed = (tx * 17 + ty * 31) % 5;
          let tileColor = '#e17055'; // standard
          if (hueSeed === 0) tileColor = '#d35400'; // burnt orange
          else if (hueSeed === 1) tileColor = '#e67e22'; // bright copper
          else if (hueSeed === 2) tileColor = '#c0392b'; // clay red
          else if (hueSeed === 3) tileColor = '#cd6133'; // dusty brick
          else tileColor = '#cf6a4c'; // pale terracotta

          // Fill tile base with radial gradient to simulate kiln firing edge burnished effect
          const tileGrad = ctx.createRadialGradient(x + w/2, y + h/2, w * 0.1, x + w/2, y + h/2, w * 0.7);
          tileGrad.addColorStop(0, tileColor);
          // Darken the edges of the tile
          const darkEdgeColor = shadeColor(tileColor, -35);
          tileGrad.addColorStop(1, darkEdgeColor);

          ctx.fillStyle = tileGrad;
          ctx.fillRect(x + groutSize/2, y + groutSize/2, w, h);

          // Add organic terracotta clay texture, grain & tiny stone inclusions
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          for (let s = 0; s < 12; s++) {
            const sx = x + groutSize/2 + Math.random() * w;
            const sy = y + groutSize/2 + Math.random() * h;
            const sr = 1 + Math.random() * 3;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          for (let s = 0; s < 15; s++) {
            const sx = x + groutSize/2 + Math.random() * w;
            const sy = y + groutSize/2 + Math.random() * h;
            const sr = 0.5 + Math.random() * 2;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }

          // Subtle organic marble/veining/scratch texture
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.lineWidth = 1;
          for (let j = 0; j < 2; j++) {
            ctx.beginPath();
            ctx.moveTo(x + groutSize/2 + Math.random() * w, y + groutSize/2 + Math.random() * h);
            ctx.bezierCurveTo(
              x + w/2 + (Math.random() - 0.5) * w/2, y + h/2 + (Math.random() - 0.5) * h/2,
              x + w/2 + (Math.random() - 0.5) * w/2, y + h/2 + (Math.random() - 0.5) * h/2,
              x + groutSize/2 + Math.random() * w, y + groutSize/2 + Math.random() * h
            );
            ctx.stroke();
          }

          // Bevel / 3D borders for each tile
          // Light highlight on top-left
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + groutSize/2, y + groutSize/2 + h);
          ctx.lineTo(x + groutSize/2, y + groutSize/2);
          ctx.lineTo(x + groutSize/2 + w, y + groutSize/2);
          ctx.stroke();

          // Dark shadow on bottom-right
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + groutSize/2 + w, y + groutSize/2);
          ctx.lineTo(x + groutSize/2 + w, y + groutSize/2 + h);
          ctx.lineTo(x + groutSize/2, y + groutSize/2 + h);
          ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(WORLD_SIZE / 4, WORLD_SIZE / 4);
    return tex;
  }, []);

  const boxTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Soft paperboard canvas base (creamy ivory-white card)
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, 256, 256);

      // Cardboard fiber texture (very fine organic strokes for quality paper feel)
      ctx.strokeStyle = 'rgba(220, 210, 195, 0.4)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 40; i++) {
        const sx = Math.random() * 256;
        const sy = Math.random() * 256;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 8, sy + (Math.random() - 0.5) * 4);
        ctx.stroke();
      }

      // 2. Italian Flag Striped Borders
      // Top stripe (Green, White, Red)
      ctx.fillStyle = '#27ae60'; // Green
      ctx.fillRect(12, 12, 8, 232);
      ctx.fillStyle = '#ea2027'; // Red
      ctx.fillRect(236, 12, 8, 232);
      
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(12, 12, 232, 8);
      ctx.fillStyle = '#ea2027';
      ctx.fillRect(12, 236, 232, 8);

      // Elegant inner border lines
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, 200, 200);

      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = 1;
      ctx.strokeRect(32, 32, 192, 192);

      // 3. Draw a Retro Italian Chef Mascot (procedural graphic)
      ctx.save();
      ctx.translate(128, 120); // Center of mascot

      // Chef Fluffy Hat
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-10, -28, 12, 0, Math.PI * 2);
      ctx.arc(10, -28, 12, 0, Math.PI * 2);
      ctx.arc(0, -38, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hat Band
      ctx.fillStyle = '#ea2027'; // Red band
      ctx.fillRect(-15, -22, 30, 6);
      ctx.strokeRect(-15, -22, 30, 6);

      // Face
      ctx.fillStyle = '#fde2e4'; // Skin tone
      ctx.beginPath();
      ctx.arc(0, -4, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#2d3436';
      ctx.beginPath();
      ctx.arc(-6, -8, 2, 0, Math.PI * 2);
      ctx.arc(6, -8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Red Cheeks
      ctx.fillStyle = 'rgba(234, 32, 39, 0.3)';
      ctx.beginPath();
      ctx.arc(-10, -2, 4, 0, Math.PI * 2);
      ctx.arc(10, -2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Big Mustache (Glorious curved Italian Mustache!)
      ctx.fillStyle = '#2d3436';
      ctx.beginPath();
      // Left handlebar
      ctx.moveTo(0, -1);
      ctx.bezierCurveTo(-12, -8, -22, -10, -24, -2);
      ctx.bezierCurveTo(-20, 4, -8, 2, 0, -1);
      // Right handlebar
      ctx.moveTo(0, -1);
      ctx.bezierCurveTo(12, -8, 22, -10, 24, -2);
      ctx.bezierCurveTo(20, 4, 8, 2, 0, -1);
      ctx.fill();
      ctx.stroke();

      // Mouth (happy smile under mustache)
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 3, 5, 0, Math.PI);
      ctx.stroke();

      // Chef Collar & Bowtie
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.lineTo(0, 18);
      ctx.lineTo(10, 12);
      ctx.lineTo(8, 24);
      ctx.lineTo(-8, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ea2027'; // Red bowtie
      ctx.beginPath();
      ctx.moveTo(-6, 18);
      ctx.lineTo(-12, 14);
      ctx.lineTo(-12, 22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, 18);
      ctx.lineTo(12, 14);
      ctx.lineTo(12, 22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 18, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 4. Authentic Typography & Pizza Slogans
      // "HOT & FRESH" arched banner on top
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.roundRect(58, 42, 140, 18, 4);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ HOT & FRESH ★', 128, 51);

      // Main Brand: PIZZERIA DELIZIOSA (Beautiful classic styling)
      ctx.fillStyle = '#ea2027';
      ctx.font = '900 18px "Space Grotesk", sans-serif';
      ctx.fillText('PIZZERIA', 128, 80);
      
      ctx.fillStyle = '#2d3436';
      ctx.font = 'italic 700 11px Georgia, serif';
      ctx.fillText('— Antica Ricetta Artigianale —', 128, 96);

      // Bottom typography
      ctx.fillStyle = '#ea2027';
      ctx.font = '900 15px "Space Grotesk", sans-serif';
      ctx.fillText('DELIVERING JOY', 128, 182);

      // "BUON APPETITO" Red Stamp
      ctx.save();
      ctx.translate(128, 206);
      ctx.rotate(-0.06); // slightly crooked stamp effect
      
      // Stamp border
      ctx.strokeStyle = 'rgba(192, 57, 43, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-55, -10, 110, 20);
      
      // Stamp text
      ctx.fillStyle = 'rgba(192, 57, 43, 0.85)';
      ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
      ctx.fillText('BUON APPETITO!', 0, 1);
      ctx.restore();
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const lastShootTime = useRef(0);
  const SHOOT_COOLDOWN = 320; // 320ms cooldown

  const firePizza = () => {
    const gs = globalGameState.current;
    if (!gs || !playerId || gs.isRoundOver) return;

    const localPlayer = localPlayerRef.current;
    if (!localPlayer.active || localPlayer.segments.length === 0) return;

    if (Date.now() - lastShootTime.current < SHOOT_COOLDOWN) return;
    lastShootTime.current = Date.now();

    const head = localPlayer.segments[0];
    const angle = localPlayer.currentAngle;
    const spawnDist = 1.8;
    const startX = head.x + Math.cos(angle) * spawnDist;
    const startY = head.y + Math.sin(angle) * spawnDist;

    const projSpeed = 35;
    const vx = Math.cos(angle) * projSpeed;
    const vy = Math.sin(angle) * projSpeed;

    // Send the shoot event
    useGameStore.getState().sendShoot({
      x: startX,
      y: startY,
      vx,
      vy
    });

    // Play local shoot sound immediately
    playPizzaShootSound();

    // Trigger local screen shake
    shakeIntensity.current = 0.45;
  };

  const consumeShield = () => {
    const gs = globalGameState.current;
    if (!gs || !playerId || gs.isRoundOver) return;

    const localPlayer = localPlayerRef.current;
    if (!localPlayer.active || !localPlayer.hasShield || localPlayer.segments.length === 0) return;

    // Eat / consume the shield!
    localPlayer.hasShield = false;
    
    // Add 8 pizzas to stack
    localPlayer.score += 8;
    
    // Play sound!
    playShieldPopSound();
    setTimeout(() => {
      playPizzaCollectSound();
    }, 100);

    // Screen shake
    shakeIntensity.current = 0.55;
    
    // Send state to server
    sendPlayerState({
      segments: localPlayer.segments,
      score: localPlayer.score,
      currentAngle: localPlayer.currentAngle,
      isBoosting: localPlayer.isBoosting,
      state: 'alive',
      hasShield: false
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !inputs.current.left) { inputs.current.left = true; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !inputs.current.right) { inputs.current.right = true; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !inputs.current.boost) { inputs.current.boost = true; }

      // Fire pizza keydown triggers
      if (e.key === 'f' || e.key === 'F' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        firePizza();
      }

      // Eat/consume shield key triggers
      if (e.key === 'q' || e.key === 'Q') {
        consumeShield();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) { inputs.current.left = false; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) { inputs.current.right = false; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && inputs.current.boost) { inputs.current.boost = false; }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.closest('.hud-element') ||
        target.closest('button')
      ) {
        return;
      }
      firePizza();
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('blur', handleBlur);

    // Listen to shoot_effect from server for other players
    const socket = useGameStore.getState().socket;
    const handleRemoteShootEffect = (data: { playerId: string; x: number; y: number }) => {
      // Don't play duplicate sound for our own shot
      if (data.playerId !== playerId) {
        playPizzaShootSound();
      }
    };

    if (socket) {
      socket.on('shoot_effect', handleRemoteShootEffect);
    }

    // Listen to local_shoot_effect from Solo bots
    const handleLocalShootEffect = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.playerId !== 'local-player') {
        playPizzaShootSound();
      }
    };
    window.addEventListener('local_shoot_effect', handleLocalShootEffect);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('local_shoot_effect', handleLocalShootEffect);
      if (socket) {
        socket.off('shoot_effect', handleRemoteShootEffect);
      }
    };
  }, [playerId]);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;

    if (gs.isRoundOver) {
      inputs.current = { left: false, right: false, boost: false };
    }
    
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      
      // Initialize from server if not active
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
        localPlayerRef.current.hasShield = !!serverPlayer.hasShield;

        // Snap camera base target immediately on spawn
        cameraTarget.current.x = serverPlayer.segments[0].x;
        cameraTarget.current.y = serverPlayer.segments[0].y;
        cameraTarget.current.z = 22;
        camera.position.set(cameraTarget.current.x, cameraTarget.current.y, cameraTarget.current.z);
      }

      if (localPlayerRef.current.active && !gs.isRoundOver) {
        // --- GAMEPAD / XBOX CONTROLLER POLLING ---
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gamepadLeft = false;
        let gamepadRight = false;
        let gamepadBoost = false;
        let gamepadShoot = false;
        let gamepadConsumeShield = false;
        let analogTurnValue = 0;

        for (let i = 0; i < gamepads.length; i++) {
          const gp = gamepads[i];
          if (gp) {
            // Left Joystick (X axis is index 0)
            const axisX = gp.axes[0];
            if (axisX !== undefined && Math.abs(axisX) > 0.15) {
              analogTurnValue = axisX;
            }

            // D-Pad Left (Button 14) and Right (Button 15)
            if (gp.buttons[14] && gp.buttons[14].pressed) gamepadLeft = true;
            if (gp.buttons[15] && gp.buttons[15].pressed) gamepadRight = true;

            // Xbox Buttons for Boost/Sprint: A (0), Left Bumper (4), Left Trigger (6)
            const boostBtnIndices = [0, 4, 6];
            for (const btnIndex of boostBtnIndices) {
              if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
                gamepadBoost = true;
                break;
              }
            }

            // Xbox Buttons for Shooting: B (1), X (2), Right Bumper (5), Right Trigger (7)
            const shootBtnIndices = [1, 2, 5, 7];
            for (const btnIndex of shootBtnIndices) {
              if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
                gamepadShoot = true;
                break;
              }
            }

            // Xbox Buttons for Eating/Consuming Shield: Y (3), D-Pad Up (12), D-Pad Down (13)
            const consumeBtnIndices = [3, 12, 13];
            for (const btnIndex of consumeBtnIndices) {
              if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
                gamepadConsumeShield = true;
                break;
              }
            }
          }
        }

        // Fire pizza on gamepad or mobile button trigger
        if (gamepadShoot || (window.virtualInputs && window.virtualInputs.shoot)) {
          firePizza();
          if (window.virtualInputs) window.virtualInputs.shoot = false;
        }

        // Consume/eat shield on gamepad or mobile button trigger
        if (gamepadConsumeShield || (window.virtualInputs && window.virtualInputs.consume)) {
          consumeShield();
          if (window.virtualInputs) window.virtualInputs.consume = false;
        }

        // Local movement logic (Support analog joystick, virtual mobile joystick, or digital keyboard/d-pad turning)
        const virtualTurn = window.virtualInputs ? window.virtualInputs.analogTurn : 0;
        const finalAnalogTurn = analogTurnValue !== 0 ? analogTurnValue : virtualTurn;

        if (finalAnalogTurn !== 0) {
          localPlayerRef.current.currentAngle -= finalAnalogTurn * TURN_SPEED * delta;
        } else {
          if (inputs.current.left || gamepadLeft) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
          if (inputs.current.right || gamepadRight) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
        }
        
        const virtualBoost = window.virtualInputs ? window.virtualInputs.boost : false;
        localPlayerRef.current.isBoosting = (inputs.current.boost || gamepadBoost || virtualBoost) && localPlayerRef.current.score > 5;
        const speed = localPlayerRef.current.isBoosting ? BOOST_SPEED : BASE_SPEED;
        
        const head = { ...localPlayerRef.current.segments[0] };
        head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
        head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

        // Boundary check
        const boundary = WORLD_SIZE / 2;
        const wallBoundary = boundary - 0.75;
        const wallCollided = head.x <= -wallBoundary || head.x >= wallBoundary || head.y <= -wallBoundary || head.y >= wallBoundary;

        if (head.x < -boundary) head.x = -boundary;
        if (head.x > boundary) head.x = boundary;
        if (head.y < -boundary) head.y = -boundary;
        if (head.y > boundary) head.y = boundary;

        const localInvincible = localPlayerRef.current.invincibleUntil ? Date.now() < localPlayerRef.current.invincibleUntil : false;
        const isInvincible = (serverPlayer.invincibleUntil ? Date.now() < serverPlayer.invincibleUntil : false) || localInvincible;

        // Obstacle collision check (tables)
        let tableCollided = false;
        if (!isInvincible) {
          for (const table of tablesList) {
            const dx = head.x - table.x;
            const dy = head.y - table.y;
            if (dx * dx + dy * dy < (table.radius + 0.65) * (table.radius + 0.65)) {
              tableCollided = true;
              break;
            }
          }
        }

        // Moving obstacle collision check (Waiters and Roombas)
        let movingCollided = false;
        if (!isInvincible) {
          const currentMovingObstacles = getMovingObstacles(Date.now() / 1000);
          for (const mob of currentMovingObstacles) {
            const dx = head.x - mob.x;
            const dy = head.y - mob.y;
            if (dx * dx + dy * dy < (mob.radius + 0.6) * (mob.radius + 0.6)) {
              movingCollided = true;
              break;
            }
          }
        }

        localPlayerRef.current.segments.unshift(head);

        if (localPlayerRef.current.isBoosting) {
          localPlayerRef.current.score -= 2 * delta;
          if (localPlayerRef.current.score <= 5) {
            localPlayerRef.current.isBoosting = false;
            localPlayerRef.current.score = 5;
          }
          // Spawn trails in solo/offline mode
          if (isSolo && Math.random() < 0.1) {
            const trailId = `orb-trail-${Math.random().toString(36).substring(2, 11)}`;
            const segments = localPlayerRef.current.segments;
            if (segments.length > 0) {
              const tail = segments[segments.length - 1];
              gs.orbs[trailId] = {
                id: trailId,
                x: tail.x,
                y: tail.y,
                value: 1,
                color: gs.players[playerId]?.color || '#ff0000',
              };
            }
          }
        }

        const targetLength = Math.floor(localPlayerRef.current.score);
        while (localPlayerRef.current.segments.length > targetLength) {
          localPlayerRef.current.segments.pop();
        }

        // Check pizza collisions
        for (const orbId in gs.orbs) {
          if (localCollectedOrbs.has(orbId)) continue;
          const orb = gs.orbs[orbId];
          const dx = head.x - orb.x;
          const dy = head.y - orb.y;
          if (dx * dx + dy * dy < 4.0) {
            if (orb.isShield) {
              localPlayerRef.current.hasShield = true;
              playShieldCollectSound();
            } else {
              localPlayerRef.current.score += orb.value;
              playPizzaCollectSound();
            }
            localCollectedOrbs.add(orbId);
            delete gs.orbs[orbId]; // predict locally
            sendCollectOrb(orbId);
          }
        }

        // Cleanup localCollectedOrbs occasionally
        if (Math.random() < 0.05) {
          for (const id of localCollectedOrbs) {
            if (!gs.orbs[id]) localCollectedOrbs.delete(id);
          }
        }

        // Check player collisions, table collisions, or moving obstacle collisions
        let collided = false;
        if (!isInvincible) {
          collided = tableCollided || movingCollided || wallCollided;
          if (!collided) {
            for (const otherId in gs.players) {
              if (otherId === playerId) continue;
              const other = gs.players[otherId];
              if (other.state !== 'alive') continue;
              
              const otherIsInvincible = other.invincibleUntil ? Date.now() < other.invincibleUntil : false;
              if (otherIsInvincible) continue;

              for (const seg of other.segments) {
                const dx = head.x - seg.x;
                const dy = head.y - seg.y;
                if (dx * dx + dy * dy < 2.25) {
                  collided = true;
                  break;
                }
              }
              if (collided) break;
            }
          }
        }

        if (collided) {
          if (localPlayerRef.current.hasShield) {
            localPlayerRef.current.hasShield = false;
            localPlayerRef.current.invincibleUntil = Date.now() + 1800; // 1.8 seconds invincibility frame
            playShieldPopSound();
            shakeIntensity.current = 0.6; // Soft shake
          } else {
            playCrashSound();
            shakeIntensity.current = 2.0; // Trigger screen shake!
            localPlayerRef.current.active = false;
            sendPlayerState({
              segments: localPlayerRef.current.segments,
              score: localPlayerRef.current.score,
              currentAngle: localPlayerRef.current.currentAngle,
              isBoosting: localPlayerRef.current.isBoosting,
              state: 'dead',
              hasShield: false
            });
          }
        } else {
          // Update camera target dynamically
          cameraTarget.current.x = head.x;
          cameraTarget.current.y = head.y;
          cameraTarget.current.z = Math.min(50, Math.max(22, 22 + localPlayerRef.current.score * 0.15));

          // Overwrite global state for local rendering
          gs.players[playerId].segments = localPlayerRef.current.segments;
          gs.players[playerId].score = localPlayerRef.current.score;
          gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
          gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;
          gs.players[playerId].hasShield = localPlayerRef.current.hasShield;

          // Send state to server at 20Hz
          const now = Date.now();
          if (now - localPlayerRef.current.lastSendTime > 50) {
            sendPlayerState({
              segments: localPlayerRef.current.segments,
              score: localPlayerRef.current.score,
              currentAngle: localPlayerRef.current.currentAngle,
              isBoosting: localPlayerRef.current.isBoosting,
              state: 'alive',
              hasShield: localPlayerRef.current.hasShield,
              invincibleUntil: localPlayerRef.current.invincibleUntil
            });
            localPlayerRef.current.lastSendTime = now;
          }
        }
      }
    } else {
      localPlayerRef.current.active = false;
    }

    // --- GLOBAL CAMERA AND SHAKE UPDATE ---
    // Subtract previous shake offset to restore base camera position
    camera.position.x -= lastShakeOffset.current.x;
    camera.position.y -= lastShakeOffset.current.y;
    camera.position.z -= lastShakeOffset.current.z;

    // Smoothly move the base camera position toward target
    const lerpSpeedX = 10 * delta;
    const lerpSpeedY = 10 * delta;
    const lerpSpeedZ = 4 * delta;
    camera.position.x += (cameraTarget.current.x - camera.position.x) * lerpSpeedX;
    camera.position.y += (cameraTarget.current.y - camera.position.y) * lerpSpeedY;
    camera.position.z += (cameraTarget.current.z - camera.position.z) * lerpSpeedZ;

    // Process screen shake
    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;

    if (shakeIntensity.current > 0.01) {
      const currentIntensity = shakeIntensity.current;
      shakeX = (Math.random() - 0.5) * 2.0 * currentIntensity;
      shakeY = (Math.random() - 0.5) * 2.0 * currentIntensity;
      shakeZ = (Math.random() - 0.5) * 0.8 * currentIntensity;

      // Decay intensity over time
      shakeIntensity.current -= delta * 5.0; // Decay fully over 0.4 seconds
      if (shakeIntensity.current < 0) shakeIntensity.current = 0;
    } else {
      shakeIntensity.current = 0;
    }

    // Apply the new shake offset
    camera.position.x += shakeX;
    camera.position.y += shakeY;
    camera.position.z += shakeZ;

    // Save the new shake offset so we can subtract it in the next frame
    lastShakeOffset.current.x = shakeX;
    lastShakeOffset.current.y = shakeY;
    lastShakeOffset.current.z = shakeZ;

    // Always look at the un-shaken camera position
    camera.lookAt(camera.position.x - shakeX, camera.position.y - shakeY, 0);

    // Make the directional light follow the camera to keep shadows crisp
    if (lightRef.current) {
      lightRef.current.position.set(camera.position.x - shakeX + 10, camera.position.y - shakeY - 10, 30);
      lightTarget.position.set(camera.position.x - shakeX, camera.position.y - shakeY, 0);
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.6} />
      
      {/* Warm pizzeria ambient lighting */}
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={1.8}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.0005}
      />
      <primitive object={lightTarget} />

      {/* Terracotta Ground Tiling */}
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial map={floorTexture} roughness={0.8} />
      </mesh>

      {/* Cozy Pizzeria Brick/Wood Boundaries */}
      <PizzeriaWalls />

      {/* 3D Pizzeria Tables */}
      <InstancedTables clothTexture={clothTexture} />

      {/* Moving Obstacles (Angry Waiters & Cleaning Roombas) */}
      {MOVING_OBSTACLES_CONFIGS.map((mob) => (
        <MovingObstacle 
          key={mob.id}
          config={mob}
        />
      ))}

      {/* Spinning Pizzas */}
      <Orbs pizzaTexture={pizzaTexture} />

      {/* Pizza Projectiles */}
      <Projectiles pizzaTexture={pizzaTexture} />

      {/* Render Players */}
      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            isLocal={player.id === playerId}
            boxTexture={boxTexture}
          />
        );
      })}
    </>
  );
}
