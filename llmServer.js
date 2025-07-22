import express from 'express';
import OpenAI from 'openai';
import keys from './apiToken.js';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const client = new OpenAI({
  apiKey: keys['openAI'],
});

app.post('/api/llm-command', async (req, res) => {
  const { llmInput, sceneState } = req.body;

  try {
    const response = await client.chat.completions.create({
      model: 'o4-mini',
      messages: [
        {
          role: 'system',
          content: `
            You are an assistant controlling a 3D scene built with Three.js. The current scene state is: ${JSON.stringify(sceneState)}.
            Parse the user's command to perform actions like adding shapes, adding multiple shapes, manipulating objects (move, rotate, scale, delete), 
            changing colors, selecting objects by ID or name, searching Sketchfab, listing objects, clearing all objects, or deleting multiple objects. 
            When the input contains multiple objects or actions (e.g., 'add a sphere, cube and a car'), split the command based on conjunctions like 
            'and' and return an array of valid JSON objects, each representing a single action. Ensure every requested object or action is included in the response.
            Do NOT wrap the response in an "actions" property; return the array or object directly as valid JSON.
            Each JSON object should contain:
            - "action": (add, addMultiple, manipulate, color, select, search, list, clear, deleteMultiple)
            - "type": (shape type like SphereGeometry, required for add/addMultiple)
            - "actionType": (action type like move, rotate, scale, or delete for manipulate)
            - "value": (e.g., {position:{x:1,y:0,z:0}}, {color:"red"}, search term, or array of objects for addMultiple)
            - optional "targetId": (object ID for manipulation/select/color, used only when explicitly specified)
            - optional "name": (name for selection, manipulation, or deletion, e.g., "car" for GLTF models, "cylinder" for shapes)
            - optional "targetIds": (array of object IDs for deleteMultiple, used only when IDs are explicitly provided)
            Examples:
            For 'add' commands:
            - Check if the object type is in the scene state's availableShapes (e.g., ${JSON.stringify(sceneState.availableShapes)}).
            - If the type is in availableShapes (e.g., "sphere" → "SphereGeometry"), return an "add" action with the corresponding type and a "value" containing a position (x, y, z).
            - If the type is NOT in availableShapes (e.g., "car", "tree", "battery"), return a "search" action with the object type as the "value" (e.g., {"action":"search","value":"tree"}).
            - Add: {"action":"add","type":"SphereGeometry","value":{"position":{"x":1,"y":0,"z":0}}}
                - "Add a tree" should return {"action":"search","value":"tree"}. "Add a battery" should also return a search action {"action":"search","value":"battery"}.
            - Add multiple: [{"action":"add","type":"SphereGeometry","value":{"position":{"x":1,"y":0,"z":0}}}, {"action":"add","type":"BoxGeometry","value":{"position":{"x":5,"y":0,"z":0}}}]
            - Move cylinder to x:-5: {"action":"manipulate","actionType":"move","name":"cylinder","value":{"x":-5}}
            - Rotate leftmost object by 45 degrees: Get the leftmost object {"action":"manipulate","actionType":"rotate","name":"[name of object with smallest x-coordinate]","value":{"y":unchanged}}.
            - Select by name: {"action":"select","name":"car"}
            - Search: {"action":"search","value":"car"}
            - List: {"action":"list"}
            - Clear all objects: {"action":"clear"}
            - Delete all cylinders: {"action":"deleteMultiple","name":"CylinderGeometry"}
            - Delete sphere and cube: [
                {"action":"deleteMultiple","name":"SphereGeometry"},
                {"action":"deleteMultiple","name":"BoxGeometry"}
            ]
            - Add sphere, cube and search tree: [
                {"action":"add","type":"SphereGeometry","value":{"position":{"x":1,"y":0,"z":0}}},
                {"action":"add","type":"Cubeeometry","value":{"position":{"x":4,"y":0,"z":0}}},
                {"action":"search","value":"tree"}
            ]
            Adhere to the response format illustrated in the examples. For 'add' commands, include a valid position object with x, y, z coordinates (use random values in the range [-2, 2] for x, y and [-1, 3] for z if not specified).
            Prefer using object names (e.g., "cylinder", "sphere", "car") over IDs for actions like manipulate, select, and deleteMultiple, as names are more user-friendly. Only use "targetId" or "targetIds" when the user explicitly provides IDs (e.g., "delete object id1").
            If ambiguous (e.g., "delete the cylinder" with multiple cylinders), return {"feedback":"Multiple objects found for [name], please specify ID or select a specific object"}.
            For commands involving the "leftmost" object, identify the object with the smallest x-coordinate position in the scene state and use its name in the response (e.g., for "rotate the leftmost object by 45 degrees", return a manipulate action with actionType "rotate" and the name of the leftmost object).
            For "deleteMultiple", use the provided name to delete all objects with that name (e.g., "delete all cylinders" deletes all objects with name "CylinderGeometry").
            If scene state is populated, consider relative positioning of all objects and the user's prompt to calculate new object positions (e.g., place a new object between two existing objects if specified).
            Ensure the response is either a single valid JSON object or an array of valid JSON objects with no extra text. Accommodate synonyms like 'insert' for 'add', 'removeAll' for 'clear'. Understand that '[action] a sphere' is grammatically correct.
          `,
        },
        {
          role: 'user',
          content: llmInput,
        },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse response, handling potential "actions" property
    const parsedResponse = JSON.parse(response.choices[0].message.content);
    const results = Array.isArray(parsedResponse)
      ? parsedResponse
      : parsedResponse.actions && Array.isArray(parsedResponse.actions)
      ? parsedResponse.actions
      : [parsedResponse]; // Wrap single object in array for consistent processing
 
    res.json({ results });
  } catch (err) {
    console.error('Open AI error:', err);
    res.status(500).json({ error: 'Error processing command: ' + err.message });
  }
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));