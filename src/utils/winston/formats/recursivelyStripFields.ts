import { format } from "winston";

import { recursivelyRemoveMatchingPredicate } from "../../recursivelyRemoveMatchingPredicate";

export const recursivelyRemoveFields = format((info, opts) => {
  const { fieldsToStrip = [] } = opts as { fieldsToStrip: string[] };
  const { level, message } = info;
  return {
    level,
    message,
    ...recursivelyRemoveMatchingPredicate(info, (key) =>
      fieldsToStrip.includes(key),
    ),
  };
});
