import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

export interface TestContext {
  testDir: string;
  cleanup: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const testDir = path.join(process.cwd(), 'tests/e2e/temp', Date.now().toString());
  await mkdirAsync(testDir, { recursive: true });

  return {
    testDir,
    cleanup: async () => {
      await execAsync(`rm -rf ${testDir}`);
    },
  };
}

export async function runCLICommand(
  command: string,
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(`npx rudder-typer ${command}`, { cwd });
    return result;
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    };
  }
}

export async function createMockTrackingPlan(testDir: string): Promise<void> {
  const mockPlan = {
    name: 'Test Tracking Plan',
    rules: {
      events: [
        {
          name: 'Order Completed',
          description: 'Triggered when a user completes an order',
          rules: {
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
          },
        },
      ],
    },
  };

  await writeFileAsync(path.join(testDir, 'plan.json'), JSON.stringify(mockPlan, null, 2));
}

export async function validateGeneratedClient(testDir: string): Promise<boolean> {
  try {
    const files = await fs.promises.readdir(testDir);
    const hasTypescriptClient = files.some((file) => file.endsWith('.ts'));
    const hasJavascriptClient = files.some((file) => file.endsWith('.js'));
    return hasTypescriptClient || hasJavascriptClient;
  } catch {
    // If we can't read the directory, assume no files were generated
    return false;
  }
}
