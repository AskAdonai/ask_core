const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, 'src/admin/adminRouter.ts');
let content = fs.readFileSync(routerPath, 'utf8');

const updated = content.replace(/\/\/ (GET|POST|PUT|DELETE) (.*?)\nadminRouter\.(get|post|put|delete)\('([^']+)',/g, (match, method, commentDesc, lowerMethod, routePath) => {
  // Convert /quiz/:week to /quiz/{week} for Swagger
  const swaggerPath = routePath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

  // Extract path params
  const pathParams = [...routePath.matchAll(/:([a-zA-Z0-9_]+)/g)].map(m => m[1]);
  let paramsBlock = '';
  if (pathParams.length > 0) {
    paramsBlock = `\n *     parameters:` + pathParams.map(p => `
 *       - in: path
 *         name: ${p}
 *         required: true
 *         schema:
 *           type: string`).join('');
  }

  // Add simple request body for POST/PUT
  let requestBodyBlock = '';
  if (method === 'POST' || method === 'PUT') {
    requestBodyBlock = `
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           example: {}`;
  }

  const doc = `/**
 * @swagger
 * ${swaggerPath}:
 *   ${lowerMethod}:
 *     summary: ${commentDesc.split('-').pop().trim()}
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []${paramsBlock}${requestBodyBlock}
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
`;
  return doc + match;
});

fs.writeFileSync(routerPath, updated);
console.log('Swagger comments injected!');
