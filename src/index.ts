import arg from "arg";
import { login } from "./gdrive.js";

const args = arg({
    "--login": Boolean,
});

if (args["--login"]) {
    login().then(() => console.log("login successful"));
} else {
    import("./server.js");
}
