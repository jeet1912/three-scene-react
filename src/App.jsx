import { useEffect, useState, useRef } from 'react';
import './App.css';
import ThreeCanvas from './components/Canvas';
import keys from '../apiToken';
import JSZip from 'jszip';
import axios from 'axios';
import OpenAI from 'openai';

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
  
  const [positionInput, setPositionInput] = useState({ x: 0, y: 0, z: 0 });
  const [scaleInput, setScaleInput] = useState({ x: 1, y: 1, z: 1 });
  const [rotationInput, setRotationInput] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (selectedId) {
      const selectedObject = objects.find((obj) => obj.id === selectedId);
      if (selectedObject) {
        setPositionInput({
          x: selectedObject.position[0],
          y: selectedObject.position[1],
          z: selectedObject.position[2],
        });
        // Assuming scale is not yet in the object, default to 1
        setScaleInput({
          x: selectedObject.scale[0],
          y: selectedObject.scale[1],
          z: selectedObject.scale[2]
        });
        setRotationInput({
          x: selectedObject.rotation[0],
          y: selectedObject.rotation[1],
          z: selectedObject.rotation[2],
        });
      }
    } else {
      // Reset inputs when no object is selected
      setPositionInput({ x: 0, y: 0, z: 0 });
      setScaleInput({ x: 1, y: 1, z: 1 });
      setRotationInput({ x: 0, y: 0, z: 0 });
    }
  }, [selectedId, objects]);

  const addShape = (type) => {
    const newObject = {
      id: Date.now().toString(),
      type: type,
      position: [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
      rotation: [0, 0, 0],
      scale: [1,1,1],
      name: type,
      url: null
    };
    setObjects(prev => [...prev, newObject]);
  };

const deleteObject = (id) => {
  setObjects(prev =>
    prev
      .map((obj) => {
        if (obj.id !== id) return obj;
        setSelectedId(null);
        if (obj.url && obj.url.startsWith('blob:')) {
          URL.revokeObjectURL(obj.url);
        }
        if (obj.assetUrls) {
          obj.assetUrls.forEach((url) => URL.revokeObjectURL(url));
        }
        return null;
      })
      .filter(Boolean) // removes null values from objects.
  );
};

  const updateObjectProperties = () => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedId) return obj;
        return {
          ...obj,
          position: [
            parseFloat(positionInput.x) || 0,
            parseFloat(positionInput.y) || 0,
            parseFloat(positionInput.z) || 0,
          ],
          scale: [
            parseFloat(scaleInput.x) || 1,
            parseFloat(scaleInput.y) || 1,
            parseFloat(scaleInput.z) || 1,
          ],
          rotation: [
            parseFloat(rotationInput.x) || 0,
            parseFloat(rotationInput.y) || 0,
            parseFloat(rotationInput.z) || 0,
          ],
        };
      })
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sketchfabResults, setSketchfabResults] = useState([]);
  const [rendering, setRendering] = useState(false);

  const handleSketchfabSearch = async (searchTerm, didLLM=false) => {
    setLoading(true);
    try {
      const searchRes = await fetch( 
        `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(searchTerm)}&downloadable=true`, 
        {
          headers: {'Authorization': `Token ${keys['sketchFab']}`}
        }
      );
      const searchData = await searchRes.json();
      console.log('Search data ', searchData)
      // After fetching and checking results
      if (!searchData.results || searchData.results.length === 0) {
        alert('No downloadable models found for this search.');
        setLoading(false);
        return;
      }  
      const sortedResults = [...searchData.results].sort(
          (a, b) => (b.likeCount || 0) - (a.likeCount || 0)
      );
      if (didLLM) {
        if (sortedResults.length > 0) {
          setSketchfabResults(sortedResults[0]); // Set the best model
        } else {
          setSketchfabResults(null); // Set to null if no results
        }
      } else {
        setSketchfabResults(sortedResults.slice(0, 12)); // Display top 12 for manual search
      }
    } catch (err) {
      alert('Error fetching model from Sketchfab.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSketchfabModel = async (model) => {
    console.log("Which model is here? ", model.uid)
    setRendering(true);
    try{
      const modelRes = await fetch(
        `https://api.sketchfab.com/v3/models/${model.uid}/download`,
        {
          headers: { 'Authorization': `Token ${keys['sketchFab']}` }
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
          console.log('GLTF Filename ', fileName)
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
          scale: [1, 1, 1],
          url: gltfUrl,
          assetUrls: blobUrls,
          name: model.name || 'GLTF',
          color: '#f5f5dc', 
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

  useEffect(() => {
    console.log('Objects ',objects)
  }, [objects])

  const [llmInput, setLlmInput] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmFeedback, setLlmFeedback] = useState('');
  const [llmTriggeredSearch, setLlmTriggeredSearch] = useState(false);

 useEffect(() => {
  if (sketchfabResults && llmTriggeredSearch) {
    handleAddSketchfabModel(sketchfabResults);
    setLlmFeedback((prev) => prev + '. Added the best model to the scene');
    setLlmTriggeredSearch(false);
  }}, [sketchfabResults, llmTriggeredSearch]);

 const handleLlmCommand = async () => {
  if (!llmInput) {
    setLlmFeedback('Please enter a command.');
    return;
  }

  try {
    setLlmLoading(true);
    setLlmFeedback('Processing command...');

    // Construct scene state
    const sceneState = {
      objects: objects.map(({ id, type, position, rotation, scale, name }) => ({
        id,
        type,
        position: [...position],
        rotation: [...rotation],
        scale: [...scale],
        name: name || type,
      })),
      selectedId,
      availableShapes: shapeOptions.map((s) => s.replace('Geometry', '')),
      availableActions: ['add', 'addMultiple', 'manipulate', 'color', 'select', 'search', 'list', 'clear', 'deleteMultiple'],
    };

    console.log('Current scene: ', JSON.stringify(sceneState.objects.position));

    const response = await axios.post('http://localhost:3001/api/llm-command', {
      llmInput,
      sceneState,
    });
    const results = response.data.results;
    console.log('LLM results ',results)
    // Collect feedback for all commands
    const feedbackMessages = [];

    // Process each command sequentially
    for (const result of results) {
      const { action, type, value, targetId, name, feedback, actionType, targetIds } = result;

      if (feedback) {
        feedbackMessages.push(feedback);
        continue; // Skip to next command if feedback indicates ambiguity
      }

      if (!action) {
        feedbackMessages.push('Invalid command: action is undefined');
        continue;
      }

      switch (action) {
        case 'add':
          if (shapeOptions.includes(type)) {
            const isValidPosition =
              value &&
              value.position &&
              typeof value.position.x === 'number' &&
              typeof value.position.y === 'number' &&
              typeof value.position.z === 'number';
            setObjects((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                type,
                position: isValidPosition
                  ? [value.position.x, value.position.y, value.position.z]
                  : [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                name: type,
                color: value?.color || '#f5f5dc',
              },
            ]);
            feedbackMessages.push(`Added ${type.replace('Geometry', '')}`);
          } else {
            feedbackMessages.push(`Invalid shape: ${type}. Available: ${shapeOptions.map(s => s.replace('Geometry', '')).join(', ')}`);
          }
          break;
        case 'addMultiple':
          if (Array.isArray(value) && value.every((item) => shapeOptions.includes(item.type))) {
            setObjects((prev) => [
              ...prev,
              ...value.map((item) => ({
                id: Date.now().toString() + Math.random(),
                type: item.type,
                position:
                  item.position &&
                  typeof item.position.x === 'number' &&
                  typeof item.position.y === 'number' &&
                  typeof item.position.z === 'number'
                  ? [item.position.x, item.position.y, item.position.z]
                  : [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                name: item.type,
              })),
            ]);
            feedbackMessages.push(`Added ${value.length} objects`);
          } else {
            feedbackMessages.push(`Invalid types in addMultiple. Available: ${shapeOptions.map(s => s.replace('Geometry', '')).join(', ')}`);
          }
          break;
        case 'manipulate':
          let targetObj;
          if (targetId) {
            targetObj = objects.find((obj) => obj.id === targetId);
          } else if (name) {
            const matchingObjects = objects.filter((obj) => obj.name.toLowerCase() === name.toLowerCase());
            if (matchingObjects.length > 1) {
              feedbackMessages.push(`Multiple objects found for ${name}, please specify ID or select a specific object`);
              continue;
            }
            targetObj = matchingObjects[0];
          } else if (selectedId) {
            targetObj = objects.find((obj) => obj.id === selectedId);
          }
          if (!targetObj) {
            feedbackMessages.push('No object selected for manipulation');
            continue;
          }
          if (['move', 'rotate', 'scale', 'delete'].includes(actionType)) {
            if (actionType === 'delete') {
              deleteObject(targetObj.id);
              feedbackMessages.push(`Deleted ${targetObj.name.replace('Geometry', '')} (ID: ${targetObj.id})`);
            } else {
              setObjects((prev) =>
                prev.map((obj) => {
                  if (obj.id !== targetObj.id) return obj;
                  const propMap = {
                    move: 'position',
                    rotate: 'rotation',
                    scale: 'scale',
                  };
                  const prop = propMap[actionType];
                  const current = [...obj[prop]];
                  const newValue = value
                    ? [
                        value.x !== undefined ? parseFloat(value.x) : current[0],
                        value.y !== undefined ? parseFloat(value.y) : current[1],
                        value.z !== undefined ? parseFloat(value.z) : current[2],
                      ]
                    : [
                        actionType === 'move' ? current[0] + 5 : current[0],
                        actionType === 'rotate' ? current[1] + 0.7854 : current[1], // Default 45 degrees
                        actionType === 'scale' ? current[2] * 2 : current[2],
                      ];
                  return {
                    ...obj,
                    [prop]: newValue,
                  };
                })
              );
              feedbackMessages.push(`Performed ${actionType} on ${targetObj.name.replace('Geometry', '')} (ID: ${targetObj.id})`);
            }
          } else {
            feedbackMessages.push(`Invalid action: ${actionType}`);
          }
          break;
        case 'select':
          let selectObj;
          if (targetId) {
            selectObj = objects.find((obj) => obj.id === targetId);
          } else if (name) {
            const matchingObjects = objects.filter((obj) => obj.name.toLowerCase() === name.toLowerCase());
            if (matchingObjects.length > 1) {
              feedbackMessages.push(`Multiple objects found for ${name}, please specify ID or select a specific object`);
              continue;
            }
            selectObj = matchingObjects[0];
          }
          if (selectObj) {
            setSelectedId(selectObj.id);
            feedbackMessages.push(`Selected ${selectObj.name.replace('Geometry', '')} (ID: ${selectObj.id})`);
          } else {
            feedbackMessages.push(`Object not found: ${targetId || name}`);
          }
          break;
        case 'search':
          try {
            await handleSketchfabSearch(value, true);
            setLlmTriggeredSearch(true);
            feedbackMessages.push(`Searched for ${value}`);
          } catch (err) {
            console.error('Search error details:', err); 
            feedbackMessages.push(`Error during Sketchfab search: ${err.message}`);
            setLlmTriggeredSearch(false);
          }
          break;
        case 'list':
          if (objects.length === 0) {
            feedbackMessages.push('No objects in the scene');
          } else {
            feedbackMessages.push(
              'Objects in scene: ' +
                objects
                  .map((obj) => `${obj.name || obj.type.replace('Geometry', '')} (ID: ${obj.id})`)
                  .join(', ')
            );
          }
          break;
        case 'clear':
          if (objects.length === 0) {
            feedbackMessages.push('The scene is already empty');
            continue;
          }
          setObjects((prev) => {
            prev.forEach((obj) => deleteObject(obj.id));
            return [];
          });
          feedbackMessages.push('All objects have been removed from the scene');
          break;
        case 'deleteMultiple':
          if (!targetIds && !name) {
            feedbackMessages.push('No target IDs or name provided for deleteMultiple');
            continue;
          }
          setObjects((prev) => {
            const toDelete = targetIds
              ? prev.filter((obj) => targetIds.includes(obj.id))
              : name
              ? prev.filter((obj) => obj.name.toLowerCase() === name.toLowerCase())
              : [];
            if (toDelete.length === 0) {
              feedbackMessages.push(`No objects found with name ${name} or IDs ${targetIds?.join(', ') || 'none'}`);
              return prev;
            }
            toDelete.forEach((obj) => deleteObject(obj.id));
            feedbackMessages.push(`Deleted ${toDelete.length} ${name ? name.replace('Geometry', '') : 'objects'}${targetIds ? ` (IDs: ${targetIds.join(', ')})` : ''}`);
            return targetIds
              ? prev.filter((obj) => !targetIds.includes(obj.id))
              : name
              ? prev.filter((obj) => obj.name.toLowerCase() !== name.toLowerCase())
              : prev;
          });
          break;
        default:
          feedbackMessages.push(`Unknown command: ${action}`);
      }
    }

    // Set final feedback by joining all messages
    setLlmFeedback(feedbackMessages.join('. '));
    } catch (err) {
      setLlmFeedback('Error processing command: ' + err.message);
      console.error('LLM error:', err);
    } finally {
      setLlmLoading(false);
      setLlmInput('');
    }
  };


  const bottomRef = useRef(null);
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sketchfabResults, selectedId]);

  const topRef = useRef(null);
  useEffect(() => {
  if (!selectedId && topRef.current) {
    topRef.current.scrollIntoView({ behavior: 'smooth' });
  }
  }, [sketchfabResults, selectedId]);

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
        <div ref={topRef}/>
        <h2>Shape Palette</h2>
        <div className="grid">
          {shapeOptions.map((shape) => (
            <button key={shape} 
             style={{
              background: "transparent",
              border: 'none',                
              boxShadow: 'none',   
              padding: 0,                   
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '6rem',
            }}
            onClick={() => {
            addShape(shape)}}>
              <img
                src={`/assets/${shape.replace('Geometry', '').toLowerCase()}.png`}
                alt={shape.replace('Geometry', '')}
                style={{ width: '100%', height: '6rem', objectFit: 'cover', borderRadius: 8, marginBottom: 4 }}
              />
              {shape.replace('Geometry', '')}
            </button>
          ))}
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          marginTop: '1em',
        }}>
          <input style={{
            width: '50%',
            padding: '0.5em',
            marginRight: '0.5em',
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
          <button onClick={()=> handleSketchfabSearch(searchTerm)} disabled={loading || !searchTerm}>
            {loading ? "Searching...." : rendering ? "Please wait" : "Search on Sketchfab"}
          </button>
        </div>
        {sketchfabResults.length > 0 && !rendering && (
          <div>
            <h3>Select a Sketchfab Model:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2em' }}>
              {sketchfabResults.map(model => (
                <button
                  key={model.uid}
                  style={{ 
                    border: 'none',                
                    boxShadow: 'none',             
                    padding: 0,                    
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',  
                  }}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            marginTop: '1em',
          }}
        >
          <input
            style={{
               width: '50%',
              padding: '0.5em',
              marginRight: '0.5em',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1em',
              boxSizing: 'border-box',
            }}
            value={llmInput}
            onChange={(e) => setLlmInput(e.target.value)}
            placeholder="'add sphere' or 'search car'"
            disabled={llmLoading || loading || rendering}
            onKeyDown={(e) => e.key === 'Enter' && handleLlmCommand()}
          />
          <button
            onClick={handleLlmCommand}
            disabled={llmLoading || loading || rendering || !llmInput.trim()}
          >
            {llmLoading ? 'Processing...' : 'Implement using an LLM'}
          </button>
        </div>
        {llmFeedback && (
          <p style={{ color: llmFeedback.startsWith('Error') ? 'red' : 'black', marginTop: '0.5em' }}>
            {llmFeedback}
          </p>
        )}
        {selectedId && (
          <div>
          <h2>Object Manipulation</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
              {/* Position Inputs */}
              <div style={{marginTop:'-1.5em'}}>
                <h3>Position</h3>
                <div style={{ display: 'flex', gap: '0.5em' }}>
                  <input
                    type="number"
                    value={positionInput.x}
                    onChange={(e) =>
                      setPositionInput({ ...positionInput, x: e.target.value })
                    }
                    placeholder="X"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={positionInput.y}
                    onChange={(e) =>
                      setPositionInput({ ...positionInput, y: e.target.value })
                    }
                    placeholder="Y"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={positionInput.z}
                    onChange={(e) =>
                      setPositionInput({ ...positionInput, z: e.target.value })
                    }
                    placeholder="Z"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              </div>
              {/* Scale Inputs */}
              <div>
                <h3>Scale</h3>
                <div style={{ display: 'flex', gap: '0.5em' }}>
                  <input
                    type="number"
                    value={scaleInput.x}
                    onChange={(e) => setScaleInput({ ...scaleInput, x: e.target.value })}
                    placeholder="X"
                    step="0.1"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={scaleInput.y}
                    onChange={(e) => setScaleInput({ ...scaleInput, y: e.target.value })}
                    placeholder="Y"
                    step="0.1"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={scaleInput.z}
                    onChange={(e) => setScaleInput({ ...scaleInput, z: e.target.value })}
                    placeholder="Z"
                    step="0.1"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              </div>
              {/* Rotation Inputs */}
              <div>
                <h3>Rotation (radians)</h3>
                <div style={{ display: 'flex', gap: '0.5em' }}>
                  <input
                    type="number"
                    value={rotationInput.x}
                    onChange={(e) =>
                      setRotationInput({ ...rotationInput, x: e.target.value })
                    }
                    placeholder="X"
                    step="0.1"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={rotationInput.y}
                    onChange={(e) =>
                      setRotationInput({ ...rotationInput, y: e.target.value })
                    }
                    placeholder="Y"
                    step="0.1"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <input
                    type="number"
                    value={rotationInput.z}
                    onChange={(e) =>
                      setRotationInput({ ...rotationInput, z: e.target.value })
                    }
                    placeholder="Z"
                    step="0.1"
                    style={{ width: '33%', padding: '0.5em', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              </div>
              <div style={{gap:'0.3em'}}> </div>
              <div style={{display: 'flex', flexDirection: 'row', gap: '1em', justifyContent:'center'}}> 
              <button onClick={updateObjectProperties}>
                Apply
              </button>
              <button onClick={() => deleteObject(selectedId)}>Delete</button>
              </div>
            </div>
          </div>
        )}
         <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default App;
