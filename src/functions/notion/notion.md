# Notion

## Functions

### search
Searches the notion workspace for relevant pages and databases based on the given query.

`http://localhost:7071/api/notion/search?workspace=myworkspace&query=stuff`

### page
Retrieves the content of the given page id and returns the parsed content as a formatted string.
Also retrieves the content of child content pages.

`http://localhost:7071/api/notion/page?workspace=myworkspace&id=1234abcd-123-abc-abc-1234abcd`

### database
Retrieves the content of the given database id and returns the parsed content as a formatted string.
Also retrieves titles of related databases.

`http://localhost:7071/api/notion/database?workspace=myworkspace&id=1234abcd-123-abc-abc-1234abcd`

## TODO
- Implement ai bot 
  - Should handle the return content of the the notion search and call relevant page or database functions.
  - Should use retrieved content as context to answer question.

