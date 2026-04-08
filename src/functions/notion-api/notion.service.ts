import { Client } from '@notionhq/client';
import {
  DatabaseObjectResponse,
  GetDatabaseResponse,
  GetPagePropertyResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDataSourceResponse
} from '@notionhq/client/build/src/api-endpoints';

import { PropertyId } from './property-id.enum';

/** Provides shared access helpers for Notion API operations. */
export class NotionService {
  /**
   * Fetches the content of a Notion data source.
   * @param notionClient - The Notion client instance.
   * @param dataSourceId - The ID of the data source to query.
   * @returns The query response from the Notion API.
   */
  static async fetchDataSourceContent(
    notionClient: Client,
    dataSourceId: string
  ): Promise<QueryDataSourceResponse> {
    try {
      const response: QueryDataSourceResponse = await notionClient.dataSources.query({
        data_source_id: dataSourceId
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch data source content: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Fetches the content of the default data source for a database.
   * @param notionClient - The Notion client instance.
   * @param databaseId - The ID of the database to query.
   * @returns The query response from the Notion API.
   */
  static async fetchDatabaseContent(
    notionClient: Client,
    databaseId: string
  ): Promise<QueryDataSourceResponse> {
    try {
      const dataSourceId = await this.getDefaultDataSourceId(notionClient, databaseId);
      return await this.fetchDataSourceContent(notionClient, dataSourceId);
    } catch (error) {
      throw new Error(`Failed to fetch database content: ${getErrorMessage(error)}`);
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
      throw new Error(`Failed to fetch page content: ${getErrorMessage(error)}`);
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
      throw new Error(`Failed to fetch page property: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Resolves the default data source ID for a database.
   * @param notionClient - The Notion client instance.
   * @param databaseId - The ID of the database.
   * @returns The default data source ID.
   */
  static async getDefaultDataSourceId(notionClient: Client, databaseId: string): Promise<string> {
    try {
      const response = await notionClient.databases.retrieve({ database_id: databaseId });
      return getDefaultDataSourceId(response, databaseId);
    } catch (error) {
      throw new Error(`Failed to resolve database data source: ${getErrorMessage(error)}`);
    }
  }
}

/**
 * Extracts the default data source ID from a database response.
 * @param response - The database response from the Notion API.
 * @param databaseId - The ID of the database being resolved.
 * @returns The default data source ID.
 */
function getDefaultDataSourceId(response: GetDatabaseResponse, databaseId: string): string {
  if (!isFullDatabaseResponse(response)) {
    throw new Error(`Database ${databaseId} could not be fully retrieved`);
  }

  const defaultDataSource = response.data_sources[0];

  if (!defaultDataSource) {
    throw new Error(`Database ${databaseId} does not contain a data source`);
  }

  return defaultDataSource.id;
}

/**
 * Checks whether a database response includes full database details.
 * @param response - The database response from the Notion API.
 * @returns True when the response is a full database object.
 */
function isFullDatabaseResponse(response: GetDatabaseResponse): response is DatabaseObjectResponse {
  return 'data_sources' in response;
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
