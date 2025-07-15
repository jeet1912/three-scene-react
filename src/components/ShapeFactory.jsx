import * as THREE from 'three';
import { forwardRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useEffect } from 'react';

/**
 * ShapeFactory component renders a 3D mesh or GLTF model based on provided props.
 * Supports basic geometries (e.g., Box, Sphere) and GLTF models with raycasting and selection highlighting.
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Geometry type (e.g., 'BoxGeometry', 'SphereGeometry', 'GLTF')
 * @param {number[]} [props.position=[0, 0, 0]] - Position of the shape [x, y, z]
 * @param {number[]} [props.rotation=[0, 0, 0]] - Rotation of the shape in radians [x, y, z]
 * @param {Object} [props.materialProps={}] - Custom material settings for meshLambertMaterial
 * @param {boolean} [props.isSelected=false] - If true, applies a wireframe highlight to indicate selection
 * @param {string|null} [props.url=null] - URL for GLTF model (required for type='GLTF')
 * @param {string} props.shapeId - Unique identifier for the shape, used for raycasting
 * @param {React.Ref} ref - Forwarded ref for accessing the mesh or group in the parent
 */

function cloneGLTF(gltf) {
  // Clones a GLTF scene and preserves original materials for each mesh
  const clonedScene = SkeletonUtils.clone(gltf.scene);
  clonedScene.traverse(child => {
    if (child.isMesh) {
      child.userData.originalMaterial = child.material.clone();
    }
  });
  return clonedScene;
}

function enableRaycastOnChildren(object, shapeId) {
  // Configures GLTF scene meshes for raycasting and shadow support, assigning shapeId for selection
  object.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.raycast = THREE.Mesh.prototype.raycast; // Ensures proper raycast support
      child.userData.selectable = true; // Marks mesh as selectable
      child.userData.shapeId = shapeId; // Associates mesh with shapeId
    }
  });
}

const ShapeFactory = forwardRef((props, ref) => {
  const {
    type,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    materialProps = {},
    isSelected = false,
    url = null,
    shapeId,
    color = '#f5f5dc'
  } = props;

  let geometry = null;

  // Define geometry based on type
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
    case 'GLTF': if (!url) return null;
      const gltf = useLoader(GLTFLoader, url);
      const cloned = cloneGLTF(gltf);
      
      // Normalization
      const box = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      box.getSize(size);
      // Find the largest dimension
      const maxDim = Math.max(size.x, size.y, size.z);
      // Desired normalized size (e.g., 1 unit)
      const targetSize = 1;
      const scale = targetSize / maxDim;
      // Center the model
      const center = new THREE.Vector3();
      box.getCenter(center);
      cloned.position.sub(center); // Move center to origin
      // Scale the model
      cloned.scale.setScalar(scale);

      useEffect(() => {
        // Enable raycasting and apply selection highlight for GLTF meshes
        enableRaycastOnChildren(cloned, shapeId);
        if (isSelected) {
          // Apply wireframe material to all meshes when selected
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
              child.material.color.set(color);
            }
          });
        }
      }, [cloned, shapeId, isSelected]);

      return (
        <group ref={ref} position={position} rotation={rotation} scale={scale}>
          <primitive object={cloned} />
        </group>
      );
    default:
      return null;
  }

  // Default material properties for basic geometries
  const defaultMaterial = {
    color,
    emissive: '#0e1a40',
    emissiveIntensity: 1,
    flatShading: false,
    side: THREE.FrontSide,
    ...materialProps,
  };

  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      ref={ref}
      castShadow
      receiveShadow
      userData={{ selectable: true, shapeId }}
    >
      {geometry}
      {isSelected ? (
        // Apply wireframe material for selected basic geometries
        <meshLambertMaterial
          attach="material"
          color="#ffffff"
          emissive="#ffcc00"
          emissiveIntensity={1}
          wireframe
        />
      ) : <meshLambertMaterial {...defaultMaterial} />
    }
    </mesh>
  );
});

export default ShapeFactory;