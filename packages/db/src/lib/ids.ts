import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 16);

export const ID_PREFIXES = {
  apiKey: "ak",
  apiKeyUsage: "aku",
  job: "job",
  organization: "org",
  schema: "sch",
  usageEvent: "ue",
} as const;

type IdPrefix = keyof typeof ID_PREFIXES;

export const createId = (prefix: IdPrefix): string => {
  const prefixValue = ID_PREFIXES[prefix];
  const id = nanoid();
  return `${prefixValue}_${id}`;
};
