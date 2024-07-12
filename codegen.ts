import { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'https://damplab-backend-damp-lab-canvas-242df1.apps.shift.nerc.mghpcc.org/graphql',
  documents: ['src/**/*.tsx'],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/gql/': {
      preset: 'client'
    }
  }
}

export default config