import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Client } from '@notionhq/client';

import { NotionService } from './notion.service';
import { getNotionApiKey, mapBlockResponse } from './notionUtils';

// Constants
const UNAUTHORIZED = 'Unauthorized: API key not found';
const BAD_REQUEST_ID = 'Bad Request: id parameter is required';
const INTERNAL_SERVER_ERROR = 'Internal Server Error';
const NO_CONTENT = 'No content';
const NOT_FOUND = 'Not Found: Page not found';

/**
 * Retrieves the content of a Notion page.
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HttpResponseInit object.
 */
export async function getPage(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http page processed request for url "${request.url}"`);

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
    // TODO: Fetch page title and add it to the response

    const response = await NotionService.fetchPageContent(notion, id);

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    if (response.results.length === 0) {
      return { status: 404, body: NOT_FOUND };
    }

    const content = await mapBlockResponse(response, notion);

    if (!content) {
      return { status: 200, body: NO_CONTENT };
    }

    return { status: 200, body: content };
  } catch (error) {
    context.error(`Error fetching Notion content: ${error.message}`);
    return { status: 500, body: INTERNAL_SERVER_ERROR };
  }
}

app.http('page', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'notion/page',
  handler: getPage
});
