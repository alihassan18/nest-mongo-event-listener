import fs from 'fs';
import path from 'path';
import { Schema, model } from 'mongoose';

const abiPath = path.join(__dirname, 'path_to_your_abi.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

const generateSchemas = (abi: any) => {
  abi.forEach((item: any) => {
    if (item.type === 'event') {
      const schemaDefinition: any = {};
      item.inputs.forEach((input: any) => {
        schemaDefinition[input.name] = { type: String, required: true }; // Adjust types as needed
      });
      const schema = new Schema(schemaDefinition);
      const modelName = `${item.name}Event`;
      model(modelName, schema);
      console.log(`Generated schema for event: ${item.name}`);
    }
  });
};

generateSchemas(abi);
