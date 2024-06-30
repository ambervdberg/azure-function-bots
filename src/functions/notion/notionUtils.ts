import { Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionService } from './notion.service';

export function getNotionApiKey(workspace: string): string {
  if (!workspace) {
    return process.env[`NOTION_API_KEY_${process.env.NOTION_DEFAULT_WORKSPACE}`];
  }
  return process.env[`NOTION_API_KEY_${workspace.toUpperCase()}`];
}

/**
 * Maps the database response from the Notion API to a formatted string.
 * 
 * @param response 
 * @param notionClient 
 * @returns The content as a string.
 */
export async function mapDBResponse(response: any, notionClient: any): Promise<string> {
  try {
    const content = await Promise.all(response.results.map(async (page: any) => {

      try {
        const properties = await getFormattedPageProperties(page);

        return properties
          // remove undefined properties
          .filter((property: string) => property !== undefined)

          // join properties with newlines
          .join('\n');

      } catch (error) {

        console.error('Error processing page', error);

        return 'Error processing page';
      }
    }));

    return content.join('\n\n');

  } catch (error) {

    console.error('Error mapping content', error);

    return 'Error mapping content';
  }

  /**
   * Retrieves the properties of a page and formats them.
   * 
   * @param page 
   * @returns 
   */
  async function getFormattedPageProperties(page: PageObjectResponse): Promise<string[]> {
    // Get all page property keys
    const entries = Object.entries(page.properties);

    const result = entries.map(async ([key, value]: [string, any]) => {
      try {
        // Get the formatted property value
        const propertyValue = await formatProperty(value, notionClient);
        
        // Skip empty properties
        if (propertyValue === '') return;
       
        // Return the formatted key-value pair
        return `${key}: ${propertyValue}`;
      
      } catch (error) {
        console.error(`Error formatting property ${key}`, error);
        return `${key}: Error formatting property`;
      }
    });
    return Promise.all(result);
  }
}

/**
 * Maps the Block response from the Notion API to a formatted string.
 * 
 * @param response 
 * @param notionClient 
 * @returns 
 */
export async function mapBlockResponse(response: any, notionClient: Client): Promise<string> {
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
      const childResponse = await NotionService.fetchPageContent(notionClient, block.id);

      // Concatenate the child content to the parent content
      const childContent = await mapBlockResponse(childResponse, notionClient);
      blockContent += '\n' + childContent;
    }

    return blockContent;
  }));

  // Filter out empty strings and join the content with newlines
  return content.filter(text => text.trim() !== '').join('\n');
}

/**
 * Formats a Notion property based on its type.
 * 
 * @param property 
 * @param notionClient 
 * @returns The formatted property as a string.
 */
async function formatProperty(property: any, notionClient: Client): Promise<string> {
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
      return await getRelatedPageTitles(property.relation, notionClient);
    case 'people':
      return property.people.map((person: any) => person.name).join(', ');
    case 'status':
      return property.status.name;
    default:
      console.warn(`Unknown property type: ${property.type}`);
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
async function getRelatedPageTitles(relations: any[], notionClient: any): Promise<string> {
  const relatedPages = await Promise.all(relations.map(async (relation: any) => {
    const page = await notionClient.pages.retrieve({ page_id: relation.id }) as PageObjectResponse;

    // Find the key with title type
    const databaseKeyName = Object
      .keys(page.properties)
      .find(key => page.properties[key].type === 'title');

    if (databaseKeyName) {
      const titleProperty = page.properties[databaseKeyName];

      // Fetch the title property
      const title: any = await NotionService.fetchPageTitle(notionClient, page.id, titleProperty.id);

      // Return the title as a string
      return title.results[0]?.title?.plain_text ?? 'No Title';
    } else {
      return 'No Title';
    }
  }));

  return relatedPages.join(', ');
}
