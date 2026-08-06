export function formatDateTime(value:string){return new Date(value).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
