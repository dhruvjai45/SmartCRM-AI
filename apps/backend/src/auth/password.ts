import argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string>{
    if(!password || password.length < 8){
        throw new Error(`Password must be at least 8 characters long`);
    }

    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1
    });
}

export async function verifyPassword(
    hash: string,
    password: string
): Promise<boolean>{
    return argon2.verify(hash, password);
}