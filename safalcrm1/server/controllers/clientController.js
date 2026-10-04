const db = require("../config/db");

const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const mapClient = (row) => ({
    id: row.id,
    client_name: row.name,
    company_name: row.company_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    created_at: row.created_at,
});

exports.getClients = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM clients ORDER BY created_at DESC");
        res.json(rows.map(mapClient));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load clients." });
    }
};

exports.createClient = async (req, res) => {
    const { client_name, company_name, phone, email, address, city } = req.body;

    if (!client_name) {
        return res.status(400).json({ message: "Client name is required." });
    }
    if (!phone) {
        return res.status(400).json({ message: "Phone is required." });
    }
    if (email && !validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format." });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO clients (name, company_name, phone, email, address, city) VALUES (?, ?, ?, ?, ?, ?)",
            [client_name, company_name, phone, email, address, city]
        );
        const [rows] = await db.query("SELECT * FROM clients WHERE id = ?", [result.insertId]);
        res.status(201).json(mapClient(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to add client." });
    }
};

exports.updateClient = async (req, res) => {
    const { id } = req.params;
    const { client_name, company_name, phone, email, address, city } = req.body;

    if (!client_name) {
        return res.status(400).json({ message: "Client name is required." });
    }
    if (!phone) {
        return res.status(400).json({ message: "Phone is required." });
    }
    if (email && !validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format." });
    }

    try {
        const [result] = await db.query(
            "UPDATE clients SET name = ?, company_name = ?, phone = ?, email = ?, address = ?, city = ? WHERE id = ?",
            [client_name, company_name, phone, email, address, city, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Client not found." });
        }
        const [rows] = await db.query("SELECT * FROM clients WHERE id = ?", [id]);
        res.json(mapClient(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to update client." });
    }
};

exports.deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query("DELETE FROM clients WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Client not found." });
        }
        res.json({ message: "Client deleted." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to delete client." });
    }
};
