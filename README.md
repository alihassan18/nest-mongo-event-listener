
## Introduction
This script automates the process of integrating Ethereum contract events into a NestJS application by generating Mongoose schemas, NestJS services, and modules based on contract ABIs. It reads ABI files from a specified directory, extracts event definitions, and generates corresponding Mongoose schema files, NestJS service files, and NestJS module files. The service files include logic for listening to real-time events and synchronizing past events from the Ethereum blockchain. The module files register the generated schemas with Mongoose and set up the necessary providers. This automation ensures consistent and error-free integration of Ethereum events into the application, significantly reducing manual coding efforts and streamlining the development workflow.

## Installation

```bash
$ npm install
```


## Listener Setup

```bash
# Step 1
# Update the abis directory and add your contract abis into the directory.

# Step 2
# Run this command to generate nest js modules, services, and Mongodb schemas.
$ npm run generate

# Step 3
# The above command will generate the modules and relevant files in the generated directory, and import the modules in the main app module.

# Step 4
# Update config.ts file and then the setup will be completed.
```

## Example Directory Structure
```generated/
├── config.ts
└── ContractName/
    ├── ContractName.module.ts
    ├── ContractName.service.ts
    └── schemas/
        ├── EventName1Schema.ts
        ├── EventName2Schema.ts
        └── ...
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## License

Nest is [MIT licensed](LICENSE).
