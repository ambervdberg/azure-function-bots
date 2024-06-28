export function getNotionApiKey(workspace: string): string {
  if (!workspace) {
    return process.env[`NOTION_API_KEY_${process.env.NOTION_DEFAULT_WORKSPACE}`];
  }
  return process.env[`NOTION_API_KEY_${workspace.toUpperCase()}`];
}