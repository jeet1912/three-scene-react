import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import * as THREE from 'three';
import ShapeFactory from './ShapeFactory';

/*
function CameraAdjuster() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      gl.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, gl]);

  return null;
}
*/

const ThreeCanvas = (props) => {
  return (
    <Canvas
      camera={{ 
        position: [0, 5, 10], 
        fov: 50, 
        near: 0.1,
        far: 1000,
      }}
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
      {props.selectedShape && <ShapeFactory type={props.selectedShape} />}
      <OrbitControls />
      <Stats />
    </Canvas>
  );
};

export default ThreeCanvas;

