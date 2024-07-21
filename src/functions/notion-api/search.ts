import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Client } from '@notionhq/client';
import {
  DatabaseObjectResponse,
  PageObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

import { NotionService } from './notion.service';
import { getNotionApiKey, mapBlockResponse, mapDBResponse } from './notionUtils';

const UNAUTHORIZED = 'Unauthorized: API key not found';
const BAD_REQUEST_QUERY = 'Bad Request: Query parameter is required';
const NOT_FOUND_RESULTS = 'Not Found: No results found';
const INTERNAL_SERVER_ERROR = 'Internal Server Error';
const BAD_REQUEST_UNKNOWN_OBJECT = 'Bad Request: Unknown object type';

/**
 * Searches for content in Notion.
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HttpResponseInit object.
 */
export async function search(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http search processed request for url "${request.url}"`);

  const workspace: string | null = request.query.get('workspace');
  const query: string | null = request.query.get('query');
  const raw: boolean = request.query.has('raw');
  const apiKey: string | undefined = getNotionApiKey(workspace);
  const password: string | null = request.query.get('password');

  if (password !== process.env.NOTION_API_PASSWORD) {
    return { status: 401, body: 'Unauthorized' };
  }

  if (!apiKey) {
    return { status: 401, body: UNAUTHORIZED };
  }

  if (!query) {
    return { status: 400, body: BAD_REQUEST_QUERY };
  }

  const notion = new Client({ auth: apiKey });

  try {
    const response = await notion.search({
      query,
      sort: {
        direction: 'ascending',
        timestamp: 'last_edited_time'
      }
    });

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    const contentArray = await Promise.all(
      response.results.map(async (result: PageObjectResponse | DatabaseObjectResponse) => {
        return await getContent(result, notion);
      })
    );

    const content = contentArray.join('\n\n-----------Next page---------------\n\n');

    if (content.length === 0) {
      return { status: 404, body: NOT_FOUND_RESULTS };
    }

    return { status: 200, body: content };
  } catch (error) {
    context.error(`Error fetching Notion content: ${error.message}`);
    return { status: 500, body: INTERNAL_SERVER_ERROR };
  }
}

/**
 * Retrieves the content of a Notion object.
 * @param result - The Notion search result object.
 * @param notion - The Notion client instance.
 * @returns The content as a formatted string or an error message.
 */
async function getContent(
  result: PageObjectResponse | DatabaseObjectResponse,
  notion: Client
): Promise<string> {
  try {
    // Fetch the content of a database.
    if (result.object === 'database') {
      const response = await NotionService.fetchDatabaseContent(notion, result.id);
      return await mapDBResponse(response, notion);

      // Fetch the content of a page.
    } else if (result.object === 'page') {
      const response = await NotionService.fetchPageContent(notion, result.id);
      return await mapBlockResponse(response, notion, result.id);
    } else {
      return BAD_REQUEST_UNKNOWN_OBJECT;
    }
  } catch (error) {
    console.error(
      `Error processing Notion content for ${result.object} with id ${result.id}: ${error.message}`
    );
    return `Error processing content for ${result.object} with id ${result.id}`;
  }
}

app.setup({ enableHttpStream: true });

app.http('search', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/search',
  handler: search
});
