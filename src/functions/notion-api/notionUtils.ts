import { Client } from '@notionhq/client';
import {
  ListBlockChildrenResponse,
  PageObjectResponse,
  PropertyItemListResponse,
  QueryDatabaseResponse,
  TextRichTextItemResponse,
  TitlePropertyItemObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

import { ConfigurationError } from '../configuration-error';
import { NotionService } from './notion.service';
import { PropertyId } from './property-id.enum';

const NOTION_WORKSPACES = process.env.NOTION_WORKSPACES;

if (!NOTION_WORKSPACES) {
  throw new ConfigurationError();
}

// Constants
const ERROR_MAPPING_CONTENT = 'Error mapping content';
const ERROR_PROCESSING_PAGE = 'Error processing page';
const UNKNOWN_TYPE = 'Unknown Type';
const NO_TITLE = 'No Title';

// Get Notion API key based on workspace
export function getNotionApiKey(workspace?: string): string {
  if (!workspace) {
    // Get the api key for the first workspace if no workspace is provided
    return process.env[`NOTION_API_KEY_${getWorkspaces()[0]}`]!;
  }
  return process.env[`NOTION_API_KEY_${workspace.toUpperCase()}`]!;
}

/**
 * Get the workspaces which are available for searching.
 * @returns The workspaces to search in.
 */
export function getWorkspaces(): string[] {
  return NOTION_WORKSPACES.split(',');
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

          // Separate each property with a new line.
          return properties.join('\n');
        } catch (error) {
          console.error(ERROR_PROCESSING_PAGE, error);
          return ERROR_PROCESSING_PAGE;
        }
      })
    );

    if (title) content.unshift(title);

    // Separate each page with two new lines.
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

  const formattedProperties = await Promise.all(
    entries.map(async ([key, value]) => {
      try {
        const propertyValue = await formatProperty(value, notionClient);

        // Skip empty properties.
        if (!propertyValue) return '';

        return `${key}: ${propertyValue}`;
      } catch (error) {
        console.error(`Error formatting property ${key} - Type=${value.type}`, error);
        return `${key}: Error formatting property`;
      }
    })
  );

  // Filter out empty strings
  return formattedProperties.filter(Boolean);
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
  // Fetch the title if blockId is provided
  const title = blockId ? await fetchBlockTitle(notionClient, blockId) : null;

  // Process each block in the response
  const content = await Promise.all(
    response.results.map(block => processBlock(block, notionClient))
  );

  // Add title to content if it exists
  if (title) {
    content.unshift(title + '\n');
  }

  // Join non-empty content blocks with double newlines
  return content.filter(text => text.trim()).join('\n\n');
}

/**
 * Fetches the title of a block by its ID.
 *
 * @param notionClient - The Notion client instance.
 * @param blockId - The block ID.
 * @returns The title as a string.
 */
async function fetchBlockTitle(notionClient: Client, blockId: string): Promise<string | null> {
  try {
    const response = (await NotionService.fetchPageProperty(
      notionClient,
      blockId,
      PropertyId.Title
    )) as PropertyItemListResponse;
    const titleItem = response.results[0] as TitlePropertyItemObjectResponse;
    return (titleItem?.title as TextRichTextItemResponse)?.text?.content;
  } catch (error) {
    console.error(`Error fetching title for block ${blockId}`, error);
    return null;
  }
}

/**
 * Processes an individual block, fetching its content and any children recursively.
 *
 * @param block - The block object.
 * @param notionClient - The Notion client instance.
 * @returns The processed block content as a string.
 */
async function processBlock(block: any, notionClient: Client): Promise<string> {
  try {
    // Get the content of the current block
    let content = getBlockContent(block);

    // If the block has children, fetch and append their content
    if (block.has_children) {
      const childResponse = await NotionService.fetchPageContent(notionClient, block.id);
      const childContent = await mapBlockResponse(childResponse, notionClient);
      content += `\n${childContent}`;
    }

    return content.trim();
  } catch (error) {
    console.error(`Error processing block ${block.id}`, error);
    return '';
  }
}

/**
 * Extracts the text content from a block.
 *
 * @param block - The block object.
 * @returns The text content as a string.
 */
function getBlockContent(block: any): string {
  if (block.type && block[block.type]?.rich_text) {
    return block[block.type].rich_text.map((textObj: any) => textObj.plain_text).join('');
  }
  return '';
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
      return property.title?.map((t: any) => t.plain_text).join('');
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
      return property.people?.map((person: any) => person.name).join(', ');
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
    case 'checkbox':
      return property.checkbox ? 'V' : 'X';
    case 'number':
      return property.number?.toString();
    case 'verification':
      return property.verification?.state;
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
