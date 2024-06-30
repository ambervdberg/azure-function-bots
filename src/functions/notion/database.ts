import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Client } from "@notionhq/client";
import { NotionService } from "./notion.service";
import { getNotionApiKey, mapDBResponse } from "./notionUtils";

/**
 * Retrieves the content of a Notion database.
 * @param request
 * @param context 
 * @returns 
 */
export async function getDatabase(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http database processed request for url "${request.url}"`);

  const workspace = request.query.get('workspace');
  const id = request.query.get('id');
  const raw = request.query.has('raw');
  const apiKey = getNotionApiKey(workspace);

  if (!apiKey) {
    return { status: 401, body: 'Unauthorized: API key not found' };
  }

  if (!id) {
    return { status: 400, body: 'Bad Request: id parameter is required' };
  }

  const notion = new Client({ auth: apiKey });

  try {
    // TODO: Fetch Database title and add it to the response

    const response = await NotionService.fetchDatabaseContent(notion, id);

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    if (response.results.length === 0) {
      return { status: 404, body: 'Not Found: Database not found' };
    }
    
    try {
      const content = await mapDBResponse(response, notion);

      return { status: 200, body: content };

    } catch (error) {

      context.error(`Error mapping Notion content: ${error.message}`);

      return { status: 500, body: 'Internal Server Error' };
    }

  } catch (error) {
    context.error(`Error fetching Notion database: ${error.message}`);
    return { status: 500, body: 'Internal Server Error' };
  }
};

app.setup({ enableHttpStream: true });

app.http('database', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/database',
  handler: getDatabase
});
