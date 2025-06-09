import * as fs from 'fs';
import { createTestContext, runCLICommand } from './setup';

describe('RudderTyper CLI E2E Tests', () => {
  let testContext: { testDir: string; cleanup: () => Promise<void> };

  beforeEach(async () => {
    testContext = await createTestContext();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  test('should generate TypeScript client from tracking plan', async () => {
    // Create a mock tracking plan
    const trackingPlan = {
      createdAt: new Date().toISOString(),
      creationType: 'Data catalog',
      id: 'test-tracking-plan-id',
      name: 'Test Tracking Plan',
      rules: {
        events: [
          {
            description: 'Triggered when a user completes an order',
            eventType: 'track',
            name: 'Order Completed',
            rules: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              description: 'Triggered when a user completes an order',
              properties: {
                properties: {
                  additionalProperties: false,
                  properties: {
                    orderId: {
                      type: 'string',
                      description: 'Unique identifier for the order',
                    },
                    total: {
                      type: 'number',
                      description: 'Total amount of the order',
                    },
                  },
                  required: ['orderId', 'total'],
                  type: 'object',
                },
              },
              type: 'object',
            },
          },
        ],
      },
      updatedAt: new Date().toISOString(),
      version: 1,
      workspaceId: 'test-workspace-id',
    };

    await fs.promises.writeFile(
      `${testContext.testDir}/plan.json`,
      JSON.stringify(trackingPlan, null, 2),
    );

    // Create ruddertyper.yml configuration
    const config = `
client:
  sdk: analytics.js
  language: typescript
  scriptTarget: 'ES5'
  moduleTarget: 'ESNext'

trackingPlans:
  - path: ${testContext.testDir}
    APIVersion: v2
    workspaceSlug: test-workspace
    id: test-tracking-plan-id
    version: 1
`;

    await fs.promises.writeFile(`${testContext.testDir}/ruddertyper.yml`, config);

    // Run the CLI command
    const { stdout, stderr } = await runCLICommand(
      `build --config ${testContext.testDir}/ruddertyper.yml`,
      testContext.testDir,
    );

    // Log output for debugging
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    // Validate output
    expect(stderr).toBe('');
    expect(stdout).toContain('Generated client');

    // Verify generated files
    const outputFiles = await fs.promises.readdir(testContext.testDir);
    expect(outputFiles).toContain('index.ts');
    expect(outputFiles).toContain('plan.json');
  });

  test('should handle invalid tracking plan gracefully', async () => {
    // Create an invalid tracking plan
    const invalidPlan = {
      name: 'Invalid Plan',
      rules: {
        events: [
          {
            name: 'Invalid Event',
            // Missing required fields
          },
        ],
      },
    };

    await fs.promises.writeFile(`${testContext.testDir}/plan.json`, JSON.stringify(invalidPlan));

    // Create ruddertyper.yml configuration
    const config = `
client:
  sdk: analytics.js
  language: typescript

trackingPlans:
  - path: ${testContext.testDir}
    APIVersion: v2
    workspaceSlug: test-workspace
    id: test-tracking-plan-id
    version: 1
`;

    await fs.promises.writeFile(`${testContext.testDir}/ruddertyper.yml`, config);

    // Run the CLI command
    const { stdout, stderr } = await runCLICommand(
      `build --config ${testContext.testDir}/ruddertyper.yml`,
      testContext.testDir,
    );

    // Log output for debugging
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    // Validate error output
    expect(stderr).not.toBe('');
    expect(stdout).not.toContain('Generated client');
  });
});
