import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const BasicCube = () => (
  <mesh position={[0, 0, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="skyblue" />
  </mesh>
);

const ThreeCanvas = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50, }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <BasicCube />
      <OrbitControls />
    </Canvas>
  );
};

export default ThreeCanvas;

