import { Filter } from "bad-words";

const profanity = new Filter();

export const cleanText = (value: string): string => profanity.clean(value).trim();
