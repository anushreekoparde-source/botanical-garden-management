# 🌿 Botanical Garden Management System

A full-stack web application designed to help administrators efficiently manage a botanical garden. This system tracks plant inventory, staff details, visitor logs, and seamlessly handles plant purchases to map direct revenue metrics.

## ✨ Features
- **📊 Real-time Dashboard**: Live overview of total plants, staff, visitors, and instant revenue updates from marketplace sales.
- **🍃 Plant Inventory**: Full Create, Read, Update, and Delete (CRUD) operations for plants, complete with image uploading functionalities.
- **👥 Staff Management**: Keep track of employee names, roles, and contact information.
- **🎟️ Visitor Logs**: Register returning or new visitors into the system.
- **🛍️ Plant Marketplace**: Built-in Point of Sale logic allowing selected visitors to buy available plants. Automatically calculates ticket totals, decrements plant stock realistically, and writes data to a secure Sales database table. 

## 🛠️ Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), custom CSS for styling.
- **Backend Environment**: Node.js
- **Server Framework**: Express.js 
- **Database**: SQLite3 (Server-less relational database management)
- **File Uploads**: Multer middleware for handling image binaries.

## 🚀 How to Run Locally

### 1. Install Dependencies
Make sure you have Node.js installed on your machine.
Clone this repository and inside the directory, run:
```bash
npm install
```

### 2. Start the Server
Start the Express server which hosts the API endpoints and the local application:
```bash
node server.js
```

### 3. Open the Application
On a successful start, a local server will initialize. Open your web browser and navigate to:
```
http://localhost:3000
```

*(Note: The database schemas (`database.sqlite`) generate automatically on the very first startup!)*
