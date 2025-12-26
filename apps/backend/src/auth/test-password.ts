// src/auth/test-password.ts

import argon2 from "argon2";

async function testArgon() {
  const password = "MyStrongPassword123";

  try {
    console.log("Hashing password...");
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    console.log("Hashed Password:");
    console.log(hash);

    console.log("\nVerifying...");

    const isMatch = await argon2.verify(hash, password);

    if (isMatch) {
      console.log("Password matched!");
    } else {
      console.log("Incorrect password!");
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

testArgon();