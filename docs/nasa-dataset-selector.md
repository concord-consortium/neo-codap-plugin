# NASA Dataset Selector Design Document

## Current Context
- The neo-codap-plugin currently has a basic interface for creating and displaying data in CODAP
- It uses React with TypeScript and integrates with the CODAP Plugin API
- The current interface lacks organization and doesn't follow the NASA Earth Observatory design pattern
- The dst-codap-plugin project has similar tab-based UI using Chakra that we can reference

## Requirements

### Functional Requirements
- Implement a tabbed interface with "Dataset" and "About" tabs using Chakra UI
- Create a dataset selector with radio buttons for:
  - Rainfall (default selected)
  - Carbon Monoxide
  - Nitrogen Dioxide
  - Vegetation Index
  - Land Surface Temperature [day]
  - Active Fires
- Maintain existing CODAP integration functionality within the Dataset tab
- Add "Clear Data" and "Get Data" buttons at the bottom of the interface

### Non-Functional Requirements
- Match the NASA Earth Observatory styling
- Maintain existing performance and responsiveness
- Keep the interface accessible with proper ARIA attributes
- Ensure the component is testable with Playwright

## Design Decisions

### 1. UI Component Library
Will implement using Chakra UI because:
- Already used successfully in dst-codap-plugin
- Provides accessible components out of the box
- Has built-in tab components that match the design
- Offers consistent styling system

### 2. Test-First Development
Will implement using Playwright tests first because:
- Ensures features work as expected from user perspective
- Provides regression protection
- Helps define component behavior clearly
- Matches project requirements

### 3. Component Structure
Will implement using nested components because:
- Separates concerns between tabs, dataset selector, and existing functionality
- Makes testing easier with isolated components
- Improves maintainability
- Follows React best practices

## Technical Design

### 1. Core Components
```typescript
// Main App Component
const App: React.FC = () => {
  return <TabContainer />;
};

// Tab Container Component
const TabContainer: React.FC = () => {
  return (
    <Tabs>
      <TabList>
        <Tab>Dataset</Tab>
        <Tab>About</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <DatasetTab />
        </TabPanel>
        <TabPanel>
          <AboutTab />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

// Dataset Selection Component
interface Dataset {
  id: string;
  label: string;
}

const DatasetSelector: React.FC = () => {
  const [selectedDataset, setSelectedDataset] = useState<string>("rainfall");
  // Implementation
};
```

### 2. Data Models
```typescript
// Dataset types
type DatasetType =
  | "rainfall"
  | "carbonMonoxide"
  | "nitrogenDioxide"
  | "vegetationIndex"
  | "landSurfaceTemperature"
  | "activeFires";

interface DatasetConfig {
  id: DatasetType;
  label: string;
  defaultSelected?: boolean;
}
```

### 3. Integration Points
- Maintains existing CODAP Plugin API integration
- Uses Chakra UI theming system
- Preserves current data handling functionality

## Implementation Plan

1. Phase 1: Test Setup and Basic Structure
   - Create Playwright test file for tab navigation
   - Create simple AboutTab component with "NASA Earth Observatory" text
   - Add Chakra UI dependencies
   - Create DatasetTab with the UI from App.tsx, and use it directly.
   - Implement basic tab structure using Chakra UI
   - Ensure all existing functionality works in new tab structure
   - Update the styling to match the [mockup design](mockup.png)

2. Phase 2: Dataset Selector Implementation
   - Create Playwright test for dataset selection
   - Create dataset selector component
   - Implement radio button group
   - Style to match NASA Earth Observatory design
   - Add tests for dataset selection behavior

3. Phase 3: Integration
   - Move existing functionality into Dataset tab
   - Add Clear/Get Data buttons
   - Ensure all tests pass
   - Verify CODAP integration still works

## Testing Strategy

### Playwright Tests
```typescript
test('should show Dataset tab by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Dataset' }))
    .toHaveAttribute('aria-selected', 'true');
});

test('should select Rainfall dataset by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('radio', { name: 'Rainfall' }))
    .toBeChecked();
});
```

### Component Tests
- Test tab navigation
- Test dataset selection
- Test button interactions
- Test CODAP integration points

## Dependencies

### Runtime Dependencies
- @chakra-ui/react
- @emotion/react
- @emotion/styled
- @concord-consortium/codap-plugin-api (existing)

### Development Dependencies
- @playwright/test
- typescript
- @types/react

## Security Considerations
- No new security concerns as this is UI only
- Will maintain existing CODAP security patterns

## Rollout Strategy
1. Implement and test locally
2. Review with team
3. Deploy to staging
4. Verify in CODAP environment
5. Deploy to production

## References
- NASA Earth Observatory interface design
- dst-codap-plugin tab implementation
- CODAP Plugin API documentation

## Code Standards
- Follow project's established code formatting rules:
  - Use double quotes for all strings
  - Use 2 spaces for indentation
  - Filenames should use kebab case
  - Follow semantic naming conventions from coding-style.md
  - Add TODO comments when needed using format: `// TODO[(Context)]: <Action> by/when <Deadline Condition>`

### App Component Restructuring
The current App.tsx will be reorganized as follows:
- Create new `components/tabs` directory for tab-related components
- Move existing App.tsx content into new `DatasetTab.tsx`:
  ```typescript
  // DatasetTab.tsx
  export const DatasetTab: React.FC = () => {
    // Move all existing state and handlers from App.tsx
    const [codapResponse, setCodapResponse] = useState<any>(undefined);
    const [listenerNotification, setListenerNotification] = useState<string>();
    const [dataContext, setDataContext] = useState<any>(null);

    // Move all existing handlers: handleOpenTable, handleCreateData, handleGetResponse

    return (
      <VStack spacing={4}>
        <DatasetSelector />
        {/* Existing App.tsx JSX moved here */}
        <div className="buttons">
          <button onClick={handleCreateData}>Create some data</button>
          {/* ... other existing buttons ... */}
        </div>
        {/* ... other existing UI elements ... */}
      </VStack>
    );
  };
  ```
