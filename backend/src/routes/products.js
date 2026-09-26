import express from 'express'; import Product from '../models/Product.js'; import Stock from '../models/Stock.js'; import {auth} from '../middleware/auth.js';
const router=express.Router();router.use(auth);
router.get('/',async(req,res)=>{const products=await Product.find().sort({createdAt:-1});const stocks=await Stock.find().populate('warehouse','name code');const by={};stocks.forEach(s=>{const k=s.product.toString();(by[k]??=[]).push({warehouse:s.warehouse,quantity:s.quantity});});res.json(products.map(p=>({...p.toObject(),stock:by[p._id.toString()]||[]})));});
router.post('/',async(req,res)=>{try{const p=await Product.create(req.body);res.status(201).json(p);}catch(e){res.status(400).json({message:e.code===11000?'SKU already exists':e.message});}});
router.put('/:id',async(req,res)=>{try{res.json(await Product.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true}));}catch(e){res.status(400).json({message:e.message});}});
export default router;
