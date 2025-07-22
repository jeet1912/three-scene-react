import { useEffect, useState, useRef } from 'react';
import './App.css';
import ThreeCanvas from './components/Canvas';
import SKETCHFAB_API_TOKEN from './apiToken';
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
          headers: {'Authorization': `Token ${SKETCHFAB_API_TOKEN}`}
        }
      );
      const searchData = await searchRes.json();
      //console.log('Search data ', searchData)
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
      setLlmTriggeredSearch(false); // Reset flag
    }
  }, [sketchfabResults]);

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
        objects: objects.map(({ id, type, position, rotation, scale, name}) => ({
          id,
          type,
          position: [...position], 
          rotation: [...rotation],
          scale: [...scale],
          name: name || type
        })),
        selectedId,
        availableShapes: shapeOptions.map((s) => s.replace('Geometry', '')),
        availableActions: ['add','addMultiple', 'move', 'rotate', 'scale', 'delete', 'select', 'list', 'search'],
      };

      console.log('Current scene : ', JSON.stringify(sceneState))

      const response = await axios.post(
        'http://localhost:11434/api/chat',
        {
          model: 'llama3',
          messages: [
            {
              role: 'system',
              content: `
              You are an assistant controlling a 3D scene built with Three.js. The current scene state is: ${JSON.stringify(sceneState)}.
            Parse the user's command to perform actions like adding shapes, adding multiple shapes, manipulating objects (move, rotate, scale, delete), 
            changing colors, selecting objects by ID or name, searching Sketchfab, or listing objects. Respond with a single valid JSON object containing:
            - "action": (add, addMultiple, manipulate, color, select, search, list)
            - "type": (shape type like Sphere)
            - "actionType" : (action type like move, rotate, scale or color)
            - "value": (e.g., {position:{x:1,y:0,z:0}}, {color:"red"}, search term, or array of objects for addMultiple)
            - optional "targetId": (object ID for manipulation/select/color)
            - optional "name": (name for selection or manipulation, e.g., "car" for GLTF models, "cylinder" for shapes)
            Examples:
            - Add: {"action":"add","type":"SphereGeometry","value":{"position":{x:1,y:0,z:0}}}.
              - Adhere to the format of the output required for Add command. 
              - You should generate a json object with action, type and value properties, including sub properties such as position for value, which should have random numbers for x, y and z.
            - Add multiple: {"action":"addMultiple","value":[{"type":"SphereGeometry","position":{x:1,y:0,z:0}},{"type":"BoxGeometry","position":{x:5,y:0,z:0}}]}
              - Add two cones: {"action":"addMultiple", "value":[{"type":"ConeGeometry","position":{x:1,y:0,z:0}},{"type":"ConeGeometry","position":{x:5,y:0,z:0}}]}
            - Move cylinder to x:-5 : {"action":"manipulate","actionType":"move","name":"cylinder","value":{x:-5, y:[left unchanged],z:[left unchanged]}}
            - Select by name: {"action":"select","name":"car"}
            - Search: {"action":"search","value":"car"}
            - List: {"action":"list"}
            Adhere to the response illustrated in the examples.
            If ambiguous (e.g., "move the cylinder" with multiple cylinders or "select the car" with multiple GLTF models), return {"feedback":"Multiple objects found for [type/name], please specify ID or unique name"}. 
            If object in scene state is populated, you should consider relative positioning of all the objects in the scene state and the user's prompt before generating a response. If necessary, you should use appropriate formulas to calculate the position of new object using the positions of objects in scene state. For example, calculating the location of a new object between two objects to add the new object.
            Ensure the response is a single valid JSON object with no extra text. Do accomodate synonyms for actions such as insert for add. Understand that '[action] a sphere' is grammatically correct.
              `,
            },
            {
              role: 'user',
              content: llmInput,
            },
          ],
          format: 'json', // Enforce JSON response
          stream: false, // Disable streaming for single JSON response
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Complete LLM response:', response.data);

      const result = JSON.parse(response.data.message.content);
      const { action, type, value, targetId, name, feedback, actionType } = result;
      
      if (feedback) {
        setLlmFeedback(feedback);
        return;
      }

      switch (action) {
        case 'add':
          if (shapeOptions.includes(type)) {
            setObjects((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                type,
                position: value && value.position &&
                          typeof value.position.x === 'number' &&
                          typeof value.position.y === 'number' &&
                          typeof value.position.z === 'number'
                            ? [value.position.x, value.position.y, value.position.z]
                            : [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                name: type,
                color: value?.color || '#f5f5dc',
              },
            ]);
            setLlmFeedback(`Added ${type}`);
          } else {
            setLlmFeedback(`Invalid shape: ${type}. Available: ${shapeOptions.join(', ')}`);
          }
          break;
        case 'addMultiple':
          if (Array.isArray(value) && value.every((item) => shapeOptions.includes(item.type))) {
            setObjects((prev) => [
              ...prev,
              ...value.map((item) => ({
                id: Date.now().toString() + Math.random(),
                type: item.type,
                position: item.position !== null ? [item.position.x, item.position.y, item.position.z] : [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 3 - 1],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                name: item.type,
              })),
            ]);
            setLlmFeedback(`Added ${value.length} objects`);
          } else {
            setLlmFeedback(`Invalid types in addMultiple. Available: ${shapeOptions.join(', ')}`);
          }
          break;  
        case 'manipulate':
          let targetObj;
          if (targetId) {
            targetObj = objects.find((obj) => obj.id === targetId);
          } else if (name) {
          const matchingObjects = objects.filter((obj) => obj.name.toLowerCase() === name.toLowerCase());
            if (matchingObjects.length > 1) {
              setLlmFeedback(`Multiple objects found for ${name}, please specify ID`);
              return;
            }
            console.log("Matching objects ", matchingObjects);
            targetObj = matchingObjects[0];
          } else if (selectedId) {
            targetObj = objects.find((obj) => obj.id === selectedId);
          }
            console.log("Target obj ", targetObj)
          if (!targetObj) {
            setLlmFeedback('No object selected for manipulation.');
            return;
          }

          if (['move', 'rotate', 'scale', 'delete'].includes(actionType)) {
            if (actionType === 'delete') {
              deleteObject(targetObj.id);
              setLlmFeedback(`Deleted object ${targetObj.id}`);
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
                  const current = [...obj[prop]]; // Create new array to avoid immutability issues
                  const newValue = value
                    ? [
                        value.x !== undefined ? current[0] + value.x : current[0],
                        value.y !== undefined ? current[1] + value.y : current[1],
                        value.z !== undefined ? current[2] + value.z : current[2],
                      ]
                    : [
                        actionType === 'move' ? current[0] + 5 : current[0],
                        actionType === 'rotate' ? current[1] + 10 : current[1],
                        actionType === 'scale' ? current[2] * 2 : current[2],
                      ];
                  return {
                    ...obj,
                    [prop]: newValue,
                  };
                })
              );
              setLlmFeedback(`Performed ${actionType} on object ${targetObj.name} (ID: ${targetObj.id})`);
            }
          } else {
            setLlmFeedback('Invalid action: ' + actionType);
          }
        break;
        case 'select':
          let selectObj;
          if (targetId) {
              selectObj = objects.find((obj) => obj.id === targetId);
            } else if (name) {
              const matchingObjects = objects.filter((obj) => obj.name.toLowerCase() === name.toLowerCase());
              if (matchingObjects.length > 1) {
                setLlmFeedback(`Multiple objects found for ${name}, please specify ID`);
                return;
              }
              selectObj = matchingObjects[0];
            }
          if (selectObj) {
            setSelectedId(selectObj.id);
            setLlmFeedback(`Selected object (ID: ${selectObj.id})`);
          } else {
            setLlmFeedback(`Object not found: ${targetId || name}`);
          }
          break;
        case 'search':
         try {
          setLlmTriggeredSearch(true); // Add this state to track LLM search
          await handleSketchfabSearch(value, true);
        } catch (err) {
          setLlmFeedback('Error during Sketchfab search: ' + err.message);
          setLlmTriggeredSearch(false);
        }
        break;
        case 'list':
          if (objects.length === 0) {
            setLlmFeedback('No objects in the scene.');
          } else {
            setLlmFeedback(
              'Objects in scene: ' +
                objects
                  .map((obj) => `${obj.name || obj.type.replace('Geometry', '')} (ID: ${obj.id})`)
                  .join(', ')
            );
          }
          break;
        default:
          setLlmFeedback('Unknown command: ' + action);
      }
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
