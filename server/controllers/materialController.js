const db = require("../config/db");

const parseStockValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapMaterial = (row) => ({
  id: row.id,
  material_code: row.material_code,
  material_name: row.material_name,
  category: row.category,
  unit: row.unit,
  current_stock: row.current_stock,
  minimum_stock: row.minimum_stock,
  created_at: row.created_at,
});

const getDbName = () => process.env.DB_NAME || "safal_crm";

const materialCodeExists = async (material_code, excludedId = null) => {
  const sql = excludedId
    ? "SELECT id FROM materials WHERE material_code = ? AND id != ?"
    : "SELECT id FROM materials WHERE material_code = ?";
  const params = excludedId ? [material_code, excludedId] : [material_code];
  const [rows] = await db.query(sql, params);
  return rows.length > 0;
};

const tableExists = async (tableName) => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
    [getDbName(), tableName]
  );
  return rows[0]?.count > 0;
};

const hasBomReference = async (materialId, materialCode) => {
  const candidateTables = ["bom", "bill_of_materials", "bom_items"];

  for (const tableName of candidateTables) {
    if (!(await tableExists(tableName))) {
      continue;
    }

    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM ${tableName} WHERE material_id = ?`,
        [materialId]
      );
      if (rows[0]?.count > 0) {
        return true;
      }
    } catch (error) {
      if (error.code !== "ER_BAD_FIELD_ERROR") {
        throw error;
      }
    }

    if (materialCode) {
      try {
        const [rows] = await db.query(
          `SELECT COUNT(*) AS count FROM ${tableName} WHERE material_code = ?`,
          [materialCode]
        );
        if (rows[0]?.count > 0) {
          return true;
        }
      } catch (error) {
        if (error.code !== "ER_BAD_FIELD_ERROR") {
          throw error;
        }
      }
    }
  }

  return false;
};

const validateMaterial = ({ material_code, material_name, category, unit, current_stock, minimum_stock }) => {
  const errors = [];

  if (!material_code || !material_code.toString().trim()) {
    errors.push("Material code is required.");
  }
  if (!material_name || !material_name.toString().trim()) {
    errors.push("Material name is required.");
  }
  if (!category || !category.toString().trim()) {
    errors.push("Category is required.");
  }
  if (!unit || !unit.toString().trim()) {
    errors.push("Unit is required.");
  }

  const currentStock = parseStockValue(current_stock);
  const minimumStock = parseStockValue(minimum_stock);

  if (currentStock === null || currentStock < 0) {
    errors.push("Current stock must be a non-negative number.");
  }
  if (minimumStock === null || minimumStock < 0) {
    errors.push("Minimum stock must be a non-negative number.");
  }

  return { errors, currentStock, minimumStock };
};

exports.getMaterials = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM materials ORDER BY created_at DESC");
    res.json(rows.map(mapMaterial));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load materials." });
  }
};

exports.createMaterial = async (req, res) => {
  const { material_code, material_name, category, unit, current_stock, minimum_stock } = req.body;
  const { errors, currentStock, minimumStock } = validateMaterial({
    material_code,
    material_name,
    category,
    unit,
    current_stock,
    minimum_stock,
  });

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(" ") });
  }

  try {
    if (await materialCodeExists(material_code)) {
      return res.status(400).json({ message: "Material code must be unique." });
    }

    const [result] = await db.query(
      "INSERT INTO materials (material_code, material_name, category, unit, current_stock, minimum_stock) VALUES (?, ?, ?, ?, ?, ?)",
      [
        material_code.toString().trim(),
        material_name.toString().trim(),
        category.toString().trim(),
        unit.toString().trim(),
        currentStock,
        minimumStock,
      ]
    );

    const [rows] = await db.query("SELECT * FROM materials WHERE id = ?", [result.insertId]);
    res.status(201).json(mapMaterial(rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to add material." });
  }
};

exports.updateMaterial = async (req, res) => {
  const { id } = req.params;
  const { material_code, material_name, category, unit, current_stock, minimum_stock } = req.body;
  const { errors, currentStock, minimumStock } = validateMaterial({
    material_code,
    material_name,
    category,
    unit,
    current_stock,
    minimum_stock,
  });

  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join(" ") });
  }

  try {
    const [existing] = await db.query("SELECT id FROM materials WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    if (await materialCodeExists(material_code, id)) {
      return res.status(400).json({ message: "Material code must be unique." });
    }

    await db.query(
      "UPDATE materials SET material_code = ?, material_name = ?, category = ?, unit = ?, current_stock = ?, minimum_stock = ? WHERE id = ?",
      [
        material_code.toString().trim(),
        material_name.toString().trim(),
        category.toString().trim(),
        unit.toString().trim(),
        currentStock,
        minimumStock,
        id,
      ]
    );

    const [rows] = await db.query("SELECT * FROM materials WHERE id = ?", [id]);
    res.json(mapMaterial(rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update material." });
  }
};

exports.deleteMaterial = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query("SELECT material_code FROM materials WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    const materialCode = rows[0].material_code;
    if (await hasBomReference(id, materialCode)) {
      return res.status(400).json({ message: "Cannot delete material while it is used by a BOM." });
    }

    const [result] = await db.query("DELETE FROM materials WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Material not found." });
    }

    res.json({ message: "Material deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete material." });
  }
};
