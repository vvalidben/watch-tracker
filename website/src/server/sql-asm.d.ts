declare module 'sql.js/dist/sql-asm.js' { import type { SqlJsStatic } from 'sql.js'; const initialize: () => Promise<SqlJsStatic>; export default initialize }
