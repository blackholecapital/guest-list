export type DemoGuest = {
  id:number;
  name:string;
  phone:string;
  promoterName:string;
  promoterSlug:string;
  partySize:number;
  registeredAt:string;
  status:"checked_in"|"pending"|"flagged";
  checkedInAt:string|null;
  flagReason:string|null;
};
