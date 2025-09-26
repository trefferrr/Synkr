import type {NextFunction,Request,Response} from "express";
import type {IUSER} from"../model/User.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request{
user?: IUSER|null;
}
export const isAuth=async(req:AuthenticatedRequest, res:Response, next:NextFunction):
Promise<void>=>{
    try{
        const authHeader=req.headers.authorization

        if(!authHeader|| !authHeader.startsWith("Bearer")){
            res.status(401).json({
                message:"Please Login- No auth header",
            });
            return;
        }
        const token=authHeader.split(" ")[1] as string

        const decodedValue= jwt.verify(token,process.env.JWT_SECRET as string) as JwtPayload

        if(!decodedValue||!decodedValue.user){
            res.status(401).json({
                mesaage:"Invalid token",
            });
            return;
        }
        req.user=decodedValue.user;
        next();

    }
    catch(e){
        res.status(401).json({
    message:"Please Login- JWT error",
});
    }
};