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
];

function App() {
  const [selectedShape, setSelectedShape] = useState(null);

  return (
    <div className="app">
      <div className="left-panel">
        <ThreeCanvas selectedShape={selectedShape}/>
      </div>

      <div className="right-panel">
        <h2>Shape Palette</h2>
        <div className="grid">
          {shapeOptions.map((shape) => (
            <button key={shape} onClick={() => setSelectedShape(shape)}>
              {shape.replace('Geometry', '')}
            </button>
          ))}
        </div>
        <div style={{height: '20px'}} />
        <h2>Object Manipulation</h2>
        <div className='grid'>
          <button>Move</button>
          <button>Rotate</button>
          <button>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default App;
