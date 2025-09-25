import jwt, {} from "jsonwebtoken";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            res.status(401).json({
                message: "Please Login- No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                mesaage: "Invalid token",
            });
            return;
        }
        req.user = decodedValue.user;
        next();
    }
    catch (e) {
        res.status(401).json({
            message: "Please Login- JWT error",
        });
    }
};
//# sourceMappingURL=isAuth.js.map