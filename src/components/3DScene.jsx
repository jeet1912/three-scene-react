import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import ShapeFactory from './ShapeFactory';

const SceneManager = ({ shapes, selectedId, setSelectedId, orbitControlsRef }) => {
  const raycaster = useRef(new THREE.Raycaster());
  const { camera, gl, scene } = useThree();
  const shapesRef = useRef({});
  const transformControlsRef = useRef();
  const [controlledObject, setControlledObject] = useState(null);
  
  /*
  useEffect(()=>{
    console.log(shapesRef.current)
  },[shapes])
  */

  useEffect(() => {
    if (!selectedId) {
      setControlledObject(null); // when no selection
      return;
    }
    const ref = shapesRef.current[selectedId];
    if (ref && scene.getObjectById(ref.id)) {
      setControlledObject(ref);
    } else {
      setControlledObject(null); // Clear if ref is invalid or not in scene
    }
  }, [selectedId, shapes, scene]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!transformControlsRef.current) return;
      switch (event.key) {
        case 'm': // Translate
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
      const validRefs = Object.values(shapesRef.current).filter(Boolean);
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
  }, [camera, gl, shapes]);



  useEffect(() => {  
  if (!transformControlsRef.current || !orbitControlsRef.current) return;
  const controls = transformControlsRef.current;
  const callback = (event) => {
    orbitControlsRef.current.enabled = !event.value;
  };
  controls.addEventListener('dragging-changed', callback);
  return () => controls.removeEventListener('dragging-changed', callback);
}, [controlledObject]);

  return (
    <group>
      {shapes.map((shape) => (
        <ShapeFactory
          key={shape.id}
          ref={ref => {
            if (ref) shapesRef.current[shape.id] = ref;
            else delete shapesRef.current[shape.id];
          }}
          type={shape.type}
          position={shape.position}
          rotation={shape.rotation}
          url={shape.url}
          isSelected={shape.id === selectedId}
          shapeId={shape.id}
        />
      ))}
      {controlledObject && scene.getObjectById(controlledObject.id) && (
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
  const orbitControlsRef = useRef();
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
        orbitControlsRef={orbitControlsRef}
      />
      <OrbitControls 
        ref={orbitControlsRef}
      />
    </Canvas>
  );
};

export default ThreeCanvas;
