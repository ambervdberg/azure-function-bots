# Azure Functions - OpenAI API

This project contains serverless Azure Functions that interact with the OpenAI API. The goal is to experiment with the OpenAI API.

## Features

- **Azure Function Integration**: Built with Azure Functions for serverless API calls.
- **OpenAI API**: Utilizes the OpenAI API to generate creative and humorous poems about information technology.
  - Supports: [chat.comletions](https://platform.openai.com/docs/api-reference/chat) with streamed and non streamed responses.
  - Other components of the OpenAI API will be added later with different bots.
- **Integration with Notion.** [Notion Readme](src/functions/notion/notion.md)

## Getting Started

### Prerequisites

- Azure account and Azure Functions development setup.
- Node.js installed on your machine.
- An OpenAI API key.

### Setup

1. Clone the repository to your local machine.
2. Navigate to the project directory and install dependencies:
   ```bash
   npm install
   ```
3. Create a local.settings.json 
   1. Add your **openai api key**
   2. Adjust the messages as you like.
   ```json
    {
      "IsEncrypted": false,
      "Values": {
        "NOTION_DEFAULT_WORKSPACE": "MYWORKSPACE",
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "node",
        "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
        "FUNCTIONS_REQUEST_BODY_SIZE_LIMIT": 1000000,
        "OPENAI_API_KEY": "your-open-api-key",
        "SUBJECT_SYSTEM_MESSAGE": "You are a master poet prompt engineer. You will create a prompt for a short poem. The subject must always be about software engineering and a bit funny. The response must be a single line without formatting. Example prompts: Competent female software developer. Software engineer who is out of coffee Code that will just NOT compile Software engineer with a tight deadline Bugs are everywhere in the code Learning a new programming language is hard The feeling when your code compiles on the first try When you don't know what the code does but it works AI that takes over the world Software engineer who is writing a tests and is struggling Software developer who is debugging a complex issue Software engineer who is learning a new programming language",
        "SUBJECT_USER_MESSAGE": "Give me a prompt for a short poem",
        "POEM_SYSTEM_MESSAGE": "You are a master poet. Your answers should be concise, and less than 50 words. Format the output in html without head or body. Make it look nice and easy to read. The subject of the poem will be provided by the user. It must always be related to information technology. Make the poem light-hearted and funny."
      },
      "Host": {
        "LocalHttpPort": 7071,
        "CORS": "*"
      }
    }
   ```
    > **NOTE:** Add the OPENAI_API_KEY, SUBJECT_SYSTEM_MESSAGE, SUBJECT_USER_MESSAGE and POEM_SYSTEM_MESSAGE keys to you Environment variables in Azure before deploying.

    Adding the messages as variables gives the advantage that you can quickly tweak you messages in Azure without having to change any code.
4. Start the project with: `npm run start`.
5. Open the links to see if everything works correctly:
   1. Open http://localhost:7071/api/subject to create a subject.
   2. Open http://localhost:7071/api/poem?message=someSubject to create a poem.
