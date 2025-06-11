import { useState } from 'react';
import './App.css';

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
      </div>
    </div>
  );
}

export default App;
