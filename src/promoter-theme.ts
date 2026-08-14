export const PROMOTER_THEME: Record<string,string> = {
  blue: "#2563EB",
  red: "#E11D48",
  yellow: "#EAB308",
};

export function promoterColor(slug:string){
  return PROMOTER_THEME[slug] ?? "#D4AF37";
}
