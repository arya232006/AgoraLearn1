'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Types ---
type Atom = { element: string; position: [number, number, number]; color?: string };
type Bond = { from: number; to: number }; // Indices in the atoms array
type Vector = { start: [number, number, number]; end: [number, number, number]; color?: string; label?: string };
type SimulationParams = {
    velocity?: number;
    angle?: number;
    gravity?: number;
    focalLength?: number;
    objectDistance?: number;
    objectHeight?: number;
};

interface SceneData {
  type: 'molecule' | 'vector_field' | 'simulation';
  atoms?: Atom[];
  bonds?: Bond[];
  vectors?: Vector[];
  simType?: 'projectile' | 'optics';
  params?: SimulationParams;
  title?: string;
}

// --- Simulation Components ---

// 2. Optics (Convex Lens)
function OpticsScene({ initialFocalLength=3, initialObjectDistance=6, objectHeight=2 }) {
  const [f, setF] = useState(initialFocalLength);
  const [doDist, setDoDist] = useState(initialObjectDistance);
  
  // Thin Lens Equation: 1/f = 1/do + 1/di  =>  1/di = 1/f - 1/do
  // di = (f * do) / (do - f)
  const di = (f * doDist) / (doDist - f);
  const m = -di / doDist;
  const hi = m * objectHeight;
  
  // For visualization, we place the lens at 0. Object is at -do. Image is at +di (if real).
  const objPos = new THREE.Vector3(-doDist, 0, 0);
  const imgPos = new THREE.Vector3(di, 0, 0);
  
  // Ray 1: Parallel to axis, then through Focal Point (F) on image side
  // Start: (-do, ho) -> Lens (0, ho) -> (di, hi) OR extended through F (f, 0)
  const ray1Points = [
      new THREE.Vector3(-doDist, objectHeight, 0),
      new THREE.Vector3(0, objectHeight, 0),
      new THREE.Vector3(di, hi, 0) // Convergence point
  ];
  // Extend Ray 1 visually past image if needed
  if(di > 0) ray1Points.push(new THREE.Vector3(di + 2, hi + (hi/di)*2, 0));

  // Ray 2: Through Center (0,0) - undeviated
  const ray2Points = [
      new THREE.Vector3(-doDist, objectHeight, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(di, hi, 0)
  ];
  if(di > 0) ray2Points.push(new THREE.Vector3(di + 2, hi + (hi/di)*2, 0));

  // Visual Geometry
  const lightColor = "#ffff00";
  const ray1Geom = new THREE.BufferGeometry().setFromPoints(ray1Points);
  const ray2Geom = new THREE.BufferGeometry().setFromPoints(ray2Points);

  const isVirtual = di < 0; // Virtual image if do < f

  return (
    <group>
       {/* Optical Axis */}
       <line>
          <bufferGeometry setFromPoints={[new THREE.Vector3(-20,0,0), new THREE.Vector3(20,0,0)]} />
          <lineBasicMaterial color="#444" />
       </line>

       {/* Lens (Convex) */}
       <mesh rotation={[0,0,Math.PI/2]} scale={[1, 0.2, 1]}>
           <capsuleGeometry args={[2.5, 0.5, 4, 16]} />
           <meshPhysicalMaterial 
               roughness={0} 
               transmission={0.9} 
               thickness={1}
               color="cyan" 
               transparent 
               opacity={0.3} 
           />
       </mesh>
       <Text position={[0, -3, 0]} fontSize={0.5} color="cyan">Convex Lens</Text>

       {/* Focal Points */}
       <mesh position={[f, 0, 0]}>
         <sphereGeometry args={[0.1]} />
         <meshBasicMaterial color="red" />
       </mesh>
       <Text position={[f, -0.5, 0]} fontSize={0.3} color="red">F</Text>
       <mesh position={[-f, 0, 0]}>
         <sphereGeometry args={[0.1]} />
         <meshBasicMaterial color="red" />
       </mesh>
       <Text position={[-f, -0.5, 0]} fontSize={0.3} color="red">F'</Text>

        {/* Object (Upright Arrow) */}
        <arrowHelper 
            args={[new THREE.Vector3(0,1,0), new THREE.Vector3(-doDist, 0, 0), objectHeight, 0x00ff00, 0.5, 0.5]} 
        />
        <Text position={[-doDist, -1, 0]} fontSize={0.4} color="#00ff00">Object</Text>

        {/* Image (Arrow) */}
        {Math.abs(di) < 50 && (
            <>
            <arrowHelper 
                args={[
                    new THREE.Vector3(0, Math.sign(hi), 0), 
                    new THREE.Vector3(di, 0, 0), 
                    Math.abs(hi), 
                    isVirtual ? 0xff00ff : 0xffaa00, 
                    0.5, 
                    0.5
                ]} 
            />
            <Text position={[di, -1, 0]} fontSize={0.4} color={isVirtual ? "#ff00ff" : "#ffaa00"}>
                {isVirtual ? "Virtual Image" : "Real Image"}
            </Text>
            </>
        )}

        {/* Light Rays */}
        <line geometry={ray1Geom}><lineBasicMaterial color={lightColor} /></line>
        <line geometry={ray2Geom}><lineBasicMaterial color={lightColor} /></line>

        {/* UI Controls */}
        <Html position={[0, -5, 0]} style={{ width: '300px', transform: 'translateX(-50%)' }}>
            <div className="bg-black/80 text-white p-3 rounded-lg backdrop-blur-md border border-white/20 select-none pointer-events-auto">
                <div className="text-xs font-bold mb-2 uppercase tracking-wider text-cyan-400">Optics Workbench</div>
                
                <div className="flex items-center justify-between text-xs mb-1">
                    <span>Object Distance (do): {doDist.toFixed(1)}</span>
                </div>
                <input 
                    type="range" min="1" max="15" step="0.1" value={doDist} 
                    onChange={(e) => setDoDist(Number(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-3"
                />

                <div className="flex items-center justify-between text-xs mb-1">
                    <span>Focal Length (f): {f.toFixed(1)}</span>
                </div>
                <input 
                    type="range" min="1" max="10" step="0.1" value={f} 
                    onChange={(e) => setF(Number(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                
                 <div className="mt-2 text-[10px] text-gray-400">
                    <div>Image Dist (di): {di.toFixed(2)}</div>
                    <div>Magnification (m): {m.toFixed(2)}x</div>
                    <div className={isVirtual ? "text-purple-400" : "text-orange-400"}>
                        {isVirtual ? "VIRTUAL • UPRIGHT" : "REAL • INVERTED"}
                    </div>
                </div>
            </div>
        </Html>
    </group>
  );
}

// 1. Projectile Motion
function ProjectileScene({ initialVelocity=20, initialAngle=45, gravity=9.8 }) {
    // State for interactivity
    const [v0, setV0] = useState(initialVelocity);
    const [theta, setTheta] = useState(initialAngle);
    
    // Animation state
    const ballRef = useRef<THREE.Mesh>(null);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(true);

    // Calculate Trajectory Path
    const points = [];
    const rad = (theta * Math.PI) / 180;
    const totalTime = (2 * v0 * Math.sin(rad)) / gravity;
    
    for (let t = 0; t <= totalTime; t += 0.1) {
        const x = v0 * Math.cos(rad) * t;
        const y = (v0 * Math.sin(rad) * t) - (0.5 * gravity * t * t);
        points.push(new THREE.Vector3(x, y, 0));
    }
    // ensure last point hits ground exactly
    const maxRange = (v0*v0 * Math.sin(2*rad))/gravity;
    points.push(new THREE.Vector3(maxRange, 0, 0));

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    useFrame((state, delta) => {
        if (!isRunning || !ballRef.current) return;
        
        let newTime = time + delta * 1.5; // 1.5x speed
        if (newTime > totalTime) newTime = 0; // Loop
        
        setTime(newTime);
        
        const x = v0 * Math.cos(rad) * newTime;
        const y = (v0 * Math.sin(rad) * newTime) - (0.5 * gravity * newTime * newTime);
        
        ballRef.current.position.set(x, y, 0);
    });

    return (
        <group>
            {/* Ground */}
            <gridHelper args={[100, 20]} position={[20, -0.1, 0]} />
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[20, -0.15, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial color="#222" transparent opacity={0.5} />
            </mesh>

            {/* Trajectory Line */}
            <line geometry={lineGeometry}>
                <lineBasicMaterial color="yellow" linewidth={2} />
            </line>

            {/* Projectile Ball */}
            <mesh ref={ballRef} position={[0,0,0]}>
                 <sphereGeometry args={[0.5, 32, 32]} />
                 <meshStandardMaterial color="cyan" emissive="blue" emissiveIntensity={0.5} />
            </mesh>
            
            {/* Controls Overlay */}
            <Html position={[0, -5, 0]} style={{ width: '300px', transform: 'translateX(-50%)' }}>
                <div className="bg-black/80 text-white p-3 rounded-lg backdrop-blur-md border border-white/20 select-none pointer-events-auto">
                    <div className="text-xs font-bold mb-2 uppercase tracking-wider text-cyan-400">Simulation Controls</div>
                    
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span>Velocity (v0): {v0} m/s</span>
                    </div>
                    <input 
                        type="range" min="5" max="50" step="1" value={v0} 
                        onChange={(e) => setV0(Number(e.target.value))}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-3"
                    />

                    <div className="flex items-center justify-between text-xs mb-1">
                        <span>Angle (θ): {theta}°</span>
                    </div>
                    <input 
                        type="range" min="10" max="85" step="1" value={theta} 
                        onChange={(e) => setTheta(Number(e.target.value))}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    
                     <div className="mt-2 text-[10px] text-gray-400 flex justify-between">
                        <span>Max Height: {((v0*v0*Math.sin(rad)**2)/(2*gravity)).toFixed(1)}m</span>
                        <span>Range: {maxRange.toFixed(1)}m</span>
                    </div>
                </div>
            </Html>
        </group>
    );
}

// --- Molecule Components ---
const atomColors: Record<string, string> = {
  H: 'white', C: 'gray', N: 'blue', O: 'red', S: 'yellow', P: 'orange', Cl: 'green',
};

function AtomSphere({ position, element, color }: Atom) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[element === 'H' ? 0.3 : 0.5, 32, 32]} />
      <meshStandardMaterial color={color || atomColors[element] || 'hotpink'} />
      <Html distanceFactor={10}>
        <div className="text-xs font-bold text-white bg-black/50 px-1 rounded select-none pointer-events-none">
            {element}
        </div>
      </Html>
    </mesh>
  );
}

function BondCylinder({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(endVec, startVec);
    const length = direction.length();
    
    // Position is midpoint
    const position = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    
    // Orientation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

    return (
        <mesh position={position} quaternion={quaternion}>
            <cylinderGeometry args={[0.1, 0.1, length, 12]} />
            <meshStandardMaterial color="#cccccc" />
        </mesh>
    );
}

function MoleculeScene({ atoms = [], bonds = [] }: { atoms?: Atom[], bonds?: Bond[] }) {
    return (
        <group>
            {atoms.map((atom, i) => (
                <AtomSphere key={i} {...atom} />
            ))}
            {bonds.map((bond, i) => {
                const start = atoms[bond.from]?.position;
                const end = atoms[bond.to]?.position;
                if (!start || !end) return null;
                return <BondCylinder key={`bond-${i}`} start={start} end={end} />;
            })}
        </group>
    );
}

// --- Vector Components ---
function Arrow({ start, end, color = 'cyan', label }: Vector) {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(endVec, startVec);
    const length = direction.length();
    
    return (
        <group>
            <arrowHelper args={[direction.normalize(), startVec, length, color || 'cyan', 0.5, 0.3]} />
            {label && (
                <Html position={[end[0], end[1] + 0.5, end[2]]}>
                    <div className="text-xs font-mono text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-800">
                        {label}
                    </div>
                </Html>
            )}
        </group>
    );
}

function VectorScene({ vectors = [] }: { vectors?: Vector[] }) {
    return (
        <group>
            {/* Grid for reference */}
            <gridHelper args={[20, 20, 0x444444, 0x222222]} />
            <axesHelper args={[5]} />
            {vectors.map((vec, i) => (
                <Arrow key={i} {...vec} />
            ))}
        </group>
    );
}

// --- Main Wrapper ---
export default function ThreeDWrapper({ data }: { data: SceneData }) {
  return (
    <div className="w-full h-[400px] bg-black/40 rounded-xl overflow-hidden border border-white/10 relative">
        <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs text-white uppercase tracking-wider font-bold border border-white/10">
            3D Viewer: {data.title || data.type}
        </div>
        
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            {/* Controls */}
            <OrbitControls makeDefault />
            
            {/* Background Elements */}
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

            {/* Content Switcher */}
            {data.type === 'molecule' && <MoleculeScene atoms={data.atoms} bonds={data.bonds} />}
            {data.type === 'vector_field' && <VectorScene vectors={data.vectors} />}
            {data.type === 'simulation' && data.simType === 'projectile' && (
                <ProjectileScene 
                    initialVelocity={data.params?.velocity} 
                    initialAngle={data.params?.angle} 
                    gravity={data.params?.gravity} 
                />
            )}
            {data.type === 'simulation' && data.simType === 'optics' && (
                <OpticsScene 
                    initialFocalLength={data.params?.focalLength}
                    initialObjectDistance={data.params?.objectDistance}
                    objectHeight={data.params?.objectHeight}
                />
            )}
            
        </Canvas>
      
        <div className="absolute bottom-3 right-3 text-[10px] text-gray-500 italic pointer-events-none">
             Drag to rotate • Scroll to zoom
        </div>
    </div>
  );
}
