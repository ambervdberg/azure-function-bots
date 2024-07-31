import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Client } from '@notionhq/client';

import { NotionService } from './notion.service';
import { getNotionApiKey, mapDBResponse } from './notionUtils';

// Constants
const UNAUTHORIZED = 'Unauthorized: API key not found';
const BAD_REQUEST_ID = 'Bad Request: id parameter is required';
const NOT_FOUND = 'Not Found: Database not found';
const INTERNAL_SERVER_ERROR = 'Internal Server Error';

/**
 * Retrieves the content of a Notion database.
 * @param request - The HTTP request
 * @param context - The invocation context
 * @returns The HTTP response
 */
export async function getDatabase(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http database processed request for url "${request.url}"`);

  const workspace: string | null = request.query.get('workspace');
  const id: string | null = request.query.get('id');
  const raw: boolean = request.query.has('raw');
  const apiKey: string | undefined = getNotionApiKey(workspace);

  if (!apiKey) {
    return { status: 401, body: UNAUTHORIZED };
  }

  if (!id) {
    return { status: 400, body: BAD_REQUEST_ID };
  }

  const notion = new Client({ auth: apiKey });

  try {
    const response = await NotionService.fetchDatabaseContent(notion, id);

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    if (response.results.length === 0) {
      return { status: 404, body: NOT_FOUND };
    }

    try {
      const content = await mapDBResponse(response, notion);
      return { status: 200, body: content };
    } catch (error) {
      context.error(`Error mapping Notion content: ${error.message}`);
      return { status: 500, body: INTERNAL_SERVER_ERROR };
    }
  } catch (error) {
    context.error(`Error fetching Notion database: ${error.message}`);
    return { status: 500, body: INTERNAL_SERVER_ERROR };
  }
}

app.setup({ enableHttpStream: true });

app.http('database', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'notion/database',
  handler: getDatabase
});
