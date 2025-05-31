import { faker } from "@faker-js/faker";

import { Firestore } from "firebase-admin/firestore";

import { generateAllSubstrings } from "../src/utils/string";
async function main() {
  const firestore = new Firestore();
  const batch = firestore.batch();
  for (let i = 0; i < 100; i++) {
    const user = firestore.collection("users").doc();
    const userName = faker.internet.username();
    batch.create(user, {
      name: userName,
      _searchIdx: generateAllSubstrings(userName),
      id: user.id,
    });
  }
  await batch.commit();
}

main()
  .then(() => {})
  .catch(console.error);
