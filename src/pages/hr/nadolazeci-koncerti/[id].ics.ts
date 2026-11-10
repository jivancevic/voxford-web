// Add to calendar: one .ics per concert (src/lib/concerts.ts › icsRoute).
import { icsRoute } from '@/lib/concerts';

export const { getStaticPaths, GET } = icsRoute('hr');
