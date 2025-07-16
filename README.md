# Web-based 3D Copilot

A React-based interactive 3D scene editor built on Three.js and react-three-fiber.  
Create, manipulate, and manage primitive shapes (boxes, spheres, cones, etc.) and import custom GLTF/GLB models from Sketchfab. You can also control the scene via natural language commands backed by an LLM.

---

## 🚀 Features

- **Shape Palette**  
  Add basic primitives: Box, Sphere, Cone, Cylinder, Torus, Tetrahedron, Octahedron, Dodecahedron.

- **GLTF/GLB Model Import**  
  Search downloadable models on Sketchfab (limits to top 12 liked models), import ZIP archives, auto‑extract meshes and textures.

- **Object Manipulation**  
  - **TransformControls**: Click-drag to translate/rotate/scale.  
  - **Manual Inputs**: Numerically edit position, rotation (radians), and scale.  
  - **Delete**: Remove selected objects, with proper URL revocation.

- **Raycasting & Selection**  
  - Click to select/deselect objects.  
  - Highlights selected object with a wireframe material.

- **Natural‑Language Control**  
  - Enter commands like “add sphere at x:1 y:2 z:0”, “move box by 1 on X”, “delete car”, “search car”, or simply “list”.  
  - Backed by a local LLM API (e.g. Llama3) on `http://localhost:11434/api/chat`.

- **Orbit & Sky**  
  - `OrbitControls` for free camera navigation.  
  - Sky shader with adjustable sun position and turbidity.

---

## 🛠️ Tech Stack

- **React**  
- **Three.js** via **react-three-fiber**  
- **@react-three/drei** (Sky, TransformControls, OrbitControls)  
- **GLTFLoader**, **JSZip**  
- **Axios** for LLM API  
---

## 🔧 Installation

1. **Clone & install**  

   git clone https://github.com/jeet1912/three-scene-react.git
   cd three-scene-react
   npm install

2. **Set your Sketchfab API token**

    SKETCHFAB_API_TOKEN = "######"

3. **Run the dev server**

    npm run dev 

4. **Local Development server**

    open http://localhost:5174/ on your browser.