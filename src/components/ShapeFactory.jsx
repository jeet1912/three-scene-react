import * as THREE from 'three';
import { forwardRef } from 'react';

/**
 * ShapeFactory component generates a shape mesh from a given type, position, rotation, and material.
 * Props:
 * - type: The type of geometry (e.g., 'BoxGeometry', 'SphereGeometry')
 * - position: [x, y, z] position of the shape
 * - rotation: [x, y, z] rotation in radians
 * - materialProps: Material settings for meshLambertMaterial
 * - isSelected: If true, adds visual indication (optional glow effect or outline)
 * - meshRef: Forwarded ref for manipulation
 */

const ShapeFactory = forwardRef((props, ref) => {
  const {
    type,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    materialProps = {},
    isSelected = false,
  } = props;

  let geometry = null;

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
    emissiveIntensity: 0.7,
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
