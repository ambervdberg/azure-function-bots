# Azure Functions - OpenAI API

This project contains serverless Azure Functions that interact with the OpenAI API. The goal is to experiment with the OpenAI API.

## Features

- **Azure Function Integration**: Built with Azure Functions for serverless API calls.
- **OpenAI API**: Utilizes the OpenAI API to generate creative and humorous poems about information technology.
  - Supports: [chat.comletions](https://platform.openai.com/docs/api-reference/chat) with streamed and non streamed responses.
  - Other components of the OpenAI API will be added later with different bots.
- **Integration with Notion.** [Notion Readme](src/functions/notion-api/notion.md)
- **Authentication**: Authenticate the user for Azure Functions.

## Getting Started

### Prerequisites

- Azure account and Azure Functions development setup if you want to to deploy the functions.
- Node.js installed on your machine.
- An OpenAI API key.
- For the Notion API, you need a Notion API key and a workspace. You can connect multiple workspaces if you like.

### Setup

1. Clone the repository to your local machine.
2. Navigate to the project directory and install dependencies:
   ```bash
   npm install
   ```
3. Create a **local.settings.json**

   1. Add your **openai api key**
   2. Adjust everything as you like.

   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",

       // Base URL for the functions. In production, this should be the Azure URL.
       "BASE_URL": "http://localhost:7071",

       // Notion workspaces
       "NOTION_WORKSPACES": "MYWORKSPACE,WORK",

       // Notion API key for each workspace you want to connect.
       "NOTION_API_KEY_MYWORKSPACE": "secret_1234567890abcdefghijkl",
       "NOTION_API_KEY_WORK": "secret_1234567890abcdefghijkl",

       // Allowed email that may access the Azure functions. Set this to your google email address.
       "ALLOWED_EMAIL": "jane-doe@email.com",

       "OPENAI_API_KEY": "your-open-api-key",

       // System messages for the Notion bots
       "NOTION_SYSTEM_MESSAGE": "You are an assistant that will use the given context to answer the user question.",
       "NOTION_SYSTEM_MESSAGE_EXTRACT_SEARCH_QUERY": "It is your job to create a search query from the user question to use with the notion.search API. The query must only contain the most important keywords from the question. Preferably not more than one or two. The Notion API searches for page titles. So if a user question would be: \"Which companies are in Amsterdam?\", it's best to search for the word Companies, because that is more likely to be a page title than company. Escape the result so it can be used in a url. Don't add quotes around the query.",

       // System messages for the Poem bot
       "POEM_SYSTEM_MESSAGE": "You are a master poet. Your answers should be concise, and less than 50 words. Format the output in HTML without head or body. Make it look nice and easy to read. The subject of the poem will be provided by the user. It must always be related to information technology. Make the poem light-hearted and funny.",
       "SUBJECT_SYSTEM_MESSAGE": "You are a master poet prompt engineer. You will create a prompt for a short poem. The subject must always be about software engineering and funny. The response must be a single line without formatting.",

       // User message for the Poem bot
       "SUBJECT_USER_MESSAGE": "Give me a prompt for a short poem"
     },
     "Host": {
       "LocalHttpPort": 7071,
       "CORS": "*"
     }
   }
   ```

   > **NOTE:** Add the necessary keys to your Environment variables in Azure before deploying.

   Adding the messages as variables gives the advantage that you can quickly tweak you messages in Azure without having to change any code.

4. Start the project with: `npm run start`.

### Functions

#### Notion API

> **Note**: See the [Notion Readme](src/functions/notion-api/notion.md) for more information.

- **database**: http://localhost:7071/api/notion/database

- **page**: http://localhost:7071/api/notion/page

- **search**: http://localhost:7071/api/notion/search

#### OpenAI API

- **poem**: http://localhost:7071/api/poem

- **subject**: http://localhost:7071/api/subject

- **notion**: http://localhost:7071/api/notion
  - Parameters:
    - `workspace` (optional): The workspace to retrieve the page from. If not provided, all workspaces are tried one by one until a result is found.
    - `question`: The question to search for.

#### Authentication

- **auth-google**: http://localhost:7071/api/auth-google
  - Parameters:
    - `access_token`: The code from the Google OAuth2 response.
  - Returns:
    - The Azure code needed to access the Azure Functions with auth level 'function'.

## Client

You can connect the functions to any client you wish.

### Example implementation

Here is an example implementation created with Lit Element and TypeScript:

- Github: [ambervdberg/ai-bots](https://github.com/ambervdberg/ai-bots)
- Demo: https://ambervdberg.github.io/ai-bots/
