import * as fs from 'fs';
import * as path from 'path';
import * as mongoose from 'mongoose';
// import { writeFileSync } from 'fs';
// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { DynamicModule } from '@nestjs/common/interfaces/modules/dynamic-module.interface';

// Define paths
console.log(__dirname, '__dirname');

const abisDir = path.join(__dirname, '..', 'abis');
const generatedDir = path.join(__dirname, '..', 'generated');

// Ensure the generated directory exists
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir);
}

const schemaDefinitions: { [key: string]: mongoose.Schema } = {};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const generateSchema = (event: any) => {
  const schemaFields: any = {};
  event.inputs.forEach((input: any) => {
    schemaFields[input.name] = { type: String, required: true }; // Ensure correct schema field definition
  });
  return new mongoose.Schema(schemaFields);
};

const schemaTemplate = (event: string, fields: any) => `
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ${event}Document = HydratedDocument<${event}>;

@Schema()
export class ${event} {
${fields}
}

export const ${event}Schema = SchemaFactory.createForClass(${event});
`;

const generateSchemaFields = (event: any) => {
  const fields = event.inputs
    .map((input: any) => `  @Prop()\n  ${input.name}: string;\n`)
    .join('\n');
  return fields + `\n  @Prop()\n  transactionHash: string;\n`;
};

const generateService = (contractName: string, events: any[]) => {
  const eventListeners = events
    .map(
      (event) => `
    this.contract.on('${event.name}', async (...args) => {
      await this.handleEvent('${event.name}', args, this.${event.name.toLowerCase()}Model);
    });
  `,
    )
    .join('\n');

  const models = events
    .map(
      (event) => `
  @InjectModel(${event.name}.name) private readonly ${event.name.toLowerCase()}Model: Model<${event.name}Document>,`,
    )
    .join('');

  const modelsImports = events
    .map(
      (event) => `
  import {
  ${event.name},
  ${event.name}Document,
} from './schemas/${event.name}Schema';`,
    )
    .join('');

  const serviceCode = `
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import abi from '../../abis/${contractName.toLowerCase()}.json';
import { config } from '../config';
${modelsImports}

@Injectable()
export class ${contractName}Service implements OnModuleInit {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;

  constructor(${models}
  ) {
    this.provider = new ethers.providers.InfuraProvider(config.network, config.infuraProjectId);
    this.contract = new ethers.Contract(config.${contractName}Address, abi, this.provider);
  }

  async onModuleInit() {
    await this.syncPastEvents()
    this.listenToEvents();
  }

  listenToEvents() {${eventListeners}
    console.log('Listening to events...');
  }

  async syncPastEvents() {
    const currentBlock = await this.provider.getBlockNumber();
    const batchSize = 5000;
    let fromBlock = config.fromBlock; // Replace with your starting block number


    while (fromBlock < currentBlock) {
      const toBlock = Math.min(fromBlock + batchSize, currentBlock);

      for (const event of ${JSON.stringify(events.map((item) => ({ name: item.name })))}) {
        const filter = this.contract.filters[event.name]();
        const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

        for (const eventInstance of events) {
          await this.handleEvent(event.name, [eventInstance], this[event.name.toLowerCase() + 'Model']);
        }
      }

      fromBlock += batchSize;
    }
  }


  private async handleEvent(eventName: string, args: any[], model: Model<any>) {
    const eventObj = this.contract.interface.parseLog({ topics: args[args.length - 1].topics, data: args[args.length - 1].data });
    const eventData = this.constructEventData(eventName, eventObj.args, args[args.length - 1].transactionHash);
    await model.updateOne(
      { transactionHash: eventData.transactionHash },
      { $set: eventData },
      { upsert: true },
    );
    console.log(\`Event \${eventName} saved:\`, eventData);
  }

  private constructEventData(eventName: string, eventArgs: any, transactionHash:string) {
    const eventData: any = { transactionHash };
    for (const key in eventArgs) {
      if (eventArgs.hasOwnProperty(key) && isNaN(Number(key))) {
        eventData[key] = eventArgs[key].toString();
      }
    }
    return eventData;
  }
}
`;

  return serviceCode;
};

const generateModule = (contractName: string, events: any[]) => {
  const imports = events
    .map(
      (event) => `
    { name: ${event.name}.name, schema: ${event.name}Schema },`,
    )
    .join('');

  const schemaImports = events
    .map(
      (event) => `
      import { ${event.name}, ${event.name}Schema } from './schemas/${event.name}Schema';
      `,
    )
    .join('');

  const moduleCode = `
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ${contractName}Service } from './${contractName.toLowerCase()}.service';
${schemaImports}

const models = [${imports}
];

@Module({
  imports: [MongooseModule.forFeature(models)],
  exports: [MongooseModule.forFeature(models)],
  providers: [${contractName}Service],
})
export class ${contractName}Module {}
`;

  return moduleCode;
};

const config = {
  infuraProjectId: 'YOUR_INFURA_PROJECT_ID',
  fromBlock: 0,
  network: 'ropston',
};

fs.readdirSync(abisDir).forEach((file) => {
  if (path.extname(file) === '.json') {
    const abi = JSON.parse(fs.readFileSync(path.join(abisDir, file), 'utf-8'));
    const contractName = capitalize(path.basename(file, '.json'));
    const events = abi.filter((item: any) => item.type === 'event');

    // Create a directory for the ABI
    const abiDir = path.join(generatedDir, contractName);
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir);
    }

    // Create a directory for the schemas
    const schemaDir = path.join(abiDir, 'schemas');
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir);
    }

    events.forEach((event: any) => {
      schemaDefinitions[event.name] = generateSchema(event);

      // Write the schema file
      const schemaFields = generateSchemaFields(event);
      const schemaCode = schemaTemplate(`${event.name}`, schemaFields);
      fs.writeFileSync(
        path.join(schemaDir, `${event.name}Schema.ts`),
        schemaCode,
      );
    });

    const serviceCode = generateService(contractName, events);
    const moduleCode = generateModule(contractName, events);

    fs.writeFileSync(
      path.join(abiDir, `${contractName.toLowerCase()}.service.ts`),
      serviceCode,
    );
    fs.writeFileSync(
      path.join(abiDir, `${contractName.toLowerCase()}.module.ts`),
      moduleCode,
    );

    config[`${contractName}Address`] = `YOUR_${contractName}_CONTRACT_ADDRESS`;

    const configContent = `
export const config = ${JSON.stringify(config, null, 2)};
`;

    fs.writeFileSync(path.join(generatedDir, 'config.ts'), configContent);
  }
});
