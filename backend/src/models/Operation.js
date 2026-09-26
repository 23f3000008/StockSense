import mongoose from 'mongoose';
const itemSchema=new mongoose.Schema({product:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},quantity:{type:Number,required:true,min:0.0001},warehouse:{type:mongoose.Schema.Types.ObjectId,ref:'Warehouse'},toWarehouse:{type:mongoose.Schema.Types.ObjectId,ref:'Warehouse'}},{_id:false});
const schema=new mongoose.Schema({type:{type:String,enum:['receipt','delivery','transfer','adjustment'],required:true},status:{type:String,enum:['Draft','Waiting','Ready','Done','Canceled'],default:'Draft'},reference:{type:String,required:true},supplier:{type:String},customer:{type:String},notes:{type:String},items:[itemSchema],createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},validatedAt:Date},{timestamps:true});
schema.index({type:1,status:1,createdAt:-1});
export default mongoose.model('Operation',schema);
