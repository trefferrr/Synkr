import mongoose, { Document } from "mongoose";
export interface IUSER extends Document {
    name: string;
    email: string;
}
export declare const User: mongoose.Model<IUSER, {}, {}, {}, mongoose.Document<unknown, {}, IUSER, {}, {}> & IUSER & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map