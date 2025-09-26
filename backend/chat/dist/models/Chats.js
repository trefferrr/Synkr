import mongoose, { Document, Schema } from "mongoose";
;
const schema = new Schema({
    users: [{ type: String, required: true }],
    latestMessage: {
        text: String,
        sender: String,
    },
}, {
    timestamps: true,
});
export const Chat = mongoose.model("Chat", schema);
//# sourceMappingURL=Chats.js.map