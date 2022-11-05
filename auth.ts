import { Credentials, OAuth2Client } from "google-auth-library";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { URL } from "node:url";
import enableDestroy from "server-destroy";

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PREFIX = "token",
    TOKEN_PATH = TOKEN_PREFIX + ".json",
    CREDENTIALS_PATH = "credentials.json";

const login = async () => {
    const { client_secret, client_id, redirect_uris } = JSON.parse(
        await readFile(CREDENTIALS_PATH, "utf-8")
    ).web;
    const client = new OAuth2Client(client_id, client_secret, redirect_uris[1]);
    const code = process.argv[3];

    try {
        client.setCredentials(JSON.parse(await readFile(TOKEN_PATH, "utf-8")));
        if (client.credentials.expiry_date! < Date.now()) {
            console.log("refreshing token");
            await client.refreshAccessToken();
            await saveToken(client.credentials);
        }
        console.log("existing token is valid");
        return client;
    } catch {
        await (code ? setCode(client, code) : getAccessToken(client));

        console.log("login successful");
    }
};

const getAccessToken = (client: OAuth2Client) =>
    new Promise<OAuth2Client>((resolve, rej) => {
        const server = createServer((req, res) => {
            try {
                if (req.url!.indexOf("/auth") >= -1) {
                    const qs = new URL(req.url!, "http://localhost:8080")
                        .searchParams;
                    res.end("success");
                    server.destroy();
                    const code = qs.get("code");
                    if (!code) return void rej("code not found");
                    setCode(client, code).then(resolve);
                }
            } catch (e) {
                rej(e);
            }
        }).listen(process.env.AUTH_PORT ?? 8081, () => {
            const authUrl = client.generateAuthUrl({
                access_type: "offline",
                scope: SCOPES,
            });
            console.log("Authorize this app by visiting this url:", authUrl);
        });
        enableDestroy(server);
    });

const setCode = (client: OAuth2Client, code: string) =>
    new Promise<OAuth2Client>((res, rej) => {
        client.getToken(code, async (err, token) => {
            if (err) return void rej(`Error retrieving access token: ${err}`);
            client.setCredentials(token!);
            await saveToken(token!);
            console.log("Token stored to", TOKEN_PATH);
            res(client);
        });
    });

const saveToken = (token: Credentials) =>
    Promise.all([
        writeFile(TOKEN_PATH, JSON.stringify(token)).catch(console.error),
        writeFile(TOKEN_PREFIX + ".txt", token.access_token!).catch(
            console.error
        ),
    ]);

const refresh = async () => {
    const { client_secret, client_id } = JSON.parse(
        process.env.CREDENTIALS || (await readFile(CREDENTIALS_PATH, "utf-8"))
    ).web;
    const client = new OAuth2Client(client_id, client_secret);

    try {
        client.setCredentials(
            JSON.parse(
                process.env.TOKEN || (await readFile(TOKEN_PATH, "utf-8"))
            )
        );
        if (client.credentials.expiry_date! < Date.now()) {
            console.log("refreshing token");
            await client.refreshAccessToken();
        }
        await saveToken(client.credentials);
    } catch (e) {
        console.error(e);
    }
};

switch (process.argv[2]) {
    case "login":
        login().catch(console.error);
        break;

    case "refresh":
        refresh().catch(console.error);
        setInterval(() => refresh().catch(console.error), 1000 * 60 * 60);
        console.log("refreshing token every hour");
        break;

    default:
        console.error("unknown command");
        process.exit(1);
}
