import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Client } from '@notionhq/client';
import {
  DataSourceObjectResponse,
  PageObjectResponse,
  PartialDataSourceObjectResponse,
  PartialPageObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

import { NotionService } from './notion.service';
import { getNotionApiKey, mapBlockResponse, mapDataSourceResponse } from './notionUtils';

const UNAUTHORIZED = 'Unauthorized: API key not found';
const BAD_REQUEST_QUERY = 'Bad Request: Query parameter is required';
const NOT_FOUND_RESULTS = 'Not Found: No results found';
const INTERNAL_SERVER_ERROR = 'Internal Server Error';
const BAD_REQUEST_UNKNOWN_OBJECT = 'Bad Request: Unknown object type';
type SearchResult =
  | PageObjectResponse
  | PartialPageObjectResponse
  | DataSourceObjectResponse
  | PartialDataSourceObjectResponse;

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
      response.results.map(async (result: SearchResult) => {
        return await getContent(result, notion);
      })
    );

    const content = contentArray.join('\n\n-----------Next page---------------\n\n');

    if (content.length === 0) {
      return { status: 404, body: NOT_FOUND_RESULTS };
    }

    return { status: 200, body: content };
  } catch (error) {
    context.error(`Error fetching Notion content: ${getErrorMessage(error)}`);
    return { status: 500, body: INTERNAL_SERVER_ERROR };
  }
}

/**
 * Retrieves the content of a Notion object.
 * @param result - The Notion search result object.
 * @param notion - The Notion client instance.
 * @returns The content as a formatted string or an error message.
 */
async function getContent(result: SearchResult, notion: Client): Promise<string> {
  try {
    // Fetch the content of a data source.
    if (result.object === 'data_source') {
      const response = await NotionService.fetchDataSourceContent(notion, result.id);
      return await mapDataSourceResponse(response, notion);

      // Fetch the content of a page.
    } else if (result.object === 'page') {
      const response = await NotionService.fetchPageContent(notion, result.id);
      return await mapBlockResponse(response, notion, result.id);
    } else {
      return BAD_REQUEST_UNKNOWN_OBJECT;
    }
  } catch (error) {
    console.error(
      `Error processing Notion content for ${result.object} with id ${result.id}: ${getErrorMessage(error)}`
    );
    return `Error processing content for ${result.object} with id ${result.id}`;
  }
}

/**
 * Maps unknown errors to a stable message string.
 * @param error - The thrown error.
 * @returns The error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

app.setup({ enableHttpStream: true });

app.http('search', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'notion/search',
  handler: search
});
