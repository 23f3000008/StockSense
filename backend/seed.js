import 'dotenv/config'; import bcrypt from 'bcryptjs'; import {connectDB} from './src/config/db.js'; import User from './src/models/User.js'; import Product from './src/models/Product.js'; import Warehouse from './src/models/Warehouse.js'; import Stock from './src/models/Stock.js';
await connectDB();
await User.deleteMany({});await Product.deleteMany({});await Warehouse.deleteMany({});await Stock.deleteMany({});
const user=await User.create({name:'Alex Morgan',email:'admin@stocksense.local',password:await bcrypt.hash('Admin@123',10),role:'manager'});
const [main,prod]=await Warehouse.create([{name:'Main Warehouse',code:'MAIN',location:'Central Store'},{name:'Production Floor',code:'PROD',location:'Factory Floor'}]);
const ps=await Product.create([{name:'Steel Rods',sku:'STL-001',category:'Raw Material',uom:'kg',reorderLevel:50},{name:'Office Chairs',sku:'CHR-101',category:'Furniture',uom:'pcs',reorderLevel:10},{name:'Safety Helmets',sku:'HLM-210',category:'Safety',uom:'pcs',reorderLevel:20}]);
await Stock.create([{product:ps[0]._id,warehouse:main._id,quantity:100},{product:ps[1]._id,warehouse:main._id,quantity:24},{product:ps[2]._id,warehouse:main._id,quantity:8},{product:ps[0]._id,warehouse:prod._id,quantity:15}]);
console.log('Seed complete. Login: admin@stocksense.local / Admin@123');process.exit();
