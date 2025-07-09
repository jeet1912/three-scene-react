import { useEffect, useState } from 'react';
import './App.css';
import ThreeCanvas from './components/3DScene';
import SKETCHFAB_API_TOKEN from './apiToken';
import JSZip from 'jszip';

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
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  
  const addShape = (type) => {

    const newObject = {
      id: Date.now().toString(),
      type: type,
      position: [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
      rotation: [0, 0, 0],
      url: null
    };
    setObjects(prev => [...prev, newObject]);
  };

  const manipulateObject = (action) => {
    setObjects(prev =>
      prev.map((obj) => {
        if (obj.id !== selectedId) return obj;
        switch (action) {
          case 'delete':
            setSelectedId(null);
            if (obj.url && obj.url.startsWith('blob:')) {
                URL.revokeObjectURL(obj.url);
              }
            if (obj.assetUrls) {
              obj.assetUrls.forEach((url) => URL.revokeObjectURL(url));
            }
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
      //console.log('App.jsx :: Selected GLTF url is ',modelData.gltf.url)
      //console.log(modelData.gltf.url.slice(-10))
      
      const url = modelData.gltf.url;
  
      // If the URL contains .zip, extract the first .gltf or .glb and create a blob URL
      if (url.includes('.zip')) {
        const zipRes = await fetch(url);
        const zipBlob = await zipRes.blob();
        const zip = await JSZip.loadAsync(zipBlob);

        let gltfFile = null;
        let gltfFileName = null;
        const assetUrls = {};

        // Extract all files, handling nested paths
        for (const fileName in zip.files) {
          const file = zip.files[fileName];
          if (!gltfFile && (fileName.endsWith('.gltf') || fileName.endsWith('.glb'))) {
            gltfFile = file;
            gltfFileName = fileName;
          } else if (!file.dir) {
            const blob = await file.async('blob');
            assetUrls[fileName] = URL.createObjectURL(blob);
          }
          //console.log('File ',file)
          //console.log('GLTF File ', gltfFile)
          //console.log('GLTF Filename ', fileName)
        }

        if (!gltfFile) {
          alert('No .gltf or .glb file found in the ZIP.');
          return;
        }

        let gltfUrl;
        const blobUrls = Object.values(assetUrls);
        if (gltfFileName.endsWith('.gltf')) {
          const gltfText = await gltfFile.async('string');
          let gltfJson = JSON.parse(gltfText);

          // Patch buffer and image URIs, handling nested paths
          const normalizePath = (path) => {
            // Remove './' or leading slashes, keep relative path
            return path.replace(/^\.\//, '').replace(/^\//, '');
          };

          if (gltfJson.buffers) {
            gltfJson.buffers.forEach((buffer) => {
              const normalizedUri = normalizePath(buffer.uri);
              if (assetUrls[normalizedUri]) {
                buffer.uri = assetUrls[normalizedUri];
              } else if (buffer.uri && !buffer.uri.startsWith('data:')) {
                console.warn(`Buffer URI not found in ZIP: ${buffer.uri}`);
              }
            });
          }
          if (gltfJson.images) {
            gltfJson.images.forEach((image) => {
              const normalizedUri = normalizePath(image.uri);
              if (assetUrls[normalizedUri]) {
                image.uri = assetUrls[normalizedUri];
              } else if (image.uri && !image.uri.startsWith('data:')) {
                console.warn(`Image URI not found in ZIP: ${image.uri}`);
              }
            });
          }
          const patchedBlob = new Blob([JSON.stringify(gltfJson)], {
            type: 'application/json',
          });
          gltfUrl = URL.createObjectURL(patchedBlob);
        } else {
          const gltfData = await gltfFile.async('uint8array');
          const blob = new Blob([gltfData], { type: 'model/gltf-binary' });
          gltfUrl = URL.createObjectURL(blob);
          blobUrls.length = 0; // Clear assetUrls for .glb
        }

        const newObject = {
          id: Date.now().toString(),
          type: 'GLTF',
          position: [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
          rotation: [0, 0, 0],
          url: gltfUrl,
          assetUrls: blobUrls, // Store for cleanup
        };
        setObjects((prev) => [...prev, newObject]);
        setSketchfabResults([]);
      } else {
        alert('Unsupported file format.');
      }


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
            onKeyDown={e => {
              if (e.key === 'Enter' && !loading && !rendering) {
                handleSketchfabSearch(searchTerm);
              }
            }}
            placeholder='Enter custom model'
          />
          <button onClick={()=> handleSketchfabSearch(searchTerm)} disabled={loading}>
            {loading ? "Searching...." : rendering ? "Please wait" : "Search on Sketchfab"}
          </button>
        </div>
        {sketchfabResults.length > 0 && !rendering && (
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
