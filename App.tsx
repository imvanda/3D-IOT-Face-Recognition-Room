import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { Room } from './components/Room';
import { Controls } from './components/Controls';
import { Interface } from './components/Interface';
import { useStore } from './store';

function App() {
  const fetchDevices = useStore(state => state.fetchDevices);
  const initializeMQTT = useStore(state => state.initializeMQTT);

  useEffect(() => {
    // 应用启动时获取设备列表和连接 MQTT
    fetchDevices();
    initializeMQTT();
  }, [fetchDevices, initializeMQTT]);

  return (
    <div className="w-full h-screen relative bg-slate-900">
      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [0, 1.6, 4], fov: 75 }}>
        <Suspense fallback={null}>
            <Sky sunPosition={[100, 20, 100]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ambientLight intensity={0.3} />
            <Room />
            <Controls />
        </Suspense>
      </Canvas>

      {/* Center Crosshair (Static HTML) */}
      <div id="crosshair">
        <div className="dot"></div>
      </div>

      {/* UI Overlay */}
      <Interface />
    </div>
  );
}

export default App;