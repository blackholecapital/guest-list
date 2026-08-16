export const PROMOTER_THEME: Record<string,string> = {
  blue: "#2563EB",
  red: "#E11D48",
  yellow: "#EAB308",
  green: "#22C55E",
  purple: "#A855F7",
  orange: "#F97316",
  teal: "#14B8A6",
  pink: "#EC4899",
};

export function promoterColor(slug:string){
  return PROMOTER_THEME[slug] ?? "#D4AF37";
}
