export async function InvokeLLM({ prompt, response_json_schema, add_context_from_internet }) {
  console.log('[InvokeLLM] Local mock - AI features disabled in local environment');
  console.log('[InvokeLLM] Prompt:', prompt);
  
  if (response_json_schema?.properties?.stocks) {
    return { stocks: [] };
  }
  
  return { result: 'AI features are not available in local development mode.' };
}

export async function UploadFile(file) {
  console.log('[UploadFile] Local mock - file uploads disabled');
  return { url: URL.createObjectURL(file), name: file.name };
}
