import { app } from '../src/server';

// Support both ES Modules and CommonJS serverless function handlers
export default app;
export { app };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
  module.exports.app = app;
}
