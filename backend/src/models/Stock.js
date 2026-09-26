import mongoose from 'mongoose';
const schema=new mongoose.Schema({product:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},warehouse:{type:mongoose.Schema.Types.ObjectId,ref:'Warehouse',required:true},quantity:{type:Number,default:0}},{timestamps:true});
schema.index({product:1,warehouse:1},{unique:true});
export default mongoose.model('Stock',schema);
