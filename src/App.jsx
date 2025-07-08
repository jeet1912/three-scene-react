import { useEffect, useState } from 'react';
import './App.css';
import ThreeCanvas from './components/3DScene';
import SKETCHFAB_API_TOKEN from './apiToken';

const shapeOptions = [
  'BoxGeometry',
  'SphereGeometry',
  'ConeGeometry',
  'CylinderGeometry',
  'TorusGeometry',
  'TetrahedronGeometry',
  'OctahedronGeometry',
  'DodecahedronGeometry',
  //'Seashell'
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
            setSelectedId(null)
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
      }).filter(Boolean)  // removes null values from objects.
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

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
        <div style={{
          padding: '0.5em',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '2em',
          width: '100%',
        }}>
          <input style={{
            width: '50%',
            padding: '0.5em',
            margin: '0.5em 0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1em',
            boxSizing: 'border-box',
          }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder='Search custom model'
          />
          <button onClick={()=> handleSketchfabSearch(searchTerm)} disabled={loading}>
            {loading ? "Searching...." : "Add from Sketchfab"}
          </button>
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
