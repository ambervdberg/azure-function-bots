import { Client } from '@notionhq/client';
import {
  ListBlockChildrenResponse,
  PageObjectResponse,
  PropertyItemListResponse,
  QueryDatabaseResponse,
  TextRichTextItemResponse,
  TitlePropertyItemObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

import { NotionService } from './notion.service';
import { PropertyId } from './property-id.enum';

// Constants
const ERROR_MAPPING_CONTENT = 'Error mapping content';
const ERROR_PROCESSING_PAGE = 'Error processing page';
const UNKNOWN_TYPE = 'Unknown Type';
const NO_TITLE = 'No Title';

// Get Notion API key based on workspace
export function getNotionApiKey(workspace: string): string {
  if (!workspace) {
    return process.env[`NOTION_API_KEY_${process.env.NOTION_DEFAULT_WORKSPACE}`]!;
  }
  return process.env[`NOTION_API_KEY_${workspace.toUpperCase()}`]!;
}

/**
 * Maps the database response from the Notion API to a formatted string.
 *
 * @param response - The database response from the Notion API.
 * @param notionClient - The Notion client instance.
 * @param title - Optional title for the content.
 * @returns The content as a formatted string.
 */
export async function mapDBResponse(
  response: QueryDatabaseResponse,
  notionClient: Client,
  title?: string
): Promise<string> {
  try {
    const content = await Promise.all(
      response.results.map(async (page: PageObjectResponse) => {
        try {
          const properties = await getFormattedPageProperties(page, notionClient);

          return (
            properties
              // remove undefined properties
              .filter((property: string) => property !== undefined)

              // join properties with newlines
              .join('\n')
          );
        } catch (error) {
          console.error(ERROR_PROCESSING_PAGE, error);
          return ERROR_PROCESSING_PAGE;
        }
      })
    );

    if (title) {
      content.unshift(title);
    }

    return content.join('\n\n');
  } catch (error) {
    console.error(ERROR_MAPPING_CONTENT, error);
    return ERROR_MAPPING_CONTENT;
  }
}

/**
 * Retrieves the properties of a page and formats them.
 *
 * @param page - The page object response.
 * @returns The formatted properties as an array of strings.
 */
async function getFormattedPageProperties(
  page: PageObjectResponse,
  notionClient: Client
): Promise<string[]> {
  const entries = Object.entries(page.properties);

  const result = entries.map(async ([key, value]) => {
    try {
      const propertyValue = await formatProperty(value, notionClient);

      // Skip empty properties.
      if (propertyValue === '') return;

      return `${key}: ${propertyValue}`;
    } catch (error) {
      console.error(`Error formatting property ${key} - Type=${value.type}`, error);
      return `${key}: Error formatting property`;
    }
  });
  return Promise.all(result);
}

/**
 * Maps the block response from the Notion API to a formatted string.
 *
 * @param response - The block response from the Notion API.
 * @param notionClient - The Notion client instance.
 * @param blockId - Optional block ID to fetch the title.
 * @returns The content as a formatted string.
 */
export async function mapBlockResponse(
  response: ListBlockChildrenResponse,
  notionClient: Client,
  blockId?: string
): Promise<string> {
  const titleResponse = blockId
    ? ((await NotionService.fetchPageProperty(
        notionClient,
        blockId,
        PropertyId.Title
      )) as PropertyItemListResponse)
    : null;

  const title = titleResponse
    ? (
        (titleResponse.results[0] as TitlePropertyItemObjectResponse)
          .title as TextRichTextItemResponse
      ).text.content
    : null;

  // Fetch content from each block
  let content = await Promise.all(
    response.results.map(async (block: any) => {
      let blockContent = '';

      if (block.type && block[block.type]?.rich_text) {
        // Concatenate all the text objects into a single string.
        blockContent = block[block.type].rich_text
          .map((textObj: any) => textObj.plain_text)
          .join('');
      }

      if (block.has_children) {
        // Fetch the children block content recursively.
        const childResponse = await NotionService.fetchPageContent(notionClient, block.id);
        const childContent = await mapBlockResponse(childResponse, notionClient);

        // Concatenate the child content to the parent content.
        blockContent += '\n' + childContent;
      }

      return blockContent;
    })
  );

  if (title) {
    content.unshift(title + '\n');
  }

  return content.filter(text => text.trim() !== '').join('\n');
}

/**
 * Formats a Notion property based on its type.
 *
 * @param property - The property object.
 * @param notionClient - The Notion client instance.
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
    case 'last_edited_by':
      return property.last_edited_time ?? '';
    case 'last_edited_time':
      return property.name ?? '';
    case 'created_time':
      return property.created_time ?? ''; // TODO: format date time
    case 'created_by':
      return property.name ?? '';
    default:
      console.warn(`Unknown property type: ${property.type}`);
      return UNKNOWN_TYPE;
  }
}

/**
 * Fetches the titles of related pages.
 *
 * @param relations - The relations array.
 * @param notionClient - The Notion client instance.
 * @returns The related pages as a formatted string.
 */
async function getRelatedPageTitles(relations: any[], notionClient: any): Promise<string> {
  const relatedPages = await Promise.all(
    relations.map(async (relation: any) => {
      const page = await NotionService.getPage(notionClient, relation.id);

      const databaseKeyName = findKeyWithTitleType(page);

      if (databaseKeyName) {
        const titleProperty = page.properties[databaseKeyName];

        const title: any = await NotionService.fetchPageProperty(
          notionClient,
          page.id,
          titleProperty.id as unknown as PropertyId
        );

        return title.results[0]?.title?.plain_text ?? NO_TITLE;
      } else {
        return NO_TITLE;
      }
    })
  );

  return relatedPages.join(', ');
}

/**
 * Finds the key of the title property in a page object.
 *
 * @param page - The page object response.
 * @returns The key of the title property.
 */
function findKeyWithTitleType(page: PageObjectResponse): string {
  return Object.keys(page.properties).find(key => page.properties[key].type === PropertyId.Title);
}
