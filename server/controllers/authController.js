const db = require("../config/db");

exports.loginUser = async(req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const [rows] = await db.query("SELECT id, username, email, password FROM users WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = rows[0];
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        res.json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to process login." });
    }
};