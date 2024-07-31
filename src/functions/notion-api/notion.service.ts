import { Client } from '@notionhq/client';
import {
  GetPagePropertyResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDatabaseResponse
} from '@notionhq/client/build/src/api-endpoints';

import { PropertyId } from './property-id.enum';

export class NotionService {
  /**
   * Fetches the content of a Notion database.
   * @param notionClient - The Notion client instance.
   * @param databaseId - The ID of the database to query.
   * @returns The query response from the Notion API.
   */
  static async fetchDatabaseContent(
    notionClient: Client,
    databaseId: string
  ): Promise<QueryDatabaseResponse> {
    try {
      const response: QueryDatabaseResponse = await notionClient.databases.query({
        database_id: databaseId
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch database content: ${error.message}`);
    }
  }

  /**
   * Fetches a Notion page.
   * @param notionClient - The Notion client instance.
   * @param pageId - The ID of the page to fetch.
   * @returns The page object response from the Notion API.
   */
  static async getPage(notionClient: Client, pageId: string): Promise<PageObjectResponse> {
    return (await notionClient.pages.retrieve({ page_id: pageId })) as PageObjectResponse;
  }

  /**
   * Fetches the content of a Notion page.
   * @param notionClient - The Notion client instance.
   * @param pageId - The ID of the page to fetch content from.
   * @returns The list of block children response from the Notion API.
   */
  static async fetchPageContent(
    notionClient: Client,
    pageId: string
  ): Promise<ListBlockChildrenResponse> {
    try {
      const response: ListBlockChildrenResponse = await notionClient.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch page content: ${error.message}`);
    }
  }

  /**
   * Fetches a specific property of a Notion page.
   * @param notionClient - The Notion client instance.
   * @param pageId - The ID of the page to fetch the property from.
   * @param propertyType - The type of property to fetch.
   * @returns The page property response from the Notion API.
   */
  static async fetchPageProperty(
    notionClient: Client,
    pageId: string,
    propertyType: PropertyId
  ): Promise<GetPagePropertyResponse> {
    try {
      const response: GetPagePropertyResponse = await notionClient.pages.properties.retrieve({
        page_id: pageId,
        property_id: propertyType
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch page property: ${error.message}`);
    }
  }
}
