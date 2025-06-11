import * as THREE from 'three';

const ShapeFactory = ({ type }) => {
  let geometry = null;
  const material = <meshLambertMaterial color={'#F28482'} emissive={'#F6BD60'} emissiveIntensity={0.7} side={THREE.DoubleSide}
  />;

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

  return (
    <mesh position={[0, 0, 0]}>
      {geometry}
      {material}
    </mesh>
  );
};

export default ShapeFactory;
