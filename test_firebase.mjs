import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const app = initializeApp({
  apiKey: "dummy_api_key_for_build_1234567890123", // Need something that looks like an API key?
  authDomain: "dummy.firebaseapp.com",
  projectId: "dummy",
});

try {
  const auth = getAuth(app);
  console.log("Success!");
} catch (e) {
  console.error("Error:", e.message);
}
