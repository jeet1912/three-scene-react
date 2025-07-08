import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import ShapeFactory from './ShapeFactory';

const SceneManager = ({ shapes, selectedId, setSelectedId }) => {
  const raycaster = useRef(new THREE.Raycaster());
  const { camera, gl, scene } = useThree();
  const shapesRef = useRef([]);
  const transformControlsRef = useRef();
  const [controlledObject, setControlledObject] = useState(null);

  // ✨ Clear old refs before render to avoid stale/null refs
  shapesRef.current = [];

  useEffect(() => {
    if (!selectedId) {
      setControlledObject(null); // when no selection
      return;
    }
    if (selectedId) {
      const selectedShape = shapesRef.current.find(ref => {
        if (ref.userData.shapeId === selectedId) return true;
        let found = false;
        ref.traverse(child => {
          if (child.userData.shapeId === selectedId){
            found = true;
          }
        });
        return found;
      });

      setControlledObject(selectedShape);
    } else {
      setControlledObject(null);
    }
  }, [selectedId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!transformControlsRef.current) return;
      switch (event.key) {
        case 'g': // Translate
          transformControlsRef.current.setMode('translate');
          break;
        case 'r': // Rotate
          transformControlsRef.current.setMode('rotate');
          break;
        case 's': // Scale
          transformControlsRef.current.setMode('scale');
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  useEffect(() => {
    const handlePointerDown = (event) => {
      const bounds = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      const pointer = new THREE.Vector2(x, y);

      raycaster.current.setFromCamera(pointer, camera);
      // Filter out nulls and collect all meshes (including GLTF children)
      const validRefs = shapesRef.current.filter(Boolean);
      const allMeshes = [];
      validRefs.forEach(ref => {
        if (ref.isMesh) {
          allMeshes.push(ref);
        } else if (ref.isObject3D) {
          // For GLTF, traverse to collect all meshes
          ref.traverse(child => {
            if (child.isMesh) {
              allMeshes.push(child);
            }
          });
        }
      });

      const intersects = raycaster.current.intersectObjects(allMeshes, true);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const shapeId = intersected.userData.shapeId;

        if (shapeId) {
          setSelectedId(shapeId);
        } else {
          setSelectedId(null);
        }
      } else {
        setSelectedId(null);
      }
    };

    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    return () => gl.domElement.removeEventListener('pointerdown', handlePointerDown);
  }, [camera, gl, shapes, setSelectedId]);



  useEffect(() => {  
    if (transformControlsRef.current) {
      console.log('Transform Control Reference, SceneManager, 3DScene.jsx ', transformControlsRef.current)
      const controls = transformControlsRef.current;
      const callback = (event) => {
        const orbitControls = scene.__interaction.find(c => c instanceof OrbitControls);
        if (orbitControls) orbitControls.enabled = !event.value;
      };
      controls.addEventListener('dragging-changed', callback);
      return () => controls.removeEventListener('dragging-changed', callback);
    }
  }, []);

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
          shapeId={shape.id}
        />
      ))}
      {controlledObject && (
        <TransformControls
          ref={transformControlsRef}
          object={controlledObject}
          mode="translate" // Default mode
        />
      )}
    </group>
  );
}


const ThreeCanvas = ({ shapes, selectedId, setSelectedId }) => {
  return (
    <Canvas
      camera={{ position: [0, 5, 10], fov: 50, near: 0.1, far: 1000 }}
      shadows
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#594040');
      }}
    >
      <directionalLight
        castShadow
        position={[0, 0, 10]}
        intensity={1}
        color={'#ffffff'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <SceneManager
        shapes={shapes}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
      <OrbitControls />
    </Canvas>
  );
};

export default ThreeCanvas;
