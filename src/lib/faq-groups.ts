// The sections of the FAQ page, in display order. One list for the `faq`
// collection schema, the loader and the FAQ list component.
export const FAQ_GROUPS = ['booking', 'music', 'sound', 'day'] as const;
export type FaqGroup = (typeof FAQ_GROUPS)[number];
