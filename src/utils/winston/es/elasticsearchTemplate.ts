import { format } from "winston";

export const esFormatter = format((info) => {
  const { level, message, labels, ...data } = info;
  return {
    level,
    message,
    labels,
    payload: data,
  };
});
