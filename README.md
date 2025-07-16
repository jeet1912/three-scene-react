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
  - Enter commands like “add sphere at x:1 y:2 z:0”, “move box by 1 on X”, “delete car”, “search car”, or simply “list all objects”.  
  - Backed by a local LLM API (e.g. Llama3) on `http://localhost:11434/api/chat` through Ollama.

- **Orbit & Sky**  
  - `OrbitControls` for free camera navigation.  
  - Sky shader with adjustable sun position and turbidity.

---

## 🛠️ Tech Stack

- **Vite**
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

---

## 🧭 Usage

1. **Add Shapes**  
   Click any shape in the right‑hand palette to spawn it at a random position.

2. **Select & Manipulate**  
   - **Click** any object in the 3D canvas to select.  
   - Use the **TransformControls** gizmo (mode: translate/rotate/scale).  
     - Press **`m`** to switch to translate, **`r`** for rotate, **`s`** for scale.  
   - Or use the numeric inputs under **Object Manipulation** to type exact values, then click **Apply**.

3. **Sketchfab Models**  
   - Type a keyword in the **Custom Model** search bar.  
   - Click **Search on Sketchfab** → choose a thumbnail → imports and normalizes the model.

4. **Natural‑Language Commands**  
   - In the LLM input box, try commands like:  
     - `add sphere at x:1 y:2 z:0`  
     - `move the box by x:0.5`  
     - `scale the tetrahedron`  
     - `delete the car`  
     - `search dragon model`  
     - `list`  
   - Click **Implement using an LLM** or press enter. Feedback appears below.

5. **Delete**  
   - Hit **Delete** button in the manipulation panel (when an object is selected).  
   - Or use LLM command: `delete <name or ID>`.
