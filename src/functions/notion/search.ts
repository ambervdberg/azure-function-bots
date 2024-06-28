import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getNotionApiKey } from "./helper";
const { Client } = require('@notionhq/client');

/**
 * Searches for content in Notion.
 * @param request 
 * @param context 
 * @returns 
 */
export async function search(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const workspace = request.query.get('workspace');

  const query = request.query.get('query');

  const raw = request.query.has('raw');

  const apiKey = getNotionApiKey(workspace);

  if (!apiKey) {
    return { status: 401, body: 'Unauthorized: API key not found' };
  }

  if (!query) {
    return { status: 400, body: 'Bad Request: Query parameter is required' };
  }

  const notion = new Client({ auth: apiKey });

  const response = await notion.search({
    query: query,
    sort: {
      direction: 'ascending',
      timestamp: 'last_edited_time'
    },
  });

  if (raw) {
    return { status: 200, jsonBody: response };
  }

  return { status: 200, jsonBody: response };
};

app.setup({ enableHttpStream: true });

app.http('search', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/search',
  handler: search
});