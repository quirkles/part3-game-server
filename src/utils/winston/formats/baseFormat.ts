import { format } from "winston";

import { recursivelyRemoveFields } from "./recursivelyStripFields";

const { combine, timestamp, errors, json } = format;

export const baseFormat = combine(
  timestamp(),
  errors({ stack: true }),
  recursivelyRemoveFields({ fieldsToStrip: ["logger"] }),
  json(),
);
