import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Client } from "@notionhq/client";
import { NotionService } from "./notion.service";
import { getNotionApiKey, mapBlockResponse, mapDBResponse } from "./notionUtils";

/**
 * Searches for content in Notion.
 * @param request 
 * @param context 
 * @returns 
 */
export async function search(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http search processed request for url "${request.url}"`);

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

  let content = '';
 
  let results: any = response.results
    .map(async (result: any) => await getContent(result, notion));
  
  await Promise.all(results).then((value) => {
    content = value.join('\n\n-----------Next page---------------\n\n');
  });

  if (content.length === 0) { 
    return { status: 404, body: 'Not Found: No results found' };
  }

  return { status: 200, body: content };
};

/**
 * Retrieves the content of a Notion object.
 * @param result 
 * @param notion 
 * @returns 
 */
async function getContent(result: any, notion: Client) {
  let response;

  // Fetch the content of a database
  if (result.object === 'database') {

    response = await NotionService.fetchDatabaseContent(notion, result.id);

    return mapDBResponse(response, notion);

  // Fetch the content of a page
  } else if (result.object === 'page') {

    response = await NotionService.fetchPageContent(notion, result.id);

    return mapBlockResponse(response, notion);

  } else {
    return { status: 400, body: 'Bad Request: Unknown object type' };
  }
}

app.setup({ enableHttpStream: true });

app.http('search', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/search',
  handler: search
});
