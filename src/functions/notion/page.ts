import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Client } from "@notionhq/client";
import { NotionService } from "./notion.service";
import { getNotionApiKey, mapBlockResponse } from "./notionUtils";


/**
 * Retrieves the content of a Notion page.
 * @param request
 * @param context 
 * @returns 
 */
export async function getPage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http page processed request for url "${request.url}"`);

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
    // TODO: Fetch page title and add it to the response

    const response = await NotionService.fetchPageContent(notion, id);

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    if (response.results.length === 0) {
      return { status: 404, body: 'Not Found: Page not found' };
    }

    const content = await mapBlockResponse(response, notion);

    if (!content) {
      return { status: 200, body: 'No content' };
    }

    return { status: 200, body: content };

  } catch (error) {
    context.error(`Error fetching Notion content: ${error.message}`);
    return { status: 500, body: 'Internal Server Error' };
  }
};

app.http('page', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/page',
  handler: getPage
});
