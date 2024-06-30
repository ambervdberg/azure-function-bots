import { Client } from "@notionhq/client";

export class NotionService {

  /**
   * Fetches the content of a Notion database.
   * @param notionClient
   * @param apiKey 
   * @param databaseId 
   * @returns
   */
  static async fetchDatabaseContent(notionClient: Client, databaseId: string): Promise<any> {
    const response = await notionClient.databases.query({ database_id: databaseId });
    return response;
  }

  /**
   * Fetches the content of a Notion page.
   * @param notionClient
   * @param apiKey 
   * @param pageId 
   * @returns 
   */
  static async fetchPageContent(notionClient: Client, pageId: string): Promise<any> {
    const response = await notionClient.blocks.children.list({ block_id: pageId, page_size: 100 });
    return response;
  }

  /**
   * Fetches the title of a Notion page.
   * @param notionClient 
   * @param pageId 
   * @param titleProperty 
   * @returns 
   */
  static async fetchPageTitle(notionClient: Client, pageId: string, titleProperty) {
    const response = await notionClient.pages.properties.retrieve({ 
      page_id: pageId, 
      property_id: titleProperty 
    });

    return response;
  }

}