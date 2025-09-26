import type { RequestHandler, Request, Response, NextFunction } from "express";

const TryCatch=(handler: RequestHandler): RequestHandler =>{
    return async(req:Request, res:Response, next: NextFunction)=>{
  try{
  await handler(req,res,next);
}  
catch(e:any){
    res.status(500).json({
        message:e.message
    })
  }
 }
};
export default TryCatch;