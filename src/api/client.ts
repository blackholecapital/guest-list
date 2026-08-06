export type ApiSuccess<T>={ok:true;data:T};
export type ApiFailure={ok:false;error:{code:string;message:string}};
export type ApiResponse<T>=ApiSuccess<T>|ApiFailure;

export async function api<T>(url:string,init?:RequestInit):Promise<ApiResponse<T>>{
  const response=await fetch(url,{
    headers:{"Content-Type":"application/json",...(init?.headers??{})},
    ...init,
  });
  const body=await response.json() as ApiResponse<T>;
  if(!response.ok&&body.ok)return{ok:false,error:{code:"REQUEST_FAILED",message:"Request failed."}};
  return body;
}
