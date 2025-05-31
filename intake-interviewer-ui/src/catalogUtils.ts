// CatalogQuestionnaire interface
export interface CatalogQuestionnaire {
  id: string;
  title: string;
  importedAt: string;
  fhir: any;
}

const CATALOG_KEY = 'questionnaireCatalog';

// Simple UUID generator (not cryptographically secure)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

export function loadCatalog(): CatalogQuestionnaire[] {
  const raw = localStorage.getItem(CATALOG_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}

export function saveQuestionnaireToCatalog(q: any, title: string): void {
  const catalog = loadCatalog();
  // Prevent duplicates by hash of content (simple JSON string match)
  const exists = catalog.find(entry => JSON.stringify(entry.fhir) === JSON.stringify(q));
  if (exists) return;
  const entry: CatalogQuestionnaire = {
    id: uuidv4(),
    title: title || q.title || 'Untitled',
    importedAt: new Date().toISOString(),
    fhir: q,
  };
  catalog.push(entry);
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
}

export function deleteFromCatalog(id: string): void {
  const catalog = loadCatalog().filter(entry => entry.id !== id);
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
}

export function getQuestionnaireById(id: string): CatalogQuestionnaire | undefined {
  return loadCatalog().find(entry => entry.id === id);
}

export function updateQuestionnaireTitle(id: string, newTitle: string): void {
  const catalog = loadCatalog();
  const idx = catalog.findIndex(entry => entry.id === id);
  if (idx !== -1) {
    catalog[idx].title = newTitle;
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  }
} 