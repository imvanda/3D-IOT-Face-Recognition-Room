import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Text, useCursor, useTexture, RoundedBox, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { DeviceType, IotDevice } from '../types';

// Helper component to safely load texture or return null if url is missing
const OptionalTextureMaterial: React.FC<{ url: string | null; color?: string; repeat?: [number, number]; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number }> = ({ url, color = "#fff", repeat = [1, 1], roughness = 0.5, metalness = 0, transparent = false, opacity = 1 }) => {
    if (!url) {
        return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} transparent={transparent} opacity={opacity} />;
    }
    return <TextureMaterial url={url} repeat={repeat} roughness={roughness} metalness={metalness} transparent={transparent} opacity={opacity} />;
};

const TextureMaterial: React.FC<{ url: string; repeat: [number, number]; roughness: number; metalness: number; transparent: boolean; opacity: number }> = ({ url, repeat, roughness, metalness, transparent, opacity }) => {
    const texture = useTexture(url);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    return <meshStandardMaterial map={texture} roughness={roughness} metalness={metalness} transparent={transparent} opacity={opacity} />;
};

// Window View Material (Self-illuminated)
const WindowViewMaterial: React.FC<{ url: string }> = ({ url }) => {
    const texture = useTexture(url);
    return <meshBasicMaterial map={texture} side={THREE.DoubleSide} />;
};

// Projector Screen Material (Self-illuminated for the image)
const ProjectorScreenMaterial: React.FC<{ url: string }> = ({ url }) => {
    const texture = useTexture(url);
    // Use meshBasicMaterial with toneMapped=false for bright, screen-like appearance
    return <meshBasicMaterial map={texture} color="white" side={THREE.DoubleSide} toneMapped={false} />;
};

// Accurate Projector Beam Geometry
const ProjectorLightBeam: React.FC<{ opacity?: number }> = ({ opacity = 0.1 }) => {
    // Coordinates derived from Room Layout
    // Projector Lens (Tip): Global [0, 2.8, 1.8] (Approx 0.2m in front of projector body center at z=2)
    const tip = new THREE.Vector3(0, 2.8, 1.8);
    
    // Screen Image Area on the wall plane
    // Back Wall is at z = -5. Front face at -4.9.
    // We project slightly in front of it at -4.89.
    const screenZ = -4.89;
    
    // Image Dimensions: Width 2.8m, Height 1.6m. Center Y=2.0
    const topY = 2.8;
    const bottomY = 1.2;
    const leftX = -1.4;
    const rightX = 1.4;

    const positions = useMemo(() => {
        const vertices = [
            tip.x, tip.y, tip.z,      // 0: Tip
            leftX, topY, screenZ,     // 1: TL
            rightX, topY, screenZ,    // 2: TR
            leftX, bottomY, screenZ,  // 3: BL
            rightX, bottomY, screenZ  // 4: BR
        ];
        return new Float32Array(vertices);
    }, []);

    const indices = useMemo(() => {
        return [
            0, 1, 2, // Top Face
            0, 2, 4, // Right Face
            0, 4, 3, // Bottom Face
            0, 3, 1, // Left Face
        ];
    }, []);

    return (
        <mesh>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={5} array={positions} itemSize={3} />
                <bufferAttribute attach="index" count={12} array={new Uint16Array(indices)} itemSize={1} />
            </bufferGeometry>
            <meshBasicMaterial 
                color="#a5f3fc" 
                transparent 
                opacity={opacity} 
                side={THREE.DoubleSide} 
                depthWrite={false} 
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};


// Reusable simple model for devices
const DeviceModel: React.FC<{ device: IotDevice }> = ({ device }) => {
  const mesh = useRef<THREE.Group>(null);
  const { toggleDevice, setLookingAtCamera, incrementLookProgress, resetLookProgress, lookingAtCameraId, isWebcamOpen, textures } = useStore();
  
  // Subscribe to specific other devices if needed for logic
  const projector = useStore(state => state.devices.find(d => d.type === DeviceType.PROJECTOR));

  const [hovered, setHover] = useState(false);

  useCursor(hovered);

  useFrame((state, delta) => {
    if (device.status && device.type === DeviceType.ROBOT && mesh.current) {
        const t = state.clock.elapsedTime;
        mesh.current.position.x = device.position[0] + Math.sin(t) * 2;
        mesh.current.position.z = device.position[2] + Math.cos(t * 0.5) * 1;
        mesh.current.rotation.y = t;
    }
    
    if (hovered && device.type === DeviceType.CAMERA && !isWebcamOpen) {
        incrementLookProgress(delta * 50); 
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHover(true);
    if (device.type === DeviceType.CAMERA && !isWebcamOpen) {
      setLookingAtCamera(device.id);
    }
  };

  const handlePointerOut = (e: any) => {
    setHover(false);
    if (device.type === DeviceType.CAMERA) {
      setLookingAtCamera(null);
      resetLookProgress();
    }
  };

  const renderShape = () => {
    switch (device.type) {
      case DeviceType.LIGHT:
        return (
          <group>
             <Cylinder args={[0.8, 0.8, 0.1, 64]} position={[0, 0.05, 0]}>
                <meshStandardMaterial color="#333" roughness={0.5} metalness={0.5} />
             </Cylinder>
             <Cylinder args={[0.7, 0.7, 0.08, 64]} position={[0, -0.02, 0]}>
                <meshStandardMaterial 
                    color={device.status ? "#fff" : "#ddd"} 
                    emissive={device.status ? "#fffbeb" : "#000"} 
                    emissiveIntensity={device.status ? (device.value as number / 50) : 0} 
                    toneMapped={false}
                />
             </Cylinder>
          </group>
        );
      case DeviceType.AC:
        return (
          <group>
            <RoundedBox args={[1.8, 0.5, 0.4]} radius={0.05} smoothness={4} position={[0, 0, 0]}>
                 <meshStandardMaterial color="white" roughness={0.3} metalness={0.1} />
            </RoundedBox>
            <Box args={[1.6, 0.05, 0.4]} position={[0, -0.18, 0]} rotation={[Math.PI/12, 0, 0]}>
                 <meshStandardMaterial color="#e2e8f0" />
            </Box>
             {device.status && (
                <Text position={[0.6, 0.1, 0.21]} fontSize={0.1} color="#4ade80">
                  {device.value}°C
                </Text>
             )}
          </group>
        );
      case DeviceType.DESK:
        const height = typeof device.value === 'number' ? device.value / 100 : 0.75;
        return (
          <group>
             <Box args={[0.08, height, 0.6]} position={[-0.6, height/2, 0]}>
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
             </Box>
             <Box args={[0.08, height, 0.6]} position={[0.6, height/2, 0]}>
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
             </Box>
             <RoundedBox args={[1.6, 0.05, 0.8]} position={[0, height, 0]} radius={0.02} smoothness={4}>
                <OptionalTextureMaterial url={textures.desk} color="#5D4037" roughness={0.4} />
             </RoundedBox>
             <Box args={[0.15, 0.02, 0.08]} position={[0.6, height, 0.4]} rotation={[0,0,0]}>
                 <meshStandardMaterial color="black" />
             </Box>
          </group>
        );
      case DeviceType.PROJECTOR:
        return (
          <group>
            <RoundedBox args={[0.4, 0.15, 0.4]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </RoundedBox>
            {/* Lens */}
            <Cylinder args={[0.06, 0.06, 0.05, 32]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0.2]}>
               <meshPhysicalMaterial transmission={1} roughness={0} thickness={0.5} color="#a5f3fc" />
            </Cylinder>
            {/* Light Indicator */}
            <Sphere args={[0.01]} position={[0.15, 0.05, 0.2]}>
                 <meshBasicMaterial color={device.status ? "#4ade80" : "#ef4444"} />
            </Sphere>
          </group>
        );
      case DeviceType.PURIFIER:
        return (
           <group position={[0, 0, 0]}>
               <RoundedBox args={[0.35, 0.8, 0.35]} radius={0.05} smoothness={4} position={[0, 0.4, 0]}>
                   <meshStandardMaterial color="#f8fafc" roughness={0.2} />
               </RoundedBox>
               <group position={[0, 0.3, 0.18]}>
                   {[...Array(5)].map((_, i) => (
                       <Box key={i} args={[0.25, 0.02, 0.01]} position={[0, -i * 0.05, 0]}>
                           <meshStandardMaterial color="#94a3b8" />
                       </Box>
                   ))}
               </group>
               <Cylinder args={[0.15, 0.15, 0.02, 32]} position={[0, 0.81, 0]}>
                   <meshStandardMaterial color="#334155" />
               </Cylinder>
               <Sphere args={[0.02]} position={[0, 0.7, 0.17]}>
                   <meshBasicMaterial color={device.status ? "#4ade80" : "#ef4444"} />
               </Sphere>
           </group>
        );
      case DeviceType.HUMIDIFIER:
         return (
             <group position={[0, 0, 0]}>
                 <Cylinder args={[0.12, 0.15, 0.3, 32]} position={[0, 0.15, 0]}>
                     <meshPhysicalMaterial color="white" roughness={0.1} transmission={0.2} thickness={0.5} />
                 </Cylinder>
                 <Cylinder args={[0.04, 0.04, 0.02, 16]} position={[0, 0.31, 0]}>
                      <meshStandardMaterial color="#cbd5e1" />
                 </Cylinder>
                 {device.status && (
                    <mesh position={[0, 0.5, 0]}>
                        <sphereGeometry args={[0.1, 16, 16]} />
                        <meshBasicMaterial color="white" transparent opacity={0.3} />
                    </mesh>
                )}
                 <Cylinder args={[0.15, 0.15, 0.05, 32]} position={[0, 0.025, 0]}>
                      <meshStandardMaterial color="#e2e8f0" />
                 </Cylinder>
             </group>
         );
      case DeviceType.SENSOR:
         return (
             <group>
                 <RoundedBox args={[0.02, 0.086, 0.086]} radius={0.005} smoothness={4}>
                     <meshStandardMaterial color="#f8fafc" />
                 </RoundedBox>
                 <Box args={[0.001, 0.06, 0.06]} position={[0.011, 0, 0]}>
                     <meshBasicMaterial color="#e2e8f0" />
                 </Box>
                 <Text position={[0.012, 0.01, 0]} rotation={[0, Math.PI/2, 0]} fontSize={0.018} color="#0f172a" anchorX="center" anchorY="middle">
                    {String(device.value).split(' ')[0]}
                 </Text>
                 <Text position={[0.012, -0.015, 0]} rotation={[0, Math.PI/2, 0]} fontSize={0.012} color="#64748b" anchorX="center" anchorY="middle">
                    {String(device.value).split(' ')[2] || '45%'}
                 </Text>
                 <Sphere args={[0.003]} position={[0.01, 0.03, 0.03]}>
                    <meshBasicMaterial color="#cbd5e1" />
                 </Sphere>
             </group>
         );
      case DeviceType.CAMERA:
        return (
            <group>
                <Sphere args={[0.15, 32, 32]}>
                    <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} />
                </Sphere>
                <Cylinder args={[0.08, 0.1, 0.2]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0.12]}>
                    <meshStandardMaterial color="#020617" />
                </Cylinder>
                <Sphere args={[0.07]} position={[0, 0, 0.22]}>
                     <meshStandardMaterial color={lookingAtCameraId === device.id ? "#ef4444" : "#10b981"} emissive={lookingAtCameraId === device.id ? "#ef4444" : "#10b981"} emissiveIntensity={1} />
                </Sphere>
                <Cylinder args={[0.05, 0.05, 0.2]} rotation={[0, 0, 0]} position={[0, 0.2, 0]}>
                    <meshStandardMaterial color="#333" />
                </Cylinder>
            </group>
        );
      case DeviceType.ROBOT:
          return (
             <group position={[0, 0.05, 0]}>
                 <Cylinder args={[0.3, 0.3, 0.1, 32]}>
                     <meshStandardMaterial color="white" roughness={0.1} metalness={0.1} />
                 </Cylinder>
                 <Cylinder args={[0.05, 0.05, 0.05, 16]} position={[0, 0.075, 0]}>
                    <meshStandardMaterial color="#ef4444" />
                 </Cylinder>
                 <Box args={[0.1, 0.05, 0.1]} position={[0, 0.05, 0.25]}>
                    <meshStandardMaterial color="black" />
                 </Box>
             </group>
          );
       case DeviceType.CURTAIN:
          // Value 0 = Closed.
          // Value 100 = Open.
          const openPercent = typeof device.value === 'number' ? device.value : 0;
          const ratio = openPercent / 100;
          
          // Wall limits are approx +/- 5m.
          // To cover the window (which is full wall width approx), we need panels to meet at 0 when closed.
          // Each panel has max width of 5.0m.
          // When open, they shrink to 0.5m at the edges.
          
          const maxPanelWidth = 5.05; // Slightly > 5 to overlap
          const minPanelWidth = 0.5;
          
          const currentPanelWidth = maxPanelWidth - (maxPanelWidth - minPanelWidth) * ratio;
          
          // Left Panel: Anchored at Left Wall (-5).
          // Center X = -5 + Width/2.
          const leftPanelPos = -5.0 + currentPanelWidth / 2;
          
          // Right Panel: Anchored at Right Wall (+5).
          // Center X = 5 - Width/2.
          const rightPanelPos = 5.0 - currentPanelWidth / 2;
          
          return (
              <group>
                  {/* Curtain Rail */}
                  <Box args={[10, 0.05, 0.05]} position={[0, 1.45, 0]}>
                      <meshStandardMaterial color="#64748b" metalness={0.8} />
                  </Box>
                  
                  {/* Left Panel */}
                  <Box 
                    args={[currentPanelWidth, 2.9, 0.05]} 
                    position={[leftPanelPos, 0, 0]} 
                  >
                      <meshStandardMaterial color="#94a3b8" side={THREE.DoubleSide} />
                  </Box>
                  
                  {/* Right Panel */}
                  <Box 
                    args={[currentPanelWidth, 2.9, 0.05]} 
                    position={[rightPanelPos, 0, 0]} 
                  >
                      <meshStandardMaterial color="#94a3b8" side={THREE.DoubleSide} />
                  </Box>
              </group>
          );
      default: 
        return (
          <RoundedBox args={[0.5, 0.8, 0.5]} radius={0.05}>
             <meshStandardMaterial color={device.status ? "#4ade80" : "#cbd5e1"} />
             <Text position={[0, 0.2, 0.26]} fontSize={0.1} color="black">
                 {device.name}
             </Text>
          </RoundedBox>
        );
    }
  };

  return (
    <group 
        ref={mesh} 
        position={device.position} 
        rotation={device.rotation}
        onClick={(e) => {
            e.stopPropagation();
            toggleDevice(device.id);
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
    >
        {renderShape()}
    </group>
  );
};

export const Room = () => {
  const { devices, textures } = useStore();

  const ceilingLight = devices.find(d => d.type === DeviceType.LIGHT);
  const curtain = devices.find(d => d.type === DeviceType.CURTAIN);
  const projector = devices.find(d => d.type === DeviceType.PROJECTOR);
  
  const ceilingIntensity = (ceilingLight?.status && typeof ceilingLight.value === 'number') 
    ? ceilingLight.value / 50 
    : 0;

  // Sun Light Logic: 0 = Closed (Dark), 100 = Open (Bright)
  const curtainOpenPercent = typeof curtain?.value === 'number' ? curtain.value / 100 : 0;
  const sunIntensity = 2 * curtainOpenPercent;

  // Projector Light Logic
  const isProjectorActive = projector?.status;
  // Ambient glow from screen - Only if projector is ON
  const projectorLightIntensity = isProjectorActive ? 2 : 0;

  return (
    <group>
      <Environment preset="city" background={false} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <OptionalTextureMaterial 
            url={textures.floor} 
            color="#2d2d2d" 
            repeat={[4, 4]} 
            roughness={0.3} 
            metalness={0.1} 
        />
      </mesh>
      
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>

      {/* Back Wall (Solid) */}
      <mesh position={[0, 1.5, -5]}>
         <boxGeometry args={[10, 3, 0.2]} />
         <OptionalTextureMaterial url={textures.wall} color="#e2e8f0" repeat={[3,1]} />
      </mesh>

      {/* Front Wall (With Door) */}
      <group position={[0, 1.5, 5]}>
        <mesh position={[-3, 0, 0]}>
            <boxGeometry args={[4, 3, 0.2]} />
            <OptionalTextureMaterial url={textures.wall} color="#e2e8f0" repeat={[2,1]} />
        </mesh>
        <mesh position={[3, 0, 0]}>
            <boxGeometry args={[4, 3, 0.2]} />
            <OptionalTextureMaterial url={textures.wall} color="#e2e8f0" repeat={[2,1]} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[2, 0.8, 0.2]} />
            <OptionalTextureMaterial url={textures.wall} color="#e2e8f0" repeat={[1,0.5]} />
        </mesh>
        
        {/* DOOR */}
        <group position={[0, -0.4, 0]}>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[2.2, 2.2, 0.25]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[2, 2.1, 0.1]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0.8, 0, 0.1]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.2]} />
                <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.2} />
            </mesh>
        </group>
      </group>

      {/* Side Wall Left */}
      <mesh position={[-5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[10, 3, 0.2]} />
        <OptionalTextureMaterial url={textures.wall} color="#e2e8f0" repeat={[3,1]} />
      </mesh>

      {/* Side Wall Right (THE BIG WINDOW) */}
      <group position={[5, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 1.4, 0]}>
              <boxGeometry args={[10, 0.2, 0.4]} />
              <meshStandardMaterial color="#1e293b" />
          </mesh>
           <mesh position={[0, -1.4, 0]}>
              <boxGeometry args={[10, 0.2, 0.4]} />
              <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-4.9, 0, 0]}>
              <boxGeometry args={[0.2, 3, 0.4]} />
              <meshStandardMaterial color="#1e293b" />
          </mesh>
           <mesh position={[4.9, 0, 0]}>
              <boxGeometry args={[0.2, 3, 0.4]} />
              <meshStandardMaterial color="#1e293b" />
          </mesh>
          
          {/* Glass Pane / Window View */}
           <mesh position={[0, 0, 0]}>
              <planeGeometry args={[9.6, 2.6]} />
              {textures.windowView ? (
                  <WindowViewMaterial url={textures.windowView} />
              ) : (
                  <meshPhysicalMaterial 
                    color="white" 
                    transmission={0.95} 
                    opacity={0.3} 
                    metalness={0} 
                    roughness={0} 
                    ior={1.5} 
                    transparent
                    side={THREE.DoubleSide}
                  />
              )}
          </mesh>
      </group>

      {devices.map((device) => (
        <DeviceModel key={device.id} device={device} />
      ))}

      {/* Projector Beam (Visible if projector is ON) */}
      {isProjectorActive && <ProjectorLightBeam opacity={0.15} />}

      {/* Direct Projection on Back Wall */}
      {isProjectorActive && (
          <mesh position={[0, 2.0, -4.89]}>
              <planeGeometry args={[2.8, 1.6]} />
               {textures.projector ? (
                   <ProjectorScreenMaterial key={textures.projector} url={textures.projector} />
               ) : (
                   <meshBasicMaterial color="#3b82f6" toneMapped={false} />
               )}
          </mesh>
      )}
      
      {/* Lighting System */}
      <ambientLight intensity={0.2} />
      
      {/* Sun Light (Modulated by Curtain) */}
      <directionalLight position={[5, 5, -10]} intensity={sunIntensity} castShadow color="#fff7ed">
          <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
      </directionalLight>

      {/* Ceiling Light */}
      <pointLight 
        position={[0, 2.8, 0]} 
        intensity={ceilingIntensity} 
        distance={12} 
        color="#fffbeb" 
        castShadow 
        shadow-bias={-0.001}
      />

      {/* Projector Ambient Light (Simulate screen bounce) */}
      {projectorLightIntensity > 0 && (
          <pointLight 
              position={[0, 1.5, -4]} 
              intensity={projectorLightIntensity} 
              distance={8} 
              color="#bfdbfe" 
              castShadow={false}
          />
      )}
    </group>
  );
}