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
  const [sketchfabResults, setSketchfabResults] = useState([]);
  const [rendering, setRendering] = useState(false);

  const handleSketchfabSearch = async (searchTerm) => {
    setLoading(true);
    try {
      const searchRes = await fetch( 
        `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(searchTerm)}&downloadable=true`, 
        {
          headers: {'Authorization': `Token ${SKETCHFAB_API_TOKEN}`}
        }
      );
      const searchData = await searchRes.json();
      if (!searchData.results || searchData.results.length === 0) {
        alert('No downloadable models found for this search.');
        setLoading(false);
        return;
      }
      //console.log(searchData)
      setSketchfabResults(searchData.results);
    } catch (err) {
      alert('Error fetching model from Sketchfab.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSketchfabModel = async (model) => {
    setRendering(true);
    try{
      const modelRes = await fetch(
        `https://api.sketchfab.com/v3/models/${model.uid}/download`,
        {
          headers: { 'Authorization': `Token ${SKETCHFAB_API_TOKEN}` }
        }
      );
      const modelData = await modelRes.json();
      //console.log(modelData)
      if (!modelData.gltf || !modelData.gltf.url) {
      alert('No GLTF download available for this model.');
      setLoading(false);
      return;
      }
      // Only allow direct .gltf or .glb files
      if (!modelData.gltf.url.endsWith('.gltf') && !modelData.gltf.url.endsWith('.glb')) {
        alert('This Sketchfab model is packaged as a ZIP and cannot be loaded directly. Please choose another.');
        setLoading(false);
        return;
      }
      console.log('App.jsx :: Selected GLTF url is ',modelData.gltf.url)
      const newObject = {
        id: Date.now().toString(),
        type: 'GLTF',
        position: [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
        rotation: [0, 0, 0],
        url: modelData.gltf.url,
      };
      setObjects(prev => [...prev, newObject]);
      setSketchfabResults([]);
    } catch (err){
      alert('Error fetching model from Sketchfab.');
      console.error(err);
    } finally {
      setRendering(false);
    }
  }

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
            placeholder='Enter custom model'
          />
          <button onClick={()=> handleSketchfabSearch(searchTerm)} disabled={loading}>
            {loading ? "Searching...." : rendering ? "Please wait" : "Search on Sketchfab"}
          </button>
        </div>
        {sketchfabResults.length > 0 && (
          <div>
            <h3>Select a Sketchfab Model:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1em' }}>
              {sketchfabResults.map(model => (
                <button
                  key={model.uid}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleAddSketchfabModel(model)}
                >
                  <img
                    src={model.thumbnails.images[0]?.url}
                    alt={model.name}
                    style={{ width: '5rem', height: '5rem', objectFit: 'cover', borderRadius: 8, marginBottom: 4 }}
                  />
                </button>
              ))}
            </div>

          </div>
        )}
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
