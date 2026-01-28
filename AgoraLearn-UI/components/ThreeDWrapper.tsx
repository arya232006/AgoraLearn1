'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- Types ---
type Atom = { element: string; position: [number, number, number]; color?: string; hybridization?: string };
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
    simType?: 'projectile' | 'optics' | 'gravity' | 'wave';
    params?: SimulationParams;
    title?: string;
}

// --- Simulation Components ---

// 2. Optics (Convex Lens)
function OpticsScene({ initialFocalLength = 3, initialObjectDistance = 6, objectHeight = 2 }) {
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
    const isVirtual = di < 0; // Virtual image if do < f

    // Visual Geometry
    const lightColor = "#ffff00";

    const { ray1Geom, ray2Geom } = useMemo(() => {
        // Ray 1: Parallel to axis, then through Focal Point (F) on image side
        const ray1Points = [
            new THREE.Vector3(-doDist, objectHeight, 0),
            new THREE.Vector3(0, objectHeight, 0),
            new THREE.Vector3(di, hi, 0)
        ];
        if (di > 0) ray1Points.push(new THREE.Vector3(di + 2, hi + (hi / di) * 2, 0));

        // Ray 2: Through Center (0,0) - undeviated
        const ray2Points = [
            new THREE.Vector3(-doDist, objectHeight, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(di, hi, 0)
        ];
        if (di > 0) ray2Points.push(new THREE.Vector3(di + 2, hi + (hi / di) * 2, 0));

        return {
            ray1Geom: new THREE.BufferGeometry().setFromPoints(ray1Points),
            ray2Geom: new THREE.BufferGeometry().setFromPoints(ray2Points)
        };
    }, [doDist, objectHeight, di, hi]);

    return (
        <group>
            {/* Optical Axis */}
            <line>
                <bufferGeometry setFromPoints={[new THREE.Vector3(-20, 0, 0), new THREE.Vector3(20, 0, 0)]} />
                <lineBasicMaterial color="#444" />
            </line>

            {/* Lens (Convex) */}
            <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 0.2, 1]}>
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
                args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(-doDist, 0, 0), objectHeight, 0x00ff00, 0.5, 0.5]}
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
            <line>
                <primitive object={ray1Geom} attach="geometry" />
                <lineBasicMaterial color={lightColor} />
            </line>
            <line>
                <primitive object={ray2Geom} attach="geometry" />
                <lineBasicMaterial color={lightColor} />
            </line>

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
function ProjectileScene({ initialVelocity = 20, initialAngle = 45, gravity = 9.8 }) {
    // State for interactivity
    const [v0, setV0] = useState(initialVelocity);
    const [theta, setTheta] = useState(initialAngle);

    // Animation state
    const ballRef = useRef<THREE.Mesh>(null);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(true);

    // Physics Constants
    const rad = (theta * Math.PI) / 180;
    const totalTime = (2 * v0 * Math.sin(rad)) / gravity;
    const maxRange = (v0 * v0 * Math.sin(2 * rad)) / gravity;

    const lineGeometry = useMemo(() => {
        const points = [];
        for (let t = 0; t <= totalTime; t += 0.1) {
            const x = v0 * Math.cos(rad) * t;
            const y = (v0 * Math.sin(rad) * t) - (0.5 * gravity * t * t);
            points.push(new THREE.Vector3(x, y, 0));
        }
        points.push(new THREE.Vector3(maxRange, 0, 0));
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [v0, rad, gravity, totalTime, maxRange]);

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
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.15, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial color="#222" transparent opacity={0.5} />
            </mesh>

            {/* Trajectory Line */}
            <line>
                <primitive object={lineGeometry} attach="geometry" />
                <lineBasicMaterial color="yellow" linewidth={2} />
            </line>

            {/* Projectile Ball */}
            <mesh ref={ballRef} position={[0, 0, 0]}>
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
                        <span>Max Height: {((v0 * v0 * Math.sin(rad) ** 2) / (2 * gravity)).toFixed(1)}m</span>
                        <span>Range: {maxRange.toFixed(1)}m</span>
                    </div>
                </div>
            </Html>
        </group>
    );
}

// 3. Gravity (Orbit) Simulation
function GravityScene({ bodyCount = 5 }) {
    const bodies = useMemo(() => {
        const b = [];
        // Sun
        b.push({
            mass: 1000,
            position: new THREE.Vector3(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            color: 'orange',
            size: 1.5,
            isStar: true
        });
        // Planets
        for (let i = 0; i < bodyCount; i++) {
            const dist = 4 + (i * 2.5) + Math.random();
            const angle = Math.random() * Math.PI * 2;
            const velocityMag = Math.sqrt(1000 / dist); // Circular orbit approximation v = sqrt(GM/r). G=1 here.

            // Tangent velocity
            const vx = -Math.sin(angle) * velocityMag;
            const vy = Math.cos(angle) * velocityMag; // assuming 2d plane for simplicity

            b.push({
                mass: 1 + Math.random(),
                position: new THREE.Vector3(Math.cos(angle) * dist, Math.sin(angle) * dist, 0),
                velocity: new THREE.Vector3(vx, vy, 0),
                color: ['cyan', 'lime', 'magenta', 'red'][i % 4],
                size: 0.3 + Math.random() * 0.3,
                isStar: false
            });
        }
        return b;
    }, [bodyCount]);

    const meshes = useRef<THREE.Mesh[]>([]);

    useFrame((_, delta) => {
        // Simple N-Body Step
        const G = 1;
        const dt = Math.min(delta, 0.05) * 2; // speed up time

        // Calculate forces
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const b1 = bodies[i];
                const b2 = bodies[j];

                const diff = new THREE.Vector3().subVectors(b2.position, b1.position);
                const distSq = diff.lengthSq();
                const dist = Math.sqrt(distSq);

                if (dist < 0.1) continue; // collision check

                const fMag = (G * b1.mass * b2.mass) / distSq;
                const force = diff.normalize().multiplyScalar(fMag);

                // Apply visual position updates
                // F = ma => a = F/m => dv = a*dt

                // b1 gets pulled towards b2
                b1.velocity.add(force.clone().divideScalar(b1.mass).multiplyScalar(dt));
                // b2 gets pulled towards b1 (opposite force)
                b2.velocity.add(force.clone().negate().divideScalar(b2.mass).multiplyScalar(dt));
            }
        }

        // Update positions
        for (let i = 0; i < bodies.length; i++) {
            bodies[i].position.add(bodies[i].velocity.clone().multiplyScalar(dt));
            if (meshes.current[i]) {
                meshes.current[i].position.copy(bodies[i].position);
            }
        }
    });

    return (
        <group>
            {bodies.map((b, i) => (
                <group key={i}>
                    {b.isStar && <pointLight position={[0, 0, 0]} intensity={2} color="orange" distance={20} />}
                    <mesh ref={el => { if (el) meshes.current[i] = el; }} position={b.position}>
                        <sphereGeometry args={[b.size, 16, 16]} />
                        {b.isStar ? (
                            <meshBasicMaterial color={b.color} />
                        ) : (
                            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.2} />
                        )}
                    </mesh>
                    {!b.isStar && (
                        <line>
                            {/* Simple trail logic could go here, but omitted for perf */}
                        </line>
                    )}
                </group>
            ))}
            <Html position={[0, -5, 0]}>
                <div className="text-xs bg-black/50 text-white px-2 py-1 rounded backdrop-blur">
                    Gravity Sim (N-Body) • {bodyCount + 1} Bodies
                </div>
            </Html>
        </group>
    );
}

// 4. Wave Simulation
function WaveScene() {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create grid of points
    const { positions, uvs, indices } = useMemo(() => {
        const size = 20;
        const res = 50;
        const pts = [];
        const idx = [];
        const uv = [];

        for (let z = 0; z <= res; z++) {
            for (let x = 0; x <= res; x++) {
                const u = x / res;
                const v = z / res;
                pts.push((u - 0.5) * size, 0, (v - 0.5) * size);
                uv.push(u, v);

                if (x < res && z < res) {
                    const a = x + (res + 1) * z;
                    const b = x + 1 + (res + 1) * z;
                    const c = x + (res + 1) * (z + 1);
                    const d = x + 1 + (res + 1) * (z + 1);

                    idx.push(a, b, d);
                    idx.push(a, d, c);
                }
            }
        }
        return {
            positions: new Float32Array(pts),
            indices: idx,
            uvs: new Float32Array(uv)
        };
    }, []);

    useFrame((state) => {
        if (!meshRef.current) return;
        const geo = meshRef.current.geometry;
        const pos = geo.attributes.position;
        const t = state.clock.getElapsedTime();

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);

            // Wave function: y = sin(x + t) + cos(z + t)
            const y = Math.sin(x / 2 + t * 2) * 1.5 + Math.cos(z / 1.5 + t) * 1.0;
            pos.setY(i, y);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
    });

    return (
        <group>
            <mesh ref={meshRef} rotation={[0, 0, 0]}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                    <bufferAttribute attach="index" args={[new Uint16Array(indices), 1]} />
                    <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
                </bufferGeometry>
                <meshStandardMaterial color="#00aaff" wireframe={true} side={THREE.DoubleSide} />
            </mesh>
            <Html position={[0, -5, 0]}>
                <div className="text-xs bg-black/50 text-white px-2 py-1 rounded backdrop-blur">
                    Wave Interference
                </div>
            </Html>
        </group>
    );
}

// Helper for Camera Reset
function CameraController() {
    const { camera, controls } = useThree() as any; // typing cast
    // We could expose a method to parent, but for now just having access is enough if we want automated movements.
    return null;
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
                <div className="text-xs font-bold text-white bg-black/50 px-1 rounded select-none pointer-events-none border border-white/10">
                    {element}
                </div>
            </Html>
        </mesh>
    );
}

// Helper to draw an arc between two bonds
function OrbitalArc({ center, startDir, endDir, label }: { center: [number, number, number], startDir: THREE.Vector3, endDir: THREE.Vector3, label: string }) {
    const curve = useMemo(() => {
        const radius = 0.8; // Distance from atom center
        const start = startDir.clone().normalize().multiplyScalar(radius);
        const end = endDir.clone().normalize().multiplyScalar(radius);

        // Control point for quadratic curve (approximate circular arc)
        // Midpoint vector, scaled out slightly
        const mid = new THREE.Vector3().addVectors(start, end).normalize().multiplyScalar(radius);

        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(...center).add(start),
            new THREE.Vector3(...center).add(mid),
            new THREE.Vector3(...center).add(end)
        );
    }, [center, startDir, endDir]);

    const points = useMemo(() => curve.getPoints(20), [curve]);

    // Calculate mid position for label
    const midPoint = curve.getPoint(0.5);

    return (
        <group>
            <line>
                <bufferGeometry setFromPoints={points} />
                <lineBasicMaterial color="yellow" linewidth={2} />
            </line>
            <Html position={[midPoint.x, midPoint.y, midPoint.z]}>
                <div className="text-[10px] font-mono font-bold text-yellow-300 bg-black/80 px-1.5 py-0.5 rounded border border-yellow-500/50 shadow-[0_0_10px_rgba(253,224,71,0.3)]">
                    {label}
                </div>
            </Html>
        </group>
    );
}

function MoleculeScene({ atoms = [], bonds = [] }: { atoms?: Atom[], bonds?: Bond[] }) {
    // Build adjacency list to find neighbors for arcs
    const neighbors = useMemo(() => {
        const map: Record<number, number[]> = {};
        bonds.forEach(b => {
            if (!map[b.from]) map[b.from] = [];
            if (!map[b.to]) map[b.to] = [];
            map[b.from].push(b.to);
            map[b.to].push(b.from);
        });
        return map;
    }, [bonds]);

    return (
        <group>
            {atoms.map((atom, i) => (
                <group key={i}>
                    <AtomSphere {...atom} />
                    {/* Render Hybridization Arc if atom has neighbors and label */}
                    {atom.hybridization && neighbors[i] && neighbors[i].length >= 1 && (() => {
                        // Pick up to 2 neighbors to draw arc between.
                        // If only 1, we can't draw an "angle" arc, maybe just a small tick?
                        // For now, only draw if >= 2 neighbors to show the angle.
                        // Or if 1 neighbor (like H-C), maybe don't show arc on the H side? Usually hybridization is on central atom.
                        if (neighbors[i].length < 2) return null;

                        const n1 = atoms[neighbors[i][0]];
                        const n2 = atoms[neighbors[i][1]];

                        const cPos = new THREE.Vector3(...atom.position);
                        const v1 = new THREE.Vector3(...n1.position).sub(cPos);
                        const v2 = new THREE.Vector3(...n2.position).sub(cPos);

                        return <OrbitalArc center={atom.position} startDir={v1} endDir={v2} label={atom.hybridization} />;
                    })()}
                </group>
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
                {data.type === 'simulation' && data.simType === 'gravity' && <GravityScene bodyCount={5} />}
                {data.type === 'simulation' && data.simType === 'wave' && <WaveScene />}

                <EffectComposer>
                    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                </EffectComposer>

            </Canvas>

            <div className="absolute bottom-3 right-3 text-[10px] text-gray-500 italic pointer-events-none">
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
}
