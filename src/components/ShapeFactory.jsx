import * as THREE from 'three';
import { forwardRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useEffect } from 'react';
/**
 * ShapeFactory component generates a shape mesh from a given type, position, rotation, and material.
 * Props:
 * - type: The type of geometry (e.g., 'BoxGeometry', 'SphereGeometry')
 * - position: [x, y, z] position of the shape
 * - rotation: [x, y, z] rotation in radians
 * - materialProps: Material settings for meshLambertMaterial
 * - isSelected: If true, adds visual indication (optional glow effect or outline)
 * - meshRef: Forwarded ref for manipulation
 * - url: URL for GLTF type                                                        
 */

function cloneGLTF(gltf) {
  const clonedScene = SkeletonUtils.clone(gltf.scene);
  clonedScene.traverse(child => {
    if (child.isMesh) {
      child.userData.originalMaterial = child.material.clone();
    }
  });
  return clonedScene;
}

function enableRaycastOnChildren(object, shapeId) {
  object.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.raycast = THREE.Mesh.prototype.raycast; // Ensures proper raycast support
      child.userData.selectable = true; // Optional: flag for your selection logic
      child.userData.shapeId = shapeId;
    }
  });
}

const ShapeFactory = forwardRef((props, ref) => {
 const {
    type,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    materialProps = {},
    isSelected = false,
    url = null,
    shapeId,
  } = props;

  let geometry = null;

  if (type === 'GLTF') {
    if (!url) return null;
    const gltf = useLoader(GLTFLoader, url);
    const cloned = cloneGLTF(gltf);
    
    useEffect(() => {
      enableRaycastOnChildren(cloned, shapeId);
      if (isSelected) {
        // Apply wireframe material to all meshes in the GLTF scene
        cloned.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: '#ffffff',
              emissive: '#ffcc00',
              emissiveIntensity: 1,
              wireframe: true,
            });
          }
        });
      } else {
        // Restore original materials when not selected
        cloned.traverse(child => {
          if (child.isMesh && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
          }
        });
      }
    }, [cloned, shapeId, isSelected]);

    return (
      <group ref={ref} position={position} rotation={rotation} scale={[10, 10, 10]}>
        <primitive object={cloned} />
      </group>
    );
  }

  switch (type) {
    case 'BoxGeometry':
      geometry = <boxGeometry args={[1, 1, 1]} />;
      break;
    case 'SphereGeometry':
      geometry = <sphereGeometry args={[0.75, 32, 32]} />;
      break;
    case 'ConeGeometry':
      geometry = <coneGeometry args={[0.5, 1.5, 32]} />;
      break;
    case 'CylinderGeometry':
      geometry = <cylinderGeometry args={[0.5, 0.5, 1.5, 32]} />;
      break;
    case 'TorusGeometry':
      geometry = <torusGeometry args={[0.6, 0.2, 16, 100]} />;
      break;
    case 'TetrahedronGeometry':
      geometry = <tetrahedronGeometry args={[0.8]} />;
      break;
    case 'OctahedronGeometry':
      geometry = <octahedronGeometry args={[0.8]} />;
      break;
    case 'DodecahedronGeometry':
      geometry = <dodecahedronGeometry args={[0.8]} />;
      break;
    default:
      return null;
  }

  const defaultMaterial = {
    color: '#F28482',
    emissive: '#F6BD60',
    emissiveIntensity: 1,
    flatShading: false,
    side: THREE.DoubleSide,
    ...materialProps,
  };

  return (
    <mesh
      position={position}
      rotation={rotation}
      ref={ref}
      castShadow
      receiveShadow
      userData={{ selectable: true, shapeId }}
    >
      {geometry}
      <meshLambertMaterial {...defaultMaterial} />
      {isSelected && (
        <meshStandardMaterial
          attach="material"
          color="#ffffff"
          emissive="#ffcc00"
          emissiveIntensity={1}
          wireframe
        />
      )}
    </mesh>
  );
});

export default ShapeFactory;