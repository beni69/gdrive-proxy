import c from "ansi-colors";
import type { Request, Response } from "express";
import type morgan from "morgan";
export default function log(
    tokens: morgan.TokenIndexer<Request, Response>,
    req: Request,
    res: Response
) {
    const code = tokens.status(req, res);

    let msg = [
        c.bold.inverse(tokens.method(req, res) || ""),
        status(code),
        c.bold(tokens.url(req, res) || ""),
        c.magenta(tokens["response-time"](req, res) + " ms"),
        c.blue(req.ip),
        tokens["user-agent"](req, res),
    ].join(c.grey(" - "));

    return msg;

    function status(code?: string) {
        if (!code) return "";

        const colors = [c.reset, c.green, c.cyan, c.yellow, c.red];

        return colors[Math.floor(parseInt(code) / 100) - 1](code);
    }
}
