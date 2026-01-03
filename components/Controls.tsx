import React, { useEffect, useRef } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

export const Controls = () => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const { setIsLocked, isWebcamOpen, isAuthOverlayOpen } = useStore();
  
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = false;
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    // Only move if locked
    if (controlsRef.current?.isLocked === true) {
      velocity.current.x -= velocity.current.x * 10.0 * delta;
      velocity.current.z -= velocity.current.z * 10.0 * delta;

      direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
      direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
      direction.current.normalize();

      if (moveForward.current || moveBackward.current) velocity.current.z -= direction.current.z * 40.0 * delta;
      if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * 40.0 * delta;

      controlsRef.current.moveRight(-velocity.current.x * delta);
      controlsRef.current.moveForward(-velocity.current.z * delta);
      
      // Keep inside room approx
      camera.position.y = 1.6; // Eye level
      camera.position.x = Math.max(-4.8, Math.min(4.8, camera.position.x));
      camera.position.z = Math.max(-4.8, Math.min(4.8, camera.position.z));
    }
  });

  // If any overlay is open, don't allow pointer lock to be triggered by clicks on the canvas
  const isLockedDisabled = isWebcamOpen || isAuthOverlayOpen;

  return (
    <>
        {!isLockedDisabled && (
            <PointerLockControls 
                ref={controlsRef} 
                domElement={gl.domElement}
                makeDefault
                onLock={() => setIsLocked(true)}
                onUnlock={() => setIsLocked(false)}
                pointerSpeed={0.5}
            />
        )}
    </>
  );
};