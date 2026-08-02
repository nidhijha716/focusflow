import "@testing-library/jest-dom/vitest";
// In-memory IndexedDB polyfill for jsdom (which has no real IndexedDB) --
// installs `indexedDB`/`IDBKeyRange` globally so `src/db/client.ts`'s
// `idb`-wrapped `openDB()` calls work unmodified in tests. Import side
// effect only; see https://github.com/dumbmatter/fakeIndexedDB#readme.
import "fake-indexeddb/auto";
