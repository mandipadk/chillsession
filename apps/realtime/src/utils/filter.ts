import { Filter } from "bad-words";

const profanity = new Filter();

export const cleanText = (input: string): string => profanity.clean(input).trim();
