// Hicom Books branding. Every product name, docs link and source link the app shows comes from here.

export const PRODUCT_NAME = 'Hicom Books';
export const DOCS_BASE_URL = 'https://docs.books.hicomsystem.com/';
export const SOURCE_URL = 'https://github.com/Bryantant/hicom-books';

/**
 * The docs page for an app docs path, such as `books`, `books/sales-invoices` or
 * `books/create-initial-entries#add-taxes`. The docs site keeps its pages at the root,
 * with the Indonesian pages under `id/`.
 */
export function getDocsUrl(appPath = ''): string {
  const page = appPath.replace(/^books(\/|$)/, '');
  const lang = globalThis.window?.frappe?.boot?.lang ?? '';
  const languagePrefix = lang.toLowerCase().startsWith('id') ? 'id/' : '';
  return DOCS_BASE_URL + languagePrefix + page;
}
