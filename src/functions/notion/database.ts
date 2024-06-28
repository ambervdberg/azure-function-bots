import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getNotionApiKey } from "./helper";
const { Client } = require('@notionhq/client');

/**
 * Retrieves the content of a Notion database.
 * @param request
 * @param context 
 * @returns 
 */
export async function getDatabase(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
    // Fetch the database content
    const response = await notion.databases.query({
      database_id: id,
    });

    if (raw) {
      return { status: 200, jsonBody: response };
    }

    // Map the content to a string
    const content = await mapContent(response, notion);

    return { status: 200, body: content };

  } catch (error) {
    context.error(`Error fetching Notion database: ${error.message}`);
    return { status: 500, body: 'Internal Server Error' };
  }
};

/**
 * Maps the content from the Notion API response to a string.
 * 
 * @param response 
 * @param notionClient 
 * @returns The content as a string.
 */
async function mapContent(response: any, notionClient: any): Promise<string> {
  const content = await Promise.all(response.results.map(async (page: any) => {

    // Fetch properties from each page
    const properties = await Promise.all(

      // Map each property to a string
      Object.entries(page.properties).map(async ([key, value]: [string, any]) => {

        // Format the property based on its type
        return `${key}: ${await formatProperty(value, notionClient)}`;
      })
    );

    return properties.join('\n');
  }));

  return content.join('\n\n');
}

/**
 * Formats a Notion property based on its type.
 * 
 * @param property 
 * @param notionClient 
 * @returns The formatted property as a string.
 */
async function formatProperty(property: any, notionClient: any): Promise<string> {
  switch (property.type) {
    case 'title':
      return property.title.map((t: any) => t.plain_text).join('');
    case 'rich_text':
      return property.rich_text.map((t: any) => t.plain_text).join('');
    case 'select':
      return property.select ? property.select.name : '';
    case 'multi_select':
      return property.multi_select.map((t: any) => t.name).join(', ');
    case 'email':
      return property.email ?? '';
    case 'phone_number':
      return property.phone_number ?? '';
    case 'url':
      return property.url ?? '';
    case 'date':
      return property.date ? property.date.start : '';
    case 'relation':
      return await fetchRelatedPageTitles(property.relation, notionClient);
    default:
      return 'Unknown Type';
  }
}

/**
 * Fetches the titles of related pages.
 * 
 * @param relations 
 * @param notionClient 
 * @returns The related pages as an array of strings.
 */
async function fetchRelatedPageTitles(relations: any[], notionClient: any): Promise<string> {
  const relatedPages = await Promise.all(relations.map(async (relation: any) => {
    const page = await notionClient.pages.retrieve({ page_id: relation.id });

    // Find the key with title type
    const databaseKeyName = Object
      .keys(page.properties)
      .find(key => page.properties[key].type === 'title');

    if (databaseKeyName) {
      const titleProperty = page.properties[databaseKeyName];

      // Fetch the title property
      const title = await notionClient.pages.properties
        .retrieve({
          page_id: page.id,
          property_id: titleProperty.id
        });

      // Return the title as a string
      return title.results[0]?.title?.plain_text ?? 'No Title';
    } else {
      return 'No Title';
    }
  }));

  return relatedPages.join(', ');
}

app.setup({ enableHttpStream: true });

app.http('database', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'notion/database',
  handler: getDatabase
});
