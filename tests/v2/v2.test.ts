import { example } from './fixtures/plan';
import { platforms } from '../../src/generators/v2/platforms/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('v2 generator tests', () => {
  it('should generate a valid v2 schema', async () => {
    const files = await platforms.typescript.render(example);
    // Write files to ~/generated-out
    const outDir = path.join(os.homedir(), 'generated-out');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(outDir, filename), content);
    }

    // expect(files).toEqual({
    //   'index.ts': 'FOOBAR',
    // });
  });
});
