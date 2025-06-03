import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GenerationContext {
  workingDir: string;
  inputDir: string;
  outputDir: string;
  cleanup: () => Promise<void>;
}

async function setupGenerationContext(): Promise<GenerationContext> {
  const timestamp = Date.now();
  const workingDir = path.join(process.cwd(), 'tests/e2e/temp', `test-run-${timestamp}`);
  const inputDir = path.join(workingDir, 'input');
  const outputDir = path.join(workingDir, 'output');

  // Create directory structure
  await fs.promises.mkdir(workingDir, { recursive: true });
  await fs.promises.mkdir(inputDir);
  await fs.promises.mkdir(outputDir);

  // Copy plan.json to output directory as that's where rudder-typer expects it
  await fs.promises
    .copyFile(path.join(inputDir, 'plan.json'), path.join(outputDir, 'plan.json'))
    .catch(() => {}); // Ignore if file doesn't exist yet

  return {
    workingDir,
    inputDir,
    outputDir,
    cleanup: async () => {
      await fs.promises.rm(workingDir, { recursive: true, force: true });
    },
  };
}

async function setupTrackingPlan(inputDir: string): Promise<void> {
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
    path.join(inputDir, 'plan.json'),
    JSON.stringify(trackingPlan, null, 2),
  );
}

async function setupConfig(inputDir: string, outputDir: string): Promise<void> {
  const config = `
client:
  sdk: analytics.js
  language: typescript
  scriptTarget: 'ES5'
  moduleTarget: 'ESNext'

trackingPlans:
  - path: ${outputDir}
    APIVersion: v2
    workspaceSlug: test-workspace
    id: test-tracking-plan-id
    version: 1
`;

  await fs.promises.writeFile(path.join(inputDir, 'ruddertyper.yml'), config);
}

async function generateCode(context: GenerationContext): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  try {
    // First ensure plan.json is in the output directory
    await fs.promises.copyFile(
      path.join(context.inputDir, 'plan.json'),
      path.join(context.outputDir, 'plan.json'),
    );

    // Use the local CLI directly instead of npx
    const cliPath = path.join(process.cwd(), 'src/cli/index.tsx');
    const result = await execAsync(
      `TS_NODE_FILES=true tsx ${cliPath} build --config ${path.join(context.inputDir, 'ruddertyper.yml')}`,
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'development',
        },
      },
    );

    return {
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error: any) {
    return {
      exitCode: error.code || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    };
  }
}

describe('Code Generation Workflow', () => {
  let context: GenerationContext;

  beforeEach(async () => {
    context = await setupGenerationContext();
    await setupTrackingPlan(context.inputDir);
    await setupConfig(context.inputDir, context.outputDir);
  });

  afterEach(async () => {
    await context.cleanup();
  });

  test('should generate code from tracking plan', async () => {
    const result = await generateCode(context);

    // Log output for debugging
    console.log('stdout:', result.stdout);
    console.log('stderr:', result.stderr);

    // Check if the command executed successfully
    expect(result.exitCode).toBe(0);

    // Check if any files were generated
    const outputFiles = await fs.promises.readdir(context.outputDir);
    expect(outputFiles.length).toBeGreaterThan(0);

    // Log generated files for debugging
    console.log('Generated files:', outputFiles);
  });
});
