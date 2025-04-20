import { initFirestore } from "./init";

export async function findGameById(id: string): Promise<{
  id: string;
  name: string;
  createdBy: string;
  status: "CREATED" | "ACTIVE" | "ENDED";
} | null> {
  const db = initFirestore();
  const doc = await db.collection("games").doc(id).get();
  if (!doc.exists) {
    return null;
  }

  const { name, createdBy, status } = doc.data() || {};

  if (name && createdBy && status) {
    return {
      id,
      name,
      createdBy,
      status,
    };
  }

  return null;
}
