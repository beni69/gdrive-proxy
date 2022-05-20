import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "crypto";
import { createReadStream, createWriteStream, statSync } from "fs";
import { createGunzip, createGzip } from "zlib";

const p = "/mnt/c/Users/Beni/Downloads/02_BK_2021-11-15.mkv";
console.log(statSync(p).size);

const mkKey = pwd =>
    createHash("sha256").update(pwd).digest("base64").substr(0, 32);

const algorithm = "aes-256-ctr",
    key = mkKey("xd");

const encryptZip = () => {
    const iv = randomBytes(16),
        r = createReadStream(p),
        w = createWriteStream(p + ".enc"),
        zip = createGzip(),
        encrypt = createCipheriv(algorithm, key, iv);

    console.log({ iv: iv.toString("hex") });

    zip.on("end", () => console.log("zip ended"));
    encrypt.on("end", () => console.log("encrypt ended"));

    r.pipe(zip).pipe(encrypt).pipe(w);
};
const decryptZip = () => {
    const iv = Buffer.from(process.argv[2], "hex"),
        r = createReadStream(p + ".enc"),
        w = createWriteStream(p + ".dec"),
        unzip = createGunzip(),
        decrypt = createDecipheriv(algorithm, key, iv);

    decrypt.on("end", () => console.log("decrypt ended"));
    unzip.on("end", () => console.log("unzip ended"));

    r.pipe(decrypt).pipe(unzip).pipe(w);
};
const encrypt = () => {
    const iv = randomBytes(16),
        r = createReadStream(p),
        w = createWriteStream(p + ".enc"),
        encrypt = createCipheriv(algorithm, key, iv);

    console.log({ iv: iv.toString("hex") });

    encrypt.on("end", () => console.log("encrypt ended"));

    r.pipe(encrypt).pipe(w);
};
const decrypt = () => {
    const iv = Buffer.from(process.argv[2], "hex"),
        r = createReadStream(p + ".enc"),
        w = createWriteStream(p + ".dec"),
        decrypt = createDecipheriv(algorithm, key, iv);

    decrypt.on("end", () => console.log("decrypt ended"));

    r.pipe(decrypt).pipe(w);
};

// encryptZip();
// decryptZip();
// encrypt();
decrypt();
