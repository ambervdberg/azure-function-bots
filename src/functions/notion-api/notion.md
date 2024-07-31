# Notion

The Notion functions are used to retrieve content from the Notion workspace through the Notion API.

## Functions

### search

Searches the notion workspace for relevant pages and databases based on the given query.

Uses the page and database functions to retrieve the content.

`http://localhost:7071/api/notion/search?workspace=myworkspace&query=stuff`

#### Parameters:

- `workspace` (optional): The workspace to retrieve the page from. If not provided, the default workspace is used.
- `query`: The query to search for.

### page

Retrieves the content of the given page id and returns the parsed content as a formatted string.
Also retrieves the content of child content pages.

`http://localhost:7071/api/notion/page?workspace=myworkspace&id=1234abcd-123-abc-abc-1234abcd`

#### Parameters:

- `workspace` (optional): The workspace to retrieve the page from. If not provided, the default workspace is used.
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
