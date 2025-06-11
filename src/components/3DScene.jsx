import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
        position: [0, 0, 10], 
        fov: 50, 
        near: 0.1,
        far: 1000,
      }}
      
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#FAF9F6');
      }}
    >
      <ambientLight intensity={0.5} />
      <spotLight 
        position={[-5, 10, 5]} 
        angle={0.3} 
        penumbra={1} 
        intensity={1.2} 
        castShadow
        color="#FFE5B4"
        />
      {props.selectedShape && <ShapeFactory type={props.selectedShape} />}
      <OrbitControls />
    </Canvas>
  );
};

export default ThreeCanvas;

