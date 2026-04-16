const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize DB
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error(err.message);
});

// Setup tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS plants (
        plant_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        scientific_name TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        price REAL DEFAULT 0.0,
        location TEXT NOT NULL,
        date_added TEXT NOT NULL,
        image TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS staff (
        staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        contact TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS visitors (
        visitor_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        contact TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sales (
        sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id INTEGER NOT NULL,
        plant_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        total_price REAL NOT NULL,
        sale_date TEXT NOT NULL
    )`);

//     db.run(`CREATE TABLE IF NOT EXISTS events (
//         event_id INTEGER PRIMARY KEY AUTOINCREMENT,
//         event_name TEXT NOT NULL,
//         date TEXT NOT NULL,
//         description TEXT NOT NULL
//     )`);
});

// Setup Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dest)){
            fs.mkdirSync(dest);
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const fname = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '');
        cb(null, fname);
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG and PNG are allowed'));
        }
    }
});

// Helpers
const validResources = ['plants', 'staff', 'visitors'];
const pkMap = { plants: 'plant_id', staff: 'staff_id', visitors: 'visitor_id' };

// GET
app.get('/api/:resource', (req, res) => {
    const resName = req.params.resource;
    if (!validResources.includes(resName)) return res.status(400).json({error: 'Invalid resource'});
    
    db.all(`SELECT * FROM ${resName} ORDER BY ${pkMap[resName]} DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// DELETE
app.delete('/api/:resource', (req, res) => {
    const resName = req.params.resource;
    if (!validResources.includes(resName)) return res.status(400).json({error: 'Invalid resource'});
    
    const id = req.body.id;
    if (!id) return res.status(400).json({error: 'Missing ID'});
    
    if (resName === 'plants') {
        db.get(`SELECT image FROM plants WHERE plant_id = ?`, [id], (err, row) => {
            if (row && row.image) {
                const imgPath = path.join(__dirname, 'uploads', row.image);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }
            db.run(`DELETE FROM plants WHERE plant_id = ?`, id, function(err) {
                if (err) return res.status(500).json({error: err.message});
                res.json({success: true});
            });
        });
    } else {
        db.run(`DELETE FROM ${resName} WHERE ${pkMap[resName]} = ?`, id, function(err) {
            if (err) return res.status(500).json({error: err.message});
            res.json({success: true});
        });
    }
});

// BUY Plant (Decrement stock & track sale)
app.post('/api/buy-plant', (req, res) => {
    const { plant_id, visitor_id, quantity } = req.body;
    if (!plant_id || !visitor_id || !quantity) return res.status(400).json({error: 'Missing data (plant_id, visitor_id, quantity)'});

    db.get(`SELECT quantity, price, name FROM plants WHERE plant_id = ?`, [plant_id], (err, row) => {
        if (err) return res.status(500).json({error: err.message});
        if (!row) return res.status(404).json({error: 'Plant not found'});
        if (row.quantity < quantity) return res.status(400).json({error: `Not enough stock available. Only ${row.quantity} left.`});

        const newQuantity = row.quantity - quantity;
        const totalPrice = row.price * quantity;
        const saleDate = new Date().toISOString().split('T')[0];

        db.run(`UPDATE plants SET quantity = ? WHERE plant_id = ?`, [newQuantity, plant_id], function(err) {
            if (err) return res.status(500).json({error: err.message});
            
            // Insert into sales
            db.run(`INSERT INTO sales (visitor_id, plant_id, quantity, total_price, sale_date) VALUES (?, ?, ?, ?, ?)`, 
                   [visitor_id, plant_id, quantity, totalPrice, saleDate], function(err) {
                if (err) return res.status(500).json({error: err.message});
                res.json({success: true, message: `Successfully purchased ${quantity} ${row.name}(s)`});
            });
        });
    });
});

// GET Dashboard Revenue
app.get('/api/dashboard/revenue', (req, res) => {
    db.get(`SELECT SUM(total_price) as total FROM sales`, [], (err, row) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({ totalRevenue: row.total || 0 });
    });
});

// POST (Create & Update)
app.post('/api/:resource', (req, res) => {
    const resName = req.params.resource;
    if (!validResources.includes(resName)) return res.status(400).json({error: 'Invalid resource'});

    const formHandler = (resName === 'plants') ? upload.single('image') : upload.none();

    formHandler(req, res, (err) => {
        if (err) return res.status(400).json({error: err.message});

        const data = req.body;
        const actionType = data.action_type || 'create';
        const id = data.id || null;
        
        delete data.action_type;
        delete data.id;

        if (resName === 'plants' && req.file) {
            data.image = req.file.filename;
        }

        if (actionType === 'create') {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(',');

            db.run(`INSERT INTO ${resName} (${keys.join(',')}) VALUES (${placeholders})`, values, function(err) {
                if (err) return res.status(500).json({error: err.message});
                res.json({success: true, message: 'Added successfully'});
            });
        } else if (actionType === 'update' && id) {
            if (resName === 'plants' && data.image) {
                db.get(`SELECT image FROM plants WHERE plant_id = ?`, [id], (err, row) => {
                    if (row && row.image) {
                        const imgPath = path.join(__dirname, 'uploads', row.image);
                        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                    }
                });
            }

            const keys = Object.keys(data);
            const values = Object.values(data);
            const setStr = keys.map(k => `${k}=?`).join(',');
            values.push(id);

            db.run(`UPDATE ${resName} SET ${setStr} WHERE ${pkMap[resName]} = ?`, values, function(err) {
                if (err) return res.status(500).json({error: err.message});
                res.json({success: true, message: 'Updated successfully'});
            });
        } else {
            res.status(400).json({error: 'Invalid action or missing ID'});
        }
    });
});

app.listen(PORT, () => console.log(`🚀 Node Server running on http://localhost:${PORT}`));
