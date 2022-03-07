import chalk from "chalk";
import type { Request, Response } from "express";
import type morgan from "morgan";
export default function log(
    tokens: morgan.TokenIndexer<Request, Response>,
    req: Request,
    res: Response
) {
    const code = tokens.status(req, res);

    let msg = [
        chalk.bold.inverse(tokens.method(req, res)),
        status(code),
        chalk.bold(tokens.url(req, res)),
        chalk.magenta(tokens["response-time"](req, res) + " ms"),
        chalk.blue(req.ip),
        tokens["user-agent"](req, res),
    ].join(chalk.grey` - `);

    return msg;

    function status(code?: string) {
        if (!code) return "";

        const colors = [
            chalk.reset,
            chalk.green,
            chalk.cyan,
            chalk.yellow,
            chalk.red,
        ];

        return colors[Math.floor(parseInt(code) / 100) - 1](code);
    }
}
