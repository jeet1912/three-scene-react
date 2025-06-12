import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import ShapeFactory from './ShapeFactory';

const SceneManager = ({ shapes, selectedId, setSelectedId }) => {
  const raycaster = useRef(new THREE.Raycaster());
  const { camera, gl } = useThree();
  const shapesRef = useRef([]);

  // ✨ Clear old refs before render to avoid stale/null refs
  shapesRef.current = [];

  useEffect(() => {
    const handlePointerDown = (event) => {
      const bounds = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      const pointer = new THREE.Vector2(x, y);

      raycaster.current.setFromCamera(pointer, camera);

      // ✨ Filter out nulls
      const validRefs = shapesRef.current.filter(Boolean);
      const intersects = raycaster.current.intersectObjects(validRefs, true);

      if (intersects.length > 0) {
        const selectedUUID = intersects[0].object.uuid;

        // ✅ Find matching shape by UUID
        for (let i = 0; i < validRefs.length; i++) {
          if (validRefs[i]?.uuid === selectedUUID) {
            setSelectedId(shapes[i].id);
            return;
          }
        }
      }
      else {
        setSelectedId(null);
      }
    };

    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    return () => gl.domElement.removeEventListener('pointerdown', handlePointerDown);
  }, [camera, gl, shapes, setSelectedId]);

  return (
    <group>
      {shapes.map((shape) => (
        <ShapeFactory
          key={shape.id}
          ref={(ref) => {
            if (ref) shapesRef.current.push(ref);
          }}
          type={shape.type}
          position={shape.position}
          rotation={shape.rotation}
          url={shape.url}
          isSelected={shape.id === selectedId}
        />
      ))}
    </group>
  );
};


const ThreeCanvas = ({ shapes, selectedId, setSelectedId }) => {
  return (
    <Canvas
      camera={{ position: [0, 5, 10], fov: 50, near: 0.1, far: 1000 }}
      shadows
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#FAF9F6');
      }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight
        castShadow
        position={[0, 0, 10]}
        intensity={0.7}
        color={'#b7a5ff'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <SceneManager
        shapes={shapes}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
      <OrbitControls />
      <Stats />
    </Canvas>
  );
};

export default ThreeCanvas;
