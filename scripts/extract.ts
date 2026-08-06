import { Project } from "ts-morph";
import fs from "node:fs";
import path from "node:path";

const [, , fnName] = process.argv;
if (!fnName) throw new Error("Usage: extract <FunctionName>");

const project=new Project({tsConfigFilePath:"tsconfig.app.json"});
const app=project.addSourceFileAtPath("src/App.tsx");
const fn=app.getFunctionOrThrow(fnName);

const body=`import { useCallback,useEffect,useMemo,useState } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";
import { formatDateTime } from "../utils/dates";

${fn.getText().replace(`function ${fnName}`,"export default function "+fnName)}
`;

fs.mkdirSync("src/pages",{recursive:true});
fs.writeFileSync(path.join("src/pages",fnName+".tsx"),body);
console.log("Wrote",fnName);
