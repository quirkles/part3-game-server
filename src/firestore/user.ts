import { initFirestore } from "./init";

export async function getUserById(id: string): Promise<{
  id: string;
  name: string;
  hasDevPermissions: boolean;
} | null> {
  const db = initFirestore();
  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) {
    return null;
  }
  const { name, hasDevPermissions } = doc.data() || {};
  if (name) {
    return {
      id,
      name,
      hasDevPermissions: hasDevPermissions || false,
    };
  }

  return null;
}
