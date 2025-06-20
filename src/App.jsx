import { useState } from 'react';
import './App.css';
import ThreeCanvas from './components/3DScene';

const shapeOptions = [
  'BoxGeometry',
  'SphereGeometry',
  'ConeGeometry',
  'CylinderGeometry',
  'TorusGeometry',
  'TetrahedronGeometry',
  'OctahedronGeometry',
  'DodecahedronGeometry',
  'Seashell'
];

const gltfUrls = {
  'Seashell' : '/models/seashell/scene.gltf'
}

function App() {
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const addShape = (type) => {
    const isGLTF = ['Seashell'].includes(type);
    const newObject = {
      id: Date.now().toString(),
      type: isGLTF ? 'GLTF' : type,
      position: [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
      rotation: [0, 0, 0],
      url: isGLTF ? gltfUrls[type] : null
    };
    setObjects(prev => [...prev, newObject]);
  };

  const manipulateObject = (action) => {
    setObjects(prev =>
      prev.map((obj) => {
        if (obj.id !== selectedId) return obj;
        switch (action) {
          case 'delete':
            return null;
          case 'rotate':
            return {
              ...obj,
              rotation: [
                obj.rotation[0],
                obj.rotation[1] + 0.5,
                obj.rotation[2]
              ],
            };
          case 'move':
            return {
              ...obj,
              position: [
                obj.position[0] + 0.5,
                obj.position[1],
                obj.position[2],
              ],
            };
          default:
            return obj;
        }
      }).filter(Boolean)
    );
  };

  return (
    <div className="app">
      <div className="left-panel">
        <ThreeCanvas
          shapes={objects}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      </div>

      <div className="right-panel">
        <h2>Shape Palette</h2>
        <div className="grid">
          {shapeOptions.map((shape) => (
            <button key={shape} onClick={() => addShape(shape)}>
              {shape.replace('Geometry', '')}
            </button>
          ))}
        </div>

        <div style={{ height: '1em' }} />

        <h2>Object Manipulation</h2>
        <div className="grid">
          <button onClick={() => manipulateObject('move')}>Move</button>
          <button onClick={() => manipulateObject('rotate')}>Rotate</button>
          <button onClick={() => manipulateObject('delete')}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default App;
