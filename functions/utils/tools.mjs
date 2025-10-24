import { z } from 'zod';
export const convertToBedrockTools = (toolDefs) => {
  return toolDefs.map(toolDef => {
    return {
      isMultiTenant: toolDef.isMultiTenant,
      spec: {
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: { json: z.toJSONSchema(toolDef.schema) }
      },
      handler: toolDef.handler
    };
  });
};
