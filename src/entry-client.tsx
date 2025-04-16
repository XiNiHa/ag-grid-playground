// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";
import "./global.css";

mount(() => <StartClient />, document.getElementById("app")!);
