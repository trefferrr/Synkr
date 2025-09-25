import type { NextFunction, Request, Response } from "express";
import type { IUSER } from "../model/User.js";
export interface AuthenticatedRequest extends Request {
    user?: IUSER | null;
}
export declare const isAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=isAuth.d.ts.map