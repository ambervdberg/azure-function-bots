# Notion

The Notion functions are used to retrieve content from the Notion workspace through the Notion API.

This content will be given as context to OpenAI to generate a response.

This is not always reliable, because the relevant context can not always be found in the Notion workspace.

## Problem:

Bottleneck here is the Notion API, which can only search for page and database titles and not for content. This is why relevant content can not always be found.

## Possible solution:

A possible future solution is to retrieve all the content from Notion and store it in a vector database periodically. And then use the vector database to search for relevant content.

If that works well, then the vector database can be updated with new content every time a new page is created or updated through Notion webhooks. This would keep the vector database up to date with the Notion workspace.

## Functions

### search

Searches the notion workspace for relevant pages and databases based on the given query.

Uses the page and database functions to retrieve the content.

`http://localhost:7071/api/notion/search?workspace=myworkspace&query=stuff`

#### Parameters:

- `workspace` (optional): The workspace to retrieve the page from. If not provided, the first known workspace is used.
- `query`: The query to search for.

### page

Retrieves the content of the given page id and returns the parsed content as a formatted string.
Also retrieves the content of child content pages.

`http://localhost:7071/api/notion/page?workspace=myworkspace&id=1234abcd-123-abc-abc-1234abcd`

#### Parameters:

- `workspace` (optional): The workspace to retrieve the page from. If not provided, the first known workspace is used.
- `id`: The ID of the page to retrieve.

#### Returns:

A formatted string containing the parsed content of the page and its child content pages.

### database

Retrieves the content of the given database id and returns the parsed content as a formatted string.
Also retrieves titles of related databases.

`http://localhost:7071/api/notion/database?workspace=myworkspace&id=1234abcd-123-abc-abc-1234abcd`

#### Parameters:

- `workspace` (optional): The workspace to retrieve the page from. If not provided, the first known workspace is used. - _from the 'NOTION_WORKSPACES' environment variable_.
- `id`: The ID of the database to retrieve.
