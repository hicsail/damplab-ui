# Data Translation Component

This component provides functionality for uploading, editing, and managing Abbott blood testing data files for eLabs bulk upload.

## Backend Integration

The component now integrates with a GraphQL backend for template management while maintaining local storage as a fallback.

### Template Storage Architecture

1. **Primary**: GraphQL Backend
   - Uses Apollo Client for queries and mutations
   - Stores templates in MongoDB via NestJS backend
   - Provides real-time sync across devices/sessions

2. **Fallback**: Local Storage
   - Automatically falls back if backend is unavailable
   - Shows warning indicators when using local storage
   - Seamlessly switches back to backend when available

### GraphQL Operations

#### Queries
- `GET_TEMPLATES` - Fetch all templates
- `GET_TEMPLATE_BY_ID` - Fetch template by ID
- `GET_TEMPLATE_BY_NAME` - Fetch template by name

#### Mutations
- `CREATE_TEMPLATE` - Create new template
- `UPDATE_TEMPLATE` - Update existing template
- `DELETE_TEMPLATE` - Delete template by ID
- `DELETE_TEMPLATE_BY_NAME` - Delete template by name

### Component Structure

```
data-translation/
├── DataTranslation.tsx           # Main component
├── FileUploadSection.tsx         # File upload UI
├── DataGridSection.tsx          # Data grid with custom headers
├── CopyDataDialog.tsx           # Copy functionality
├── TemplateDialogs.tsx          # Template save/load dialogs
├── ColumnManagerDialog.tsx      # Column management
├── types.ts                     # TypeScript definitions
├── utils.ts                     # Utility functions
└── hooks/
    ├── useFileUpload.ts         # File processing logic
    ├── useDataManager.ts        # Data manipulation
    ├── useTemplateManager.ts    # Local-only template manager
    └── useTemplateManagerWithBackend.ts # Backend + fallback manager
```

### Usage

The component automatically detects backend availability and shows appropriate status indicators:

- ✅ **Backend Connected**: Templates stored in database
- ⚠️ **Local Storage**: Templates stored locally (backend unavailable)
- 🔄 **Loading**: Fetching templates from backend

### Backend Schema

The backend uses this GraphQL schema for templates:

```graphql
type Template {
  id: ID!
  name: String!
  description: String
  createdAt: Date!
  columnMapping: [ColumnMapping!]!
}

type ColumnMapping {
  field: String!
  headerName: String!
  type: String!
  width: Int!
  order: Int!
}
```

### Error Handling

- Network errors automatically trigger local storage fallback
- User receives clear feedback about storage mode
- Failed operations show appropriate error messages
- Backend retry functionality available

### Development

To test the component:

1. With backend: Normal operation, templates sync to database
2. Without backend: Component falls back to localStorage automatically
3. Backend recovery: Templates sync back when backend becomes available

### Environment Variables

- `VITE_BACKEND`: GraphQL endpoint URL for backend integration
