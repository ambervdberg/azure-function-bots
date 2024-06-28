import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getNotionApiKey } from "./helper";
const { Client } = require('@notionhq/client');

/**
 * Retrieves the content of a Notion page.
 * @param request
 * @param context 
 * @returns 
 */
export async function getPage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

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
    // Fetch the page content
    const response = await notion.blocks.children.list({
      block_id: id,
      page_size: 100,
    });

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    // Map the content to a string
    const content = await mapContent(response, notion);
    return { status: 200, body: content };

  } catch (error) {
    context.error(`Error fetching Notion content: ${error.message}`);
    return { status: 500, body: 'Internal Server Error' };
  }
};

/**
 * Maps the content from the Notion API response to a string, fetching child blocks recursively.
 * 
 * @param response 
 * @param notionClient 
 * @returns The content as a string.
 */
async function mapContent(response: any, notionClient: any): Promise<string> {
  // Fetch content from each block
  const content = await Promise.all(response.results.map(async (block: any) => {
    let blockContent = '';

    // Check if the block has rich text content
    if (block.type && block[block.type]?.rich_text) {
      
      // Concatenate all the text objects into a single string
      blockContent = block[block.type].rich_text
        .map((textObj: any) => textObj.plain_text).join('');
    }

    if (block.has_children) {
      // Fetch the children block content recursively
      const childResponse = await notionClient.blocks.children.list({
        block_id: block.id,
        page_size: 100,
      });

      // Concatenate the child content to the parent content
      const childContent = await mapContent(childResponse, notionClient);
      blockContent += '\n' + childContent;
    }

    return blockContent;
  }));

  // Filter out empty strings and join the content with newlines
  return content.filter(text => text.trim() !== '').join('\n');
}

app.http('page', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/page',
  handler: getPage
});