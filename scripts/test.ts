import { Project } from "ts-morph";
const p=new Project({tsConfigFilePath:"tsconfig.app.json"});
const f=p.addSourceFileAtPath("src/pages/GuestListPage.tsx");
for(const d of f.getPreEmitDiagnostics()) console.log(d.getMessageText());
