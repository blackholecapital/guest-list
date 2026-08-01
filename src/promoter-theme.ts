export const PROMOTER_THEME: Record<string,string> = {
  mike: "#2563EB",
  sarah: "#E11D48",
  james: "#EAB308",
};

export function promoterColor(slug:string){
  return PROMOTER_THEME[slug] ?? "#D4AF37";
}
