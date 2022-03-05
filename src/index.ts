import express, { Request, Response } from "express";
import { downloadFile, getFile, getOAuthClient } from "./gdrive.js";

const PROD = process.env.NODE_ENV === "production",
    PORT = process.env.PORT || 8000;

// authenticate with the google drive api
const auth = await getOAuthClient(!PROD);

const app = express();

const dl = (dl: boolean) => async (req: Request, res: Response) => {
    const { fileId } = req.params;

    const { data, status } = await getFile(auth, {
        fileId,
        fields: "name,mimeType,permissions",
    });
    !PROD && console.log(data);

    if (status !== 200) return void res.status(status);

    // give the file if it's public
    if (
        data.permissions?.some(p => p.type === "anyone" || p.type === "domain")
    ) {
        res.header("Content-Type", data.mimeType!);

        // tell the browser to download the file
        dl &&
            res.header(
                "Content-Disposition",
                `attachment; filename="${data.name}"`
            );

        (await downloadFile(auth, { fileId })).pipe(res);

        return;
    }

    res.send("File is not public");
};

app.get("/", (req, res) => res.send("Hello World"));

app.get("/parse/*", (req, res) => {
    const url = req.url.replace("/parse/", "");

    // const r = /https:\/\/drive\.google\.com\/file\/d\/(.+?)\/?/;
    const r = new RegExp("^https://drive.google.com/file/d/(.*)/");

    !PROD && console.log(r.exec(url));

    const match = r.exec(url)?.[1];

    if (!match) return void res.status(400).send("Invalid URL");

    res.send(
        `<a href="/view/${match}">View</a><br><a href="/dl/${match}">Download</a>`
    );
});

app.get("/view/:fileId", dl(false));
app.get("/dl/:fileId", dl(true));

app.listen(PORT, () => console.log(`Listening on http://127.0.0.1:${PORT}`));
