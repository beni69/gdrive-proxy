import { readFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { OAuth2Client } from "google-auth-library";
import { drive_v3, google } from "googleapis";
import readline from "readline";

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json",
    CREDENTIALS_PATH = "credentials.json";

export const getOAuthClient = async (): Promise<OAuth2Client> => {
    const credentials = JSON.parse(await readFile(CREDENTIALS_PATH, "utf-8"));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    // Check if we have previously stored a token.
    const token = JSON.parse(await readFile(TOKEN_PATH, "utf-8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
};

export const login = () => {
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    return getAccessToken(oAuth2Client);
};

const getAccessToken = (oAuth2Client: OAuth2Client) =>
    new Promise<OAuth2Client>((res, rej) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
        });

        console.log("Authorize this app by visiting this url:", authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question("Enter the code from that page here: ", code => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err || !token)
                    return void rej(`Error retrieving access token: ${err}`);

                oAuth2Client.setCredentials(token);
                writeFile(TOKEN_PATH, JSON.stringify(token))
                    .then(_ => {
                        console.log("Token stored to", TOKEN_PATH);
                        res(oAuth2Client);
                    })
                    .catch(rej);
            });
        });
    });

export const listFiles = (auth: OAuth2Client) => {
    const drive = google.drive({ version: "v3", auth });
    drive.files.list(
        {
            pageSize: 10,
            fields: "nextPageToken, files(id, name)",
        },
        (err, res) => {
            if (err || !res)
                return console.log("The API returned an error: " + err);
            const files = res.data.files;
            if (files?.length) {
                console.log("Files:");
                files.map(file => {
                    console.log(`${file.name} (${file.id})`);
                });
            } else {
                console.log("No files found.");
            }
        }
    );
};

export const getFile = (
    auth: OAuth2Client,
    p: drive_v3.Params$Resource$Files$Get
) => google.drive({ version: "v3", auth }).files.get(p);

export const downloadFile = async (
    auth: OAuth2Client,
    p: drive_v3.Params$Resource$Files$Get
) => {
    const drive = google.drive({ version: "v2", auth });
    const f = await drive.files.get(
        {
            alt: "media",
            ...p,
        },
        { responseType: "stream" }
    );
    return f.data;
};
